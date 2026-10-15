import 'server-only';
import { createHash } from 'node:crypto';
import type { Client } from '@libsql/client';
import type { Order } from '@/types';
import { db } from './db';
import { odooCall } from './odooClient';
import { search, type Call, type ExportSnapshot } from './odooQuotation';
import { requireActiveOrder } from './orderDeletion';
import { validatePurchasedItems, validateAllocationManifest } from './checkoutPricing';
import { cents } from './money';
import { confirmedCatalogueDateEligible, CONFIRMED_CATALOGUE_SINCE } from './pricingRecovery';
import { reconstructConfirmedCatalogue, loadRecoveryCatalogue } from './confirmedCatalogueRecovery';
import type { PricingRepairRequest, PricingRepairResult, PricingReviewState } from './pricingRecovery';

export type PricingRepair = {
  version:1; snapshot:ExportSnapshot; originalSnapshot:string; originalPayload:string|null;
  actor:string; mode?:'automatic_retry'; source:string; at:string; token:string;catalogueConfirmation?:{since:string;catalogueHash:string};
};
export const PRICING_REVIEW = 'La asignación promocional histórica requiere reparación revisada.';
export function needsPricingRepair(order: Pick<Order,'promos_sold'|'autoApplyPromos'>, s:ExportSnapshot) {
  return (!!order.promos_sold?.length || !!order.autoApplyPromos) && !s.lines.every(l=>l.pricing?.version === 2);
}
function quantities(lines:{id:string;quantity:number}[]) {
  const totals = new Map<string,number>();
  for (const l of lines) totals.set(l.id,(totals.get(l.id) ?? 0)+l.quantity);
  return JSON.stringify([...totals].sort(([a],[b])=>a.localeCompare(b)));
}
// Validate evidence without any lookup of current product/promotion prices.
export function repairedSnapshot(original:ExportSnapshot, order:Order, items:Order['items']):ExportSnapshot {
  if (cents(order.total) !== cents(original.total) || quantities(items) !== quantities(order.items) || quantities(items) !== quantities(original.lines.map(l=>({id:l.variantId,quantity:l.quantity})))) throw new Error('La reparación debe conservar importe pagado y cantidades originales.');
  validatePurchasedItems(items,original.total);
  validateAllocationManifest(items,order.promos_sold ?? []);
  return {...original,lines:items.map(i=>{
    const links = [...new Set(original.lines.filter(l=>l.variantId===i.id).map(l=>l.productId))];
    if (links.length !== 1) throw new Error('Vínculos Odoo históricos ambiguos; requiere revisión.');
    return {variantId:i.id,name:i.name,quantity:i.quantity,total:i.finalPrice!,productId:links[0],pricing:i.pricing};
  })};
}
/** Read local historical data only. Missing component prices are a review state,
 * not a transient Odoo failure and not a reason to keep retrying. */
