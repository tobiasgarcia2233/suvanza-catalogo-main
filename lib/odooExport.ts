import 'server-only';
import type { Client } from '@libsql/client';
import { db } from './db';
import { odooCall, OdooError } from './odooClient';
import { commercialLines, normalizeDni } from './odooExportValues';
import { customers, customerPayload, quotationPayload, search, validateConfig, type Call, type ExportSnapshot, type RecordData } from './odooQuotation';
import type { Order } from '@/types';

function config(): ExportSnapshot['config'] {
  return { dniType:Number(process.env.ODOO_DNI_TYPE_ID),responsibility:Number(process.env.ODOO_CUSTOMER_RESPONSIBILITY_ID),country:Number(process.env.ODOO_COUNTRY_ID),currency:Number(process.env.ODOO_CURRENCY_ID),pricelist:Number(process.env.ODOO_PRICELIST_ID),priceBasis:process.env.ODOO_LOCAL_PRICE_BASIS ?? '' };
}
export async function snapshotOrder(client: Pick<Client, "execute">, order: Order): Promise<ExportSnapshot> {
  const lines = order.items.map(item => ({variantId:String(item.id),name:item.name,quantity:item.quantity,total:item.finalPrice as number}));
  const mapped = await client.execute({ sql:`SELECT id, odoo_product_id FROM variants WHERE id IN (${lines.map(() => '?').join(',')})`, args:lines.map(l => l.variantId) });
  return {reference:`SUVANZA-CATALOGO:${order.id}`,total:order.total,buyer:order.buyer_details,config:config(),lines:lines.map(line => ({...line,productId: Number(mapped.rows.find(r => r.id === line.variantId)?.odoo_product_id) || null}))};
}
export type ExportProgress = {status:string;partner_id?:number|null;quotation_id?:number|null;quotation_ref?:string|null;error?:string|null;phase?:string;candidates?:{id:number;name:string;phone:string;active:boolean}[]};
export async function getExport(orderId: string, client = db): Promise<ExportProgress | null> {
  const result = await client.execute({sql:'SELECT status, partner_id, quotation_id, quotation_ref, candidates, error, phase FROM odoo_exports WHERE order_id = ?',args:[orderId]});
  const row = result.rows[0];
  return row ? {status:String(row.status),partner_id:row.partner_id ? Number(row.partner_id) : null,quotation_id:row.quotation_id ? Number(row.quotation_id) : null,quotation_ref:row.quotation_ref ? String(row.quotation_ref) : null,error:row.error ? String(row.error) : null,phase:String(row.phase),candidates:row.candidates ? JSON.parse(String(row.candidates)) : []} : null;
}
/** Persistent lease + write-ahead phases, not search-then-create uniqueness. */
export async function exportPaidOrder(orderId: string, selectedPartner?: number, client: Client = db, call: Call = odooCall) {
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
    const result = await client.execute({sql:'SELECT * FROM orders WHERE id = ?',args:[orderId]});
    const row = result.rows[0];
    if (!row || !['COMPLETED','ODOO_ERROR','ODOO_SENT'].includes(String(row.status))) throw new Error('Solo se exportan pedidos pagados.');
    if (row.odoo_sent_at || row.status === 'ODOO_SENT') return {status:'legacy_sent',error:'Pedido ya registrado en Odoo; no se vuelve a exportar.'};
    const existing = await client.execute({sql:'SELECT order_id FROM odoo_exports WHERE order_id = ?',args:[orderId]});
    if (!existing.rows.length) {
      // Snapshot preserves the purchased lines even if configuration/mappings block preflight.
      const order = {id:orderId,total:Number(row.total),items:JSON.parse(String(row.items)),buyer_details:JSON.parse(String(row.buyer_details))} as Order;
      const snapshot = await snapshotOrder(client,order);
      await client.execute({sql:'INSERT OR IGNORE INTO odoo_exports (order_id,snapshot) VALUES (?,?)',args:[orderId,JSON.stringify(snapshot)]});
    }
    const claim = await client.execute({sql:"UPDATE odoo_exports SET lock_token = ?, locked_until = ? WHERE order_id = ? AND locked_until < ? AND status != 'exported'",args:[token,lease(),orderId,Date.now()]});
    if (!claim.rowsAffected) return await getExport(orderId,client);
    owned = true;
    state = (await client.execute({sql:'SELECT * FROM odoo_exports WHERE order_id = ?',args:[orderId]})).rows[0];
    const s: ExportSnapshot = JSON.parse(state.snapshot);
    // Fill only missing configuration/links before any external create. Never replace saved values.
    if (state.phase === 'ready' && !state.partner_id && !state.payload) {
      const current = config();
      for (const key of Object.keys(current) as (keyof typeof current)[]) if (!s.config[key]) Object.assign(s.config,{[key]:current[key]});
      for (const line of s.lines.filter(l=>!l.productId)) {
        const r = await client.execute({sql:'SELECT odoo_product_id FROM variants WHERE id = ?',args:[line.variantId]});
        line.productId = Number(r.rows[0]?.odoo_product_id) || null;
      }
      await save({snapshot:JSON.stringify(s)});
    }
    commercialLines({total:s.total,items:s.lines.map(l=>({id:l.variantId,name:l.name,brand:"",quantity:l.quantity,finalPrice:l.total,discountPercentage:0}))});
    await validateConfig(call,s);
    await save({status:'processing',error:null,candidates:null});
    if (!state.partner_id) {
      const matches = await customers(call,s); // Failure must propagate, never converted to [].
      if (selectedPartner !== undefined && !matches.some(p=>p.id === selectedPartner && p.active)) throw new Error('El cliente seleccionado no coincide con el DNI/tipo o está archivado.');
      let partner = selectedPartner ? matches.find(p=>p.id === selectedPartner) : matches.length === 1 && matches[0].active ? matches[0] : undefined;
      if (state.phase === 'customer_creating') {
        // A lost response may only be reconciled by our creation marker.
        const created = await search(call,'res.partner',[['ref','=',s.reference],['active','in',[true,false]],'|',['company_id','=',1],['company_id','=',false]],['vat','l10n_latam_identification_type_id']);
        if (created.length === 1 && normalizeDni(created[0].vat) === normalizeDni(s.buyer.dni) && created[0].l10n_latam_identification_type_id?.[0] === s.config.dniType) partner = created[0];
        else { await save({status:'review',error:'Creación de cliente con resultado incierto. No se repetirá. Revisar Odoo y la referencia local.'}); return await getExport(orderId,client); }
      } else if (matches.length && !partner) {
        await save({status:'customer_selection',candidates:JSON.stringify(matches.map(p=>({id:p.id,name:p.name,phone:p.phone,active:p.active}))),error:'Seleccioná un cliente activo autorizado; hay coincidencias ambiguas o archivadas.'});
        return await getExport(orderId,client);
      }
      if (!partner) {
        const key = `${s.config.dniType}:${normalizeDni(s.buyer.dni)}`;
        await client.execute({sql:'INSERT OR IGNORE INTO odoo_customer_claims (document_key,order_id) VALUES (?,?)',args:[key,orderId]});
        const owner = (await client.execute({sql:'SELECT order_id FROM odoo_customer_claims WHERE document_key = ?',args:[key]})).rows[0];
        if (owner.order_id !== orderId) throw new Error('Otro pedido está resolviendo este DNI. Reintentá después; si quedó incierto requiere revisión.');
        // Recheck after taking the cross-order customer creation claim.
        const again = await customers(call,s);
        if (again.length) throw new Error('Apareció un cliente durante la resolución. Reintentá para seleccionarlo.');
        await save({phase:'customer_creating'});
        try {
          const ids = await call<number[]>('res.partner','create',{vals_list:[customerPayload(s)]});
          if (!Array.isArray(ids) || (!Number.isSafeInteger(ids[0]) || ids[0] <= 0) || ids.length !== 1) throw new Error('Respuesta de creación de cliente inválida.');
          partner = {id:ids[0]};
        } catch (e) {
          if (e instanceof OdooError && e.status === 422) await save({phase:'ready'});
          throw e;
        }
      }
      await save({partner_id:partner.id,phase:'ready'});
    }
    const refDomain = [['company_id','=',1],'|',['origin','=',s.reference],['client_order_ref','=',s.reference]];
    const found = await search(call,'sale.order',refDomain,['name','state','partner_id','currency_id','amount_total','order_line','origin','client_order_ref']);
    if (found.length > 1) { await save({status:'review',error:'Hay varios presupuestos con esta referencia. Revisión manual requerida.'}); return await getExport(orderId,client); }
    let quotation = found[0];
    if (!quotation && (state.phase === 'quotation_creating' || state.quotation_id)) {
      await save({status:'review',error:'Resultado de creación incierto; todavía no se localiza el presupuesto. Reintentar solo consulta; nunca vuelve a crearlo.'});
      return await getExport(orderId,client);
    }
    if (!quotation) {
      const payload = state.payload ? JSON.parse(state.payload) : await quotationPayload(call,s,Number(state.partner_id));
      await save({payload:JSON.stringify(payload),phase:'quotation_creating'});
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
    if (!payload || quotation.state !== 'draft' || quotation.partner_id?.[0] !== state.partner_id || quotation.currency_id?.[0] !== s.config.currency || quotation.origin !== s.reference || quotation.client_order_ref !== s.reference || !Number.isFinite(quotation.amount_total) || Math.abs(quotation.amount_total-s.total)>0.005 || canonical(actualLines,true)!==canonical(expectedLines,false)) {
      await save({status:'review',error:'Presupuesto localizado pero estado, cliente, líneas, moneda o total no coinciden. Revisá en Odoo; no se creará otro.'});
    } else await save({status:'exported',phase:'done',error:null});
    return await getExport(orderId,client);
  } catch(error) {
    if (leaseLost) return await getExport(orderId,client);
    const message = error instanceof Error ? error.message : 'No se pudo exportar a Odoo.';
    if (owned) { await save({status:state.phase?.endsWith('creating')?'review':'error',error:message}); return await getExport(orderId,client); }
    return {status:'error',error:message};
  } finally {
    if (owned) await client.execute({sql:'UPDATE odoo_exports SET lock_token = NULL, locked_until = 0 WHERE order_id = ? AND lock_token = ?',args:[orderId,token]});
  }
}
