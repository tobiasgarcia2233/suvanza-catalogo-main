import 'server-only';
import { cents } from './money';
import { validateSalesTax, type SalesTaxPolicy } from './odooTaxPolicy';
import { needsPricingRepair, assessPricingRecovery, PRICING_REVIEW, type PricingRepair } from './odooPricingRepair';
import type { Client } from '@libsql/client';
import { db } from './db';
import { isOrderDeleted, requireActiveOrder, OrderActionError } from './orderDeletion';
import { EXPORT_MIGRATION_MESSAGE, needsHistoricalPricingReview } from './odooExportStatus';
import { odooCall, OdooError } from './odooClient';
import { commercialLines, normalizeDni } from './odooExportValues';
import { customers, customerPayload, quotationPayload, search, validateConfig, type Call, type ExportSnapshot, type RecordData } from './odooQuotation';
import type { Order } from '@/types';
import { CUSTOMER_REVIEW_MESSAGE, type CustomerReviewAction, type CustomerComparison, type BuyerData } from './customerReview';
import { compareCustomer, customerReference, readCustomerData, validateCorrection } from './odooCustomerReview';

function config(): ExportSnapshot['config'] {
  return { dniType:Number(process.env.ODOO_DNI_TYPE_ID),responsibility:Number(process.env.ODOO_CUSTOMER_RESPONSIBILITY_ID),country:Number(process.env.ODOO_COUNTRY_ID),currency:Number(process.env.ODOO_CURRENCY_ID),pricelist:Number(process.env.ODOO_PRICELIST_ID),priceBasis:'catalogue' };
}
export async function snapshotOrder(client: Pick<Client, "execute">, order: Order): Promise<ExportSnapshot> {
  const lines = order.items.map(item => ({variantId:String(item.id),name:item.name,quantity:item.quantity,total:item.finalPrice as number,pricing:item.pricing}));
  const mapped = await client.execute({ sql:`SELECT id, odoo_product_id FROM variants WHERE id IN (${lines.map(() => '?').join(',')})`, args:lines.map(l => l.variantId) });
  return {reference:`SUVANZA-CATALOGO:${order.id}`,total:order.total,buyer:order.buyer_details,config:config(),lines:lines.map(line => ({...line,productId: Number(mapped.rows.find(r => r.id === line.variantId)?.odoo_product_id) || null}))};
}
export type ExportProgress = {status:string;pricing_review?:import('./pricingRecovery').PricingReviewState;pricing_repaired?:boolean;migration_required?:boolean;partner_id?:number|null;quotation_id?:number|null;quotation_ref?:string|null;error?:string|null;phase?:string;customer_revision?:number;customer_review?:CustomerComparison;customer_buyer?:BuyerData;original_buyer?:BuyerData;created_customers?:{id:number;reference:string;revision:number}[];candidates?:{id:number;name:string;phone:string;active:boolean}[]};
export async function getExport(orderId: string, client = db): Promise<ExportProgress | null> {
  // Read pre-review rows too: customer_data is additive and nullable. Never migrate on GET.
  const result = await client.execute({sql:'SELECT * FROM odoo_exports WHERE order_id = ?',args:[orderId]});
  const row = result.rows[0];
  const customer = readCustomerData(row?.customer_data);
  const snapshot:ExportSnapshot|undefined=row ? JSON.parse(String(row.snapshot)):undefined;
  const original=snapshot?.buyer;
  let pricingReview:ExportProgress['pricing_review'];
  // Normalize legacy error messages on read without modifying orders/outbox rows.
  if (row && snapshot && needsHistoricalPricingReview({status:String(row.status),error:String(row.error ?? ''),phase:String(row.phase),quotation_id:Number(row.quotation_id)||null,pricing_repaired:!!row.pricing_data})) {
    const purchase=(await client.execute({sql:'SELECT created_at,total,items,promos_sold FROM orders WHERE id=?',args:[orderId]})).rows[0];
    pricingReview=assessPricingRecovery(snapshot,purchase);
  }
  return row ? {pricing_review:pricingReview,pricing_repaired:!!row.pricing_data,migration_required:!Object.hasOwn(row,'customer_data'), customer_revision:customer.revision, customer_review:customer.review, customer_buyer:customer.buyer ?? original, original_buyer:original, created_customers:customer.created, status:pricingReview?'pricing_review':String(row.status),partner_id:row.partner_id ? Number(row.partner_id) : null,quotation_id:row.quotation_id ? Number(row.quotation_id) : null,quotation_ref:row.quotation_ref ? String(row.quotation_ref) : null,error:pricingReview?.message ?? (row.error ? String(row.error) : null),phase:String(row.phase),candidates:row.candidates ? JSON.parse(String(row.candidates)) : []} : null;
}
/** Persistent lease + write-ahead phases, not search-then-create uniqueness. */
export async function exportPaidOrder(orderId: string, selectedPartner?: number, client: Client = db, call: Call = odooCall, action?: CustomerReviewAction, reconcileDeleted = false) {
  // Every remote creation passes this gate, including retries already running
  // when deletion commits. A request already submitted can still finish.
  const remoteCall = call;
  call = async <T>(model: string, method: string, args: RecordData = {}) => {
    if (reconcileDeleted && !['search_read','default_get'].includes(method)) throw new OrderActionError('Conciliación de pedido eliminado: solo se permiten consultas a Odoo.');
    if (['create','write','unlink'].includes(method)) {
      await requireActiveOrder(orderId,client);
    }
    return remoteCall<T>(model,method,args);
  };
  const token = crypto.randomUUID();
  const lease = () => Date.now() + 120000;
  let owned = false;
  let leaseLost = false;
  let state: RecordData = {};
  async function save(patch: RecordData) {
    const entries = Object.entries(patch);
    const res = await client.execute({sql:`UPDATE odoo_exports SET ${entries.map(([k])=>`${k} = ?`).join(',')}, locked_until = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND lock_token = ?`,args:[...entries.map(([,v])=>v),lease(),orderId,token]});
    if (res.rowsAffected !== 1) { leaseLost = true; throw new Error('Otro proceso tomó la exportación; recargá su estado.'); }
    Object.assign(state,patch);
  }
  try {
    if (!reconcileDeleted) await requireActiveOrder(orderId,client);
    else if (!await isOrderDeleted(orderId,client)) throw new OrderActionError('La conciliación de eliminados requiere un pedido eliminado.');
    const columns = await client.execute('PRAGMA table_info(odoo_exports)');
    if (!columns.rows.some(column => column.name === 'customer_data')) throw new Error(EXPORT_MIGRATION_MESSAGE);
    const result = await client.execute({sql:'SELECT * FROM orders WHERE id = ?',args:[orderId]});
    const row = result.rows[0];
    if (!row || !['COMPLETED','ODOO_ERROR','ODOO_SENT'].includes(String(row.status))) throw new Error('Solo se exportan pedidos pagados.');
    if (row.odoo_sent_at || row.status === 'ODOO_SENT') return {status:'legacy_sent',error:'Pedido ya registrado en Odoo; no se vuelve a exportar.'};
    const existing = await client.execute({sql:'SELECT order_id FROM odoo_exports WHERE order_id = ?',args:[orderId]});
    if (!existing.rows.length) {
      if (reconcileDeleted) throw new OrderActionError('No hay exportación para conciliar.');
      // Snapshot preserves the purchased lines even if configuration/mappings block preflight.
      const order = {id:orderId,total:Number(row.total),items:JSON.parse(String(row.items)),buyer_details:JSON.parse(String(row.buyer_details))} as Order;
      const snapshot = await snapshotOrder(client,order);
      await client.execute({sql:'INSERT OR IGNORE INTO odoo_exports (order_id,snapshot) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM order_deletions WHERE order_id = ?)',args:[orderId,JSON.stringify(snapshot),orderId]});
    }
    const claim = await client.execute({sql:"UPDATE odoo_exports SET lock_token = ?, locked_until = ? WHERE order_id = ? AND locked_until < ? AND status != 'exported' AND (? OR NOT EXISTS (SELECT 1 FROM order_deletions WHERE order_deletions.order_id = odoo_exports.order_id))",args:[token,lease(),orderId,Date.now(),reconcileDeleted ? 1 : 0]});
    if (!claim.rowsAffected) {
      const progress = await getExport(orderId,client);
      return action && progress?.quotation_id ? {...progress,error:'Ya existe un presupuesto. Sus datos requieren revisión separada en Odoo.'} : progress;
    }
    owned = true;
    state = (await client.execute({sql:'SELECT * FROM odoo_exports WHERE order_id = ?',args:[orderId]})).rows[0];
    // Exact history from before backfill, customer resolution or payload rebuilding.
    const taxHistory = {originalSnapshot:String(state.snapshot),originalPayload:state.payload == null ? null : String(state.payload),originalPricingData:state.pricing_data == null ? null : String(state.pricing_data)};
    const wasReview = state.status === 'review';
    const repair: PricingRepair | null = state.pricing_data ? JSON.parse(state.pricing_data) : null;
    const s: ExportSnapshot = repair ? structuredClone(repair.snapshot) : JSON.parse(state.snapshot);
    const customer = readCustomerData(state.customer_data);
    if (action) {
      await requireActiveOrder(orderId,client);
      if (!action.actor || action.revision !== customer.revision) throw new Error('La revisión del cliente cambió. Recargá antes de continuar.');
      if (state.quotation_id || state.phase === 'done') return { status:String(state.status), ...await getExport(orderId,client), error:'Ya existe un presupuesto. Sus datos requieren revisión separada en Odoo.' };
      if (state.phase.endsWith('creating')) return { status:String(state.status), ...await getExport(orderId,client), error:'Hay una creación en curso o incierta. Reconciliá antes de cambiar o aprobar datos.' };
      if (action.kind === 'defer') {
        if (state.status !== 'customer_review') throw new Error('No hay una revisión de cliente pendiente.');
        customer.audit.push({kind:'deferred',actor:action.actor,at:new Date().toISOString(),revision:customer.revision});
        await save({customer_data:JSON.stringify(customer)});
        return await getExport(orderId,client);
      }
      if (action.kind === 'update_partner') {
        if (state.status !== 'customer_review' || !customer.review || state.partner_id !== action.partnerId) throw new Error('El cliente a actualizar cambió. Volvé a revisar sus datos.');
        const buyer = customer.buyer ?? s.buyer;
        const comparison = await compareCustomer(call,{...s,buyer},action.partnerId,customer.revision);
        if (comparison.token !== action.token) {
          // Odoo or the order changed since the comparison was shown: never write
          // values the operator didn't see. Show the fresh comparison instead.
          customer.review = comparison;
          await save({customer_data:JSON.stringify(customer),error:`${CUSTOMER_REVIEW_MESSAGE} Los datos de Odoo cambiaron; revisá la comparación actualizada.`});
          return await getExport(orderId,client);
        }
        // Only an active contact whose document already matches may be edited.
        if (!comparison.canApprove) throw new Error('El documento no coincide o el cliente está archivado; no se modifica el contacto en Odoo.');
        const fields = action.fields.filter(f => comparison.differences[f]);
        if (!fields.length) throw new Error('No hay diferencias de nombre o teléfono para actualizar.');
        const keptOdoo = (['name','phone'] as const).filter(f => comparison.differences[f] && !fields.includes(f));
        if (keptOdoo.length && !action.approveRest) throw new Error('Elegí qué dato conservar en cada diferencia.');
        const vals: Partial<Record<'name' | 'phone', string>> = {};
        for (const f of fields) {
          if (!buyer[f]?.trim()) throw new Error('El pedido no tiene ese dato completo. Corregí los datos del comprador primero.');
          vals[f] = buyer[f].trim();
        }
        // Idempotent: a lost response is safe to repeat, and the next comparison shows the outcome.
        await call('res.partner','write',{ids:[action.partnerId],vals});
        customer.audit.push({kind:'partner_update',actor:action.actor,at:new Date().toISOString(),revision:customer.revision,partnerId:action.partnerId,
          partnerBefore:Object.fromEntries(fields.map(f => [f,comparison.remote[f]])),partnerAfter:vals});
        delete customer.review;
        if (keptOdoo.length) {
          // The remaining differences are exactly the ones the operator chose to
          // keep from Odoo: approve the contact as it is after the write.
          const after = await compareCustomer(call,{...s,buyer},action.partnerId,customer.revision);
          const pending = (['name','phone','document'] as const).filter(f => after.differences[f]);
          if (after.canApprove && pending.every(f => (keptOdoo as string[]).includes(f))) {
            customer.approval = after;
            customer.audit.push({kind:'approval',actor:action.actor,at:new Date().toISOString(),revision:customer.revision,comparison:after});
          }
        }
        await save({customer_data:JSON.stringify(customer)});
        // Continue below: the export compares again and sends if nothing else differs.
      }
      if (action.kind === 'approve' && (state.partner_id !== action.partnerId || (!customer.review && customer.approval?.token !== action.token))) throw new Error('El cliente seleccionado cambió. Volvé a revisar sus datos.');
      if (action.kind === 'correct') {
        const buyer = validateCorrection(action.buyer);
        // Read-only preflight must succeed. A missing local ID is not proof that
        // an external quotation does not exist (legacy/interrupted exports).
        const quotes = await search(call,'sale.order',[['company_id','=',1],'|',['origin','=',s.reference],['client_order_ref','=',s.reference]],['name']);
        if (quotes.length) {
          await save({status:'review',quotation_id:quotes.length === 1 ? quotes[0].id : null,quotation_ref:quotes.length === 1 ? quotes[0].name : null,error:'Ya existe un presupuesto. La corrección requiere revisión separada en Odoo.'});
          return await getExport(orderId,client);
        }
        if (state.partner_id && !action.preserveResolvedContact) throw new Error('Confirmá que el contacto ya resuelto se conservará sin modificar ni eliminar.');
        const previousCustomer = state.partner_id ? await compareCustomer(call,{...s,buyer:customer.buyer ?? s.buyer},Number(state.partner_id),customer.revision) : undefined;
        if (previousCustomer?.remote.reference === customerReference(s,customer.revision) && !customer.created.some(c=>c.id === previousCustomer.remote.id)) {
          customer.created.push({id:previousCustomer.remote.id,reference:previousCustomer.remote.reference,revision:customer.revision});
        }
        customer.audit.push({kind:'correction',actor:action.actor,at:new Date().toISOString(),revision:customer.revision + 1,before:customer.buyer ?? s.buyer,after:buyer,releasedPartnerId:state.partner_id ?? null,releasedCustomerReference:previousCustomer?.remote.reference || customerReference(s,customer.revision)});
        customer.revision += 1;
        customer.buyer = buyer;
        delete customer.approval;
        delete customer.preparedFor;
        delete customer.review;
        const patch = {customer_data:JSON.stringify(customer),partner_id:null,payload:null,candidates:null,status:'pending',error:null};
        // Revision, local display, resolution reset and claim release commit
        // together under the same fenced lease. Never edit the original snapshot.
        const transaction = await client.transaction('write');
        try {
          await requireActiveOrder(orderId,transaction);
          const updated = await transaction.execute({sql:'UPDATE odoo_exports SET customer_data = ?, partner_id = NULL, payload = NULL, candidates = NULL, status = ?, error = NULL, locked_until = ? WHERE order_id = ? AND lock_token = ?',args:[patch.customer_data,'pending',lease(),orderId,token]});
          if (updated.rowsAffected !== 1) { leaseLost = true; throw new Error('La exportación cambió. Recargá.'); }
          await transaction.execute({sql:'UPDATE orders SET buyer_details = ? WHERE id = ?',args:[JSON.stringify(buyer),orderId]});
          // No unresolved create can reach this point. Known created contacts and
          // their old markers remain in the audit; they are never deleted remotely.
          await transaction.execute({sql:'DELETE FROM odoo_customer_claims WHERE order_id = ?',args:[orderId]});
          await transaction.commit();
          Object.assign(state,patch);
        } finally { transaction.close(); }
      }
    }
    // Fill only missing configuration/links before any external create. Never replace saved values.
    if (!reconcileDeleted && state.phase === 'ready' && !state.partner_id && !state.payload && action?.kind !== 'correct') {
      const current = config();
      for (const key of Object.keys(current) as (keyof typeof current)[]) if (!s.config[key]) Object.assign(s.config,{[key]:current[key]});
      for (const line of s.lines.filter(l=>!l.productId)) {
        const r = await client.execute({sql:'SELECT odoo_product_id FROM variants WHERE id = ?',args:[line.variantId]});
        line.productId = Number(r.rows[0]?.odoo_product_id) || null;
      }
      if (repair) { repair.snapshot = s; await save({pricing_data:JSON.stringify(repair)}); }
      else await save({snapshot:JSON.stringify(s)});
    }
    s.buyer = customer.buyer ?? s.buyer;
    await save({status:'processing',error:null,candidates:null});
    const refDomain = [['company_id','=',1],'|',['origin','=',s.reference],['client_order_ref','=',s.reference]];
    const found = await search(call,'sale.order',refDomain,['name','state','partner_id','currency_id','amount_total','order_line','origin','client_order_ref']);
    if (found.length > 1) { await save({status:'review',error:'Hay varios presupuestos con esta referencia. Revisión manual requerida.'}); return await getExport(orderId,client); }
    let quotation = found[0];
    if (!quotation && (state.phase === 'quotation_creating' || state.quotation_id || (wasReview && state.phase !== 'customer_creating'))) {
      await save({status:'review',error:'Resultado de creación incierto; todavía no se localiza el presupuesto. Reintentar solo consulta; nunca vuelve a crearlo.'});
      return await getExport(orderId,client);
    }
    if (!quotation && reconcileDeleted && state.phase !== 'customer_creating') {
      await save({status:'review',error:'Pedido eliminado: no se encontró un presupuesto existente. No se crearán nuevos registros en Odoo.'});
      return await getExport(orderId,client);
    }
    let validatedTax: SalesTaxPolicy | undefined;
    if (!quotation) {
      const historicalPromos = row.promos_sold ? JSON.parse(String(row.promos_sold)) : null;
      if (needsPricingRepair({promos_sold:historicalPromos,autoApplyPromos:!!row.auto_apply_promos},s)) {
        await save({status:'pricing_review',error:PRICING_REVIEW});
        return await getExport(orderId,client);
      }
      commercialLines({total:s.total,items:s.lines.map(l=>({id:l.variantId,name:l.name,brand:"",quantity:l.quantity,finalPrice:l.total,discountPercentage:0}))});
      await validateConfig(call,s);
      // Reject invalid tax configuration before resolving/creating any customer.
      validatedTax = await validateSalesTax(call,s.taxPolicy);
    }
    if (!quotation && !state.partner_id) {
      const matches = await customers(call,s); // Failure must propagate, never converted to [].
      if (selectedPartner !== undefined && !matches.some(p=>p.id === selectedPartner && p.active)) throw new Error('El cliente seleccionado no coincide con el DNI/tipo o está archivado.');
      let partner = selectedPartner ? matches.find(p=>p.id === selectedPartner) : matches.length === 1 && matches[0].active ? matches[0] : undefined;
      if (state.phase === 'customer_creating') {
        // A lost response may only be reconciled by our creation marker.
        const created = await search(call,'res.partner',[['ref','=',customerReference(s,customer.revision)],['active','in',[true,false]],'|',['company_id','=',1],['company_id','=',false]],['vat','l10n_latam_identification_type_id']);
        if (created.length === 1 && normalizeDni(created[0].vat) === normalizeDni(s.buyer.dni) && created[0].l10n_latam_identification_type_id?.[0] === s.config.dniType) { partner = created[0];
          if (!customer.created.some(c=>c.id === partner!.id)) customer.created.push({id:partner.id,reference:customerReference(s,customer.revision),revision:customer.revision});
        }
        else { await save({status:'review',error:'Creación de cliente con resultado incierto. No se repetirá. Revisar Odoo y la referencia local.'}); return await getExport(orderId,client); }
      } else if (matches.length && !partner) {
        await save({status:'customer_selection',candidates:JSON.stringify(matches.map(p=>({id:p.id,name:p.name,phone:p.phone,active:p.active}))),error:'Seleccioná un cliente activo autorizado; hay coincidencias ambiguas o archivadas.'});
        return await getExport(orderId,client);
      }
      if (!partner) {
        const key = `${s.config.dniType}:${normalizeDni(s.buyer.dni)}`;
        // Fence claim creation too: an expired worker must not reintroduce an
        // old-document claim after another worker committed a correction.
        await client.execute({sql:'INSERT OR IGNORE INTO odoo_customer_claims (document_key,order_id) SELECT ?,? FROM odoo_exports WHERE order_id = ? AND lock_token = ?',args:[key,orderId,orderId,token]});
        const owner = (await client.execute({sql:'SELECT order_id FROM odoo_customer_claims WHERE document_key = ?',args:[key]})).rows[0];
        if (!owner) { leaseLost = true; return await getExport(orderId,client); }
        if (owner.order_id !== orderId) throw new Error('Otro pedido está resolviendo este DNI. Reintentá después; si quedó incierto requiere revisión.');
        // Recheck after taking the cross-order customer creation claim.
        const again = await customers(call,s);
        if (again.length) throw new Error('Apareció un cliente durante la resolución. Reintentá para seleccionarlo.');
        const newCustomer = customerPayload({...s,reference:customerReference(s,customer.revision)});
        await save({phase:'customer_creating'});
        try {
          const ids = await call<number[]>('res.partner','create',{vals_list:[newCustomer]});
          if (!Array.isArray(ids) || (!Number.isSafeInteger(ids[0]) || ids[0] <= 0) || ids.length !== 1) throw new Error('Respuesta de creación de cliente inválida.');
          partner = {id:ids[0]};
          customer.created.push({id:ids[0],reference:customerReference(s,customer.revision),revision:customer.revision});
        } catch (e) {
          if (e instanceof OdooError && e.status === 422) await save({phase:'ready'});
          throw e;
        }
      }
      await save({partner_id:partner.id,phase:'ready',customer_data:JSON.stringify(customer)});
    }
    if (!quotation && await isOrderDeleted(orderId,client)) {
      await save({status:'review',error:'Pedido eliminado: se conserva el cliente resuelto; no se creará un presupuesto.'});
      return await getExport(orderId,client);
    }
    if (!quotation) {
      // Reconciliation above established safe creation. Customer creation, if it
      // was uncertain, has also been resolved. This is independent of the old
      // missing-config backfill: resolved customers/prepared payloads qualify too.
      if (!s.taxPolicy) {
        if (!validatedTax) throw new Error('No se pudo validar el IVA 0% del presupuesto.');
        s.taxPolicy = validatedTax;
        s.taxPolicyAdoption = {version:1,at:new Date().toISOString(),actor:'system:odoo_export',source:'configured_zero_sales_tax',...taxHistory};
        const taxSnapshot = repair ? {pricing_data:JSON.stringify({...repair,snapshot:s})} : {snapshot:JSON.stringify(s)};
        await save({...taxSnapshot,payload:null});
      }
      const comparison = await compareCustomer(call,s,Number(state.partner_id),customer.revision);
      const mismatch = Object.values(comparison.differences).some(Boolean) || !comparison.canApprove;
      const staleApproval = action?.kind === 'approve' && (action.token !== comparison.token || action.partnerId !== comparison.remote.id);
      if (staleApproval || !comparison.canApprove || (mismatch && customer.approval?.token !== comparison.token && action?.kind !== 'approve')) {
        customer.review = comparison;
        await save({status:'customer_review',customer_data:JSON.stringify(customer),error:staleApproval ? `${CUSTOMER_REVIEW_MESSAGE} Los datos de Odoo cambiaron; revisá la comparación actualizada.` : CUSTOMER_REVIEW_MESSAGE});
        return await getExport(orderId,client);
      }
      if (action?.kind === 'approve' && customer.approval?.token !== comparison.token) {
        customer.approval = comparison;
        customer.audit.push({kind:'approval',actor:action.actor,at:new Date().toISOString(),revision:customer.revision,comparison});
        delete customer.review;
        await save({customer_data:JSON.stringify(customer)});
      } else if (customer.review) {
        delete customer.review;
        await save({customer_data:JSON.stringify(customer)});
      }
      // Rebuild from the purchased snapshot on every safe pre-create retry.
      // Cached payloads from the former tax conversion must never be submitted.
      // Existing/uncertain quotations took the reconciliation branch above.
      const payload = await quotationPayload(call,s,Number(state.partner_id));
      // Preparation performs more reads. Check again immediately before the
      // write-ahead phase; a changed contact must never consume an old approval.
      const latest = await compareCustomer(call,s,Number(state.partner_id),customer.revision);
      if (latest.token !== comparison.token) {
        customer.review = latest;
        await save({status:'customer_review',payload:null,customer_data:JSON.stringify(customer),error:`${CUSTOMER_REVIEW_MESSAGE} Los datos de Odoo cambiaron durante la preparación.`});
        return await getExport(orderId,client);
      }
      customer.preparedFor = comparison.token;
      await save({payload:JSON.stringify(payload),phase:'quotation_creating',customer_data:JSON.stringify(customer)});
      try {
        const ids = await call<number[]>('sale.order','create',{vals_list:[payload]});
        if (!Array.isArray(ids) || ids.length !== 1 || (!Number.isSafeInteger(ids[0]) || ids[0] <= 0)) throw new Error('Respuesta de presupuesto inválida.');
        await save({quotation_id:ids[0]});
      } catch(e) {
        if (e instanceof OdooError && e.status === 422) await save({phase:'ready'});
        throw e;
      }
      quotation = (await search(call,'sale.order',[['id','=',state.quotation_id],['company_id','=',1]],['name','state','partner_id','currency_id','amount_total','order_line','origin','client_order_ref']))[0];
    }
    if (!quotation) throw new Error('Presupuesto creado; no se pudo verificar. Reintentá la consulta.');
    await save({quotation_id:quotation.id,quotation_ref:quotation.name});
    const payload = state.payload ? JSON.parse(state.payload) : null;
    const actualLines = await search(call,'sale.order.line',[['order_id','=',quotation.id]],['product_id','product_uom_qty','price_unit','discount','tax_ids']);
    const expectedLines = payload?.order_line?.map((command: [number,number,RecordData])=>command[2]);
    const canonical = (lines: RecordData[], actual: boolean) => lines.map(l=>JSON.stringify([actual?l.product_id?.[0]:l.product_id,l.product_uom_qty,l.price_unit,l.discount,[...(actual?l.tax_ids:l.tax_ids[0][2])].sort((a,b)=>a-b)])).sort().join('|');
    if (!payload || quotation.state !== 'draft' || quotation.partner_id?.[0] !== state.partner_id || quotation.currency_id?.[0] !== s.config.currency || quotation.origin !== s.reference || quotation.client_order_ref !== s.reference || !Number.isFinite(quotation.amount_total) || cents(quotation.amount_total)!==cents(s.total) || canonical(actualLines,true)!==canonical(expectedLines,false)) {
      await save({status:'review',error:'Presupuesto localizado pero estado, cliente, líneas, moneda o total no coinciden. Revisá en Odoo; no se creará otro.'});
    } else await save({status:'exported',phase:'done',error:null});
    return await getExport(orderId,client);
  } catch(error) {
    if (error instanceof OrderActionError && !owned) throw error;
    if (leaseLost) return await getExport(orderId,client);
    const message = error instanceof Error ? error.message : 'No se pudo exportar a Odoo.';
    if (owned) { await save({status:state.quotation_id || state.phase?.endsWith('creating')?'review':readCustomerData(state.customer_data).review?'customer_review':'error',error:message}); return await getExport(orderId,client); }
    return {status:'error',error:message};
  } finally {
    if (owned) await client.execute({sql:'UPDATE odoo_exports SET lock_token = NULL, locked_until = 0 WHERE order_id = ? AND lock_token = ?',args:[orderId,token]});
  }
}
