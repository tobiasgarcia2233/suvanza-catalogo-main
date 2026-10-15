import 'server-only';
import type { Client } from '@libsql/client';
import { db } from './db';
import { odooCall } from './odooClient';
import type { Call } from './odooQuotation';
import { exportPaidOrder, getExport } from './odooExport';
import { canRecoverPricingOnRetry } from './odooExportStatus';
import { repairPricing } from './odooPricingRepair';
import { CONFIRMED_CATALOGUE_SINCE } from './pricingRecovery';

/** One operator action; each step retains the durable export/repair lease and guards.
 * Reconcile first, then reconstruct only eligible history, audit it, and resume export.
 * The internal token also prevents applying a catalogue changed during this request.
 */
export async function retryPaidOrder(orderId:string, actor:string, selectedPartner?:number, client:Client=db, call:Call=odooCall) {
  if (!actor.trim()) throw new Error('Se requiere un operador autenticado para reintentar.');
  const progress = await exportPaidOrder(orderId,selectedPartner,client,call);
  if (!canRecoverPricingOnRetry(progress)) return progress;
  const request = progress?.pricing_review?.kind === 'available' ? {} : {catalogueUnchangedSince:CONFIRMED_CATALOGUE_SINCE};
  try {
    const proposal = await repairPricing(orderId,actor,request,client,call,true);
    if (proposal.status !== 'preview') throw new Error('No se pudo preparar la recuperación del pedido.');
    await repairPricing(orderId,actor,{...request,apply:true,token:proposal.token},client,call,true);
  } catch (error) {
    // Another request may have acquired the lease, repaired or exported meanwhile.
    // Never overwrite that worker's state or clear a quotation/uncertain phase.
    const latest = await getExport(orderId,client);
    if (!latest || !canRecoverPricingOnRetry(latest)) return latest;
    return {...latest,error:error instanceof Error ? error.message : 'No se pudo recuperar el precio original del pedido.'};
  }
  return exportPaidOrder(orderId,selectedPartner,client,call);
}
