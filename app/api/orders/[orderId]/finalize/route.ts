import { retryPaidOrder } from '@/lib/odooRetry';
import { repairPricing } from '@/lib/odooPricingRepair';
import { isOrderDeleted, OrderActionError } from '@/lib/orderDeletion';
import { NextResponse } from 'next/server';
import { readSessionFromCookie } from '@/lib/auth';
import { exportPaidOrder, getExport, resolveManually } from '@/lib/odooExport';
import { EXPORT_MIGRATION_MESSAGE } from '@/lib/odooExportStatus';
import { PARTNER_UPDATE_FIELDS, type CustomerReviewAction, type PartnerUpdateField } from '@/lib/customerReview';
export async function GET(_request: Request, context: { params: Promise<{orderId:string}> }) {
  if (!await readSessionFromCookie()) return NextResponse.json({message:'No autorizado'},{status:401});
  try {
    return NextResponse.json({export:await getExport((await context.params).orderId)},{headers:{'Cache-Control':'no-store'}});
  } catch (error) {
    console.error('Odoo local status read failed', error);
    return NextResponse.json({message:'No se pudo consultar el estado local de la exportación.',code:'EXPORT_STATUS_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
export async function POST(request: Request, context: { params: Promise<{orderId:string}> }) {
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({message:'No autorizado'},{status:401});
  const orderId = (await context.params).orderId;
  let current;
  try { current = await getExport(orderId); } catch {
    return NextResponse.json({message:'No se pudo consultar el estado local de la exportación.'},{status:503});
  }
  if (!current) return NextResponse.json({message:'Pedido sin exportación automática; conserva su gestión manual.'},{status:409});
  if (current.migration_required) return NextResponse.json({message:EXPORT_MIGRATION_MESSAGE},{status:503});
  const body = await request.json().catch(()=>null);
  if (!body || typeof body !== 'object') return NextResponse.json({message:'Solicitud inválida'},{status:400});
  const deleted = await isOrderDeleted(orderId);
  if (deleted) {
    if (body.action !== 'reconcile_deleted' || body.partnerId !== undefined) return NextResponse.json({message:'Pedido eliminado. Solo se permite conciliar el resultado existente, sin crear registros en Odoo.'},{status:409});
    try {
      return NextResponse.json({export:await exportPaidOrder(orderId,undefined,undefined,undefined,undefined,true)});
    } catch (error) {
      return NextResponse.json({message:error instanceof OrderActionError ? error.message : 'No se pudo conciliar el pedido eliminado.'},{status:error instanceof OrderActionError ? error.status : 503});
    }
  }
  if (body.action === 'resolve_manually') {
    try {
      return NextResponse.json({export:await resolveManually(orderId,session.sub)});
    } catch (error) {
      return NextResponse.json({message:error instanceof OrderActionError ? error.message : 'No se pudo marcar como resuelto.'},{status:error instanceof OrderActionError ? error.status : 503});
    }
  }
  if (body.action === 'repair_pricing') {
    try {
      return NextResponse.json({repair:await repairPricing(orderId,session.sub,{items:body.items,source:body.source,token:body.token,apply:body.apply === true,catalogueUnchangedSince:body.catalogueUnchangedSince})});
    } catch (error) {
      return NextResponse.json({message:error instanceof Error ? error.message : 'Reparación no disponible.'},{status:409});
    }
  }
  if (body.partnerId !== undefined && (!Number.isSafeInteger(body.partnerId) || body.partnerId <= 0)) return NextResponse.json({message:'Cliente inválido'},{status:400});
  let action: CustomerReviewAction | undefined;
  if (body.action !== undefined) {
    if (!['approve','correct','defer','update_partner'].includes(body.action) || !Number.isSafeInteger(body.revision) || body.revision < 0) return NextResponse.json({message:'Revisión inválida'},{status:400});
    const base = {actor:session.sub,revision:body.revision};
    if (body.action === 'approve') {
      if (!body.partnerId || typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) return NextResponse.json({message:'Comparación inválida'},{status:400});
      action = {...base,kind:'approve',token:body.token,partnerId:body.partnerId};
    } else if (body.action === 'update_partner') {
      if (!body.partnerId || typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) return NextResponse.json({message:'Comparación inválida'},{status:400});
      const fields = Array.isArray(body.fields) ? [...new Set(body.fields)] : [];
      if (!fields.length || !fields.every(f => PARTNER_UPDATE_FIELDS.includes(f as PartnerUpdateField))) return NextResponse.json({message:'Elegí nombre y/o teléfono para actualizar.'},{status:400});
      action = {...base,kind:'update_partner',token:body.token,partnerId:body.partnerId,fields:fields as PartnerUpdateField[],approveRest:body.approveRest === true};
    } else if (body.action === 'correct') {
      action = {...base,kind:'correct',buyer:body.buyer,preserveResolvedContact:body.preserveResolvedContact === true};
    } else action = {...base,kind:'defer'};
  }
  try {
    return NextResponse.json({export:await (action ? exportPaidOrder(orderId,undefined,undefined,undefined,action) : retryPaidOrder(orderId,session.sub,body.partnerId))});
  } catch (error) {
    return NextResponse.json({message:error instanceof OrderActionError ? error.message : 'No se pudo procesar la exportación.'},{status:error instanceof OrderActionError ? error.status : 503});
  }
}