export function assessPricingRecovery(original:ExportSnapshot, purchase: Record<string,unknown> | undefined):PricingReviewState {
  const base:Pick<PricingReviewState,'savedLines'|'promotions'|'paidTotal'|'confirmedCatalogueEligible'>={savedLines:original.lines,promotions:[],paidTotal:purchase ? Number(purchase.total):original.total};
  if (!purchase) return {...base,kind:'missing_history',message:'No se encuentra el detalle original de la compra. Hace falta revisar el comprobante o respaldo de esa venta.'};
  try {
    const items:Order['items']=JSON.parse(String(purchase.items));
    const promos:Order['promos_sold']=purchase.promos_sold ? JSON.parse(String(purchase.promos_sold)):null;
    base.promotions=promos ?? [];
    base.confirmedCatalogueEligible=confirmedCatalogueDateEligible(purchase.created_at)&&!!promos?.length;
    if (!items.length || !items.every(i=>i.pricing?.version===2)) return {...base,kind:'missing_history',message:base.confirmedCatalogueEligible?'El pedido no guardó el desglose de la promoción. Al reintentar se recuperarán los precios confirmados sin cambios desde el 15/10/2026 y se verificará el total pagado.':'El pedido conserva el total y las cantidades, pero faltan los precios originales por producto de la promoción. No se puede reconstruir automáticamente.'};
    repairedSnapshot(original,{total:Number(purchase.total),items,promos_sold:promos} as Order,items);
    return {...base,kind:'available',message:'Se encontró un desglose histórico completo. Se recuperará al reintentar la exportación.'};
  } catch {
    return {...base,kind:'invalid_history',message:'El desglose guardado no coincide con la compra original. Hace falta revisar el comprobante o respaldo de esa venta antes de exportar.'};
  }
}
export type RepairRequest = PricingRepairRequest;
/** Preview/apply never writes to Odoo. Apply uses the same fenced lease as retry. */
export async function repairPricing(orderId:string, actor:string, request:RepairRequest, client:Client=db, call:Call=odooCall, automaticRetry=false):Promise<PricingRepairResult> {
  await requireActiveOrder(orderId,client);
  const columns = await client.execute('PRAGMA table_info(odoo_exports)');
  if (!columns.rows.some(c=>c.name==='pricing_data')) throw new Error('Aplicá primero la migración aditiva db:migrate:odoo-exports (pricing_data).');
  const lease = crypto.randomUUID();
  const claim = await client.execute({sql:"UPDATE odoo_exports SET lock_token=?,locked_until=? WHERE order_id=? AND locked_until < ? AND status != 'exported'",args:[lease,Date.now()+120000,orderId,Date.now()]});
  if (claim.rowsAffected !== 1) throw new Error('Exportación enviada o en curso: no se permite reparar.');
  try {
    const row = (await client.execute({sql:'SELECT * FROM odoo_exports WHERE order_id=?',args:[orderId]})).rows[0];
    const purchase = (await client.execute({sql:'SELECT * FROM orders WHERE id=?',args:[orderId]})).rows[0];
    if (!purchase || !['COMPLETED','ODOO_ERROR'].includes(String(purchase.status)) || purchase.odoo_sent_at || row.pricing_data) throw new Error('Pedido no elegible o ya reparado.');
    const original:ExportSnapshot = JSON.parse(String(row.snapshot));
    const order = {...purchase,created_at:String(purchase.created_at),total:Number(purchase.total),items:JSON.parse(String(purchase.items)),autoApplyPromos:!!purchase.auto_apply_promos,promos_sold:purchase.promos_sold ? JSON.parse(String(purchase.promos_sold)):null} as unknown as Order;
    if (row.quotation_id || String(row.phase).endsWith('creating') || row.status === 'review') throw new Error('Presupuesto existente o creación incierta: conciliá y revisá Odoo; no se repara ni se crea otro.');
    if (!['error','pricing_review'].includes(String(row.status)) || !needsPricingRepair(order,original) && !/precisión de precio\/impuestos|componentes\/promociones|asignaci.n/i.test(String(row.error))) throw new Error('Solo se reparan fallas de asignación/precio afectadas.');
    const assessment=assessPricingRecovery(original,purchase);
    let confirmedCatalogue:Awaited<ReturnType<typeof loadRecoveryCatalogue>>|undefined;
    if(request.catalogueUnchangedSince!==undefined) {
      if(request.catalogueUnchangedSince!==CONFIRMED_CATALOGUE_SINCE||request.items)throw new Error('La recuperación con catálogo confirmado solo admite pedidos desde el 15/10/2026 y no permite reemplazar las líneas propuestas.');
      if(!confirmedCatalogueDateEligible(order.created_at))throw new Error('Esta confirmación de precios solo cubre pedidos desde el 15/10/2026 (hora argentina).');
      confirmedCatalogue=await loadRecoveryCatalogue(client,order);
    }
    const items = confirmedCatalogue ? reconstructConfirmedCatalogue(order,confirmedCatalogue) : request.items ?? (assessment.kind==='available' ? order.items : undefined);
    if (!items) throw new Error(assessment.message);
    // Before preparing/applying a real correction, reconcile markers and known IDs.
    const found = await search(call,'sale.order',[['company_id','=',1],'|','|',['origin','=',original.reference],['client_order_ref','=',original.reference],['id','=',Number(row.quotation_id)||0]],['name']);
    if (found.length) {
      await client.execute({sql:"UPDATE odoo_exports SET status='review',error='Hay un presupuesto existente en Odoo. Reconciliá antes de continuar.' WHERE order_id=? AND lock_token=?",args:[orderId,lease]});
      throw new Error('Presupuesto existente o creación incierta: conciliá y revisá Odoo; no se repara ni se crea otro.');
    }
    const source = confirmedCatalogue ? 'Confirmación del titular: precios y promociones sin cambios desde el 15/10/2026 (America/Argentina/Buenos_Aires), confirmados por el titular para recuperar estas compras.' : request.items ? request.source?.trim() : 'Snapshot de asignaciones v2 del pedido histórico';
    if (!actor || !source) throw new Error('Indicá la fuente histórica revisada (comprobante/respaldo de la fecha de compra).');
    const snapshot = repairedSnapshot(original,order,items);
    if (JSON.stringify(snapshot.lines) === JSON.stringify(original.lines)) throw new Error('La asignación ya coincide con la compra histórica. Usá Reintentar exportación: se reconstruirá el envío con los precios finales, sin IVA ni conversión a neto.');
    const catalogueConfirmation=confirmedCatalogue ? {since:CONFIRMED_CATALOGUE_SINCE,catalogueHash:createHash('sha256').update(JSON.stringify(confirmedCatalogue)).digest('hex')}:undefined;
    const token = createHash('sha256').update(JSON.stringify([String(row.snapshot),String(row.payload),snapshot,source,catalogueConfirmation ?? null])).digest('hex');
    if (!request.apply) return {status:'preview',token,source,before:original.lines,after:snapshot.lines,total:snapshot.total};
    if (request.token !== token) throw new Error('La evidencia o el snapshot cambiaron. Revisá una nueva vista previa antes de aplicar.');
    const data:PricingRepair = {version:1,snapshot,originalSnapshot:String(row.snapshot),originalPayload:row.payload ? String(row.payload):null,actor,mode:automaticRetry?'automatic_retry':undefined,source,catalogueConfirmation,at:new Date().toISOString(),token};
    await requireActiveOrder(orderId,client);
    const updated = await client.execute({sql:"UPDATE odoo_exports SET pricing_data=?,payload=NULL,status='error',error='Asignación reparada y auditada. Reintentá la exportación.',updated_at=CURRENT_TIMESTAMP WHERE order_id=? AND lock_token=? AND pricing_data IS NULL",args:[JSON.stringify(data),orderId,lease]});
    if (updated.rowsAffected !== 1) throw new Error('La exportación cambió. Recargá.');
    return {status:'repaired',token,total:snapshot.total};
  } finally {
    await client.execute({sql:'UPDATE odoo_exports SET lock_token=NULL,locked_until=0 WHERE order_id=? AND lock_token=?',args:[orderId,lease]});
  }
}
