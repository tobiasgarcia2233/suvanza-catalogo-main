import type { Order } from '@/types';
import type { ExportSnapshot } from './odooQuotation';
export const CONFIRMED_CATALOGUE_SINCE = '2026-10-15';
export const CONFIRMED_CATALOGUE_START = '2026-10-15T00:00:00-03:00';

/** Purchase timestamps without an offset are SQLite UTC timestamps. */
export function confirmedCatalogueDateEligible(createdAt:unknown,now=Date.now()) {
  if(typeof createdAt!=='string')return false;
  const bare=/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(createdAt);
  const timestamp=Date.parse(bare ? createdAt.replace(' ','T')+'Z':createdAt);
  return Number.isFinite(timestamp)&&timestamp>=Date.parse(CONFIRMED_CATALOGUE_START)&&timestamp<=now;
}

export type PricingReviewState = {
  kind:'available'|'missing_history'|'invalid_history';
  message:string;
  savedLines:ExportSnapshot['lines'];
  promotions:NonNullable<Order['promos_sold']>;
  confirmedCatalogueEligible?:boolean;
  paidTotal?:number;
};
export type PricingRepairRequest = {items?:Order['items'];source?:string;token?:string;apply?:boolean;catalogueUnchangedSince?:string};
export type PricingRepairPreview = {
  status:'preview';token:string;source:string;total:number;
  before:ExportSnapshot['lines'];after:ExportSnapshot['lines'];
};
export type PricingRepairResult = PricingRepairPreview | {status:'repaired';token:string;total:number};
export async function requestPricingRepair(orderId:string, body:PricingRepairRequest):Promise<PricingRepairResult> {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/finalize`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,action:'repair_pricing'}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudo revisar la asignación histórica.');
  const repair = data.repair;
  if (!repair || !['preview','repaired'].includes(repair.status) || typeof repair.token !== 'string' || !Number.isFinite(repair.total) ||
    (repair.status === 'preview' && (!Array.isArray(repair.before)||!Array.isArray(repair.after)||typeof repair.source !== 'string'))) throw new Error('Respuesta de reparación inválida.');
  return repair;
}
