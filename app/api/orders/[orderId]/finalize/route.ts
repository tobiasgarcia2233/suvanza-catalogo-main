import { NextResponse } from 'next/server';
import { readSessionFromCookie } from '@/lib/auth';
import { exportPaidOrder, getExport } from '@/lib/odooExport';
export async function GET(_request: Request, context: { params: Promise<{orderId:string}> }) {
  if (!await readSessionFromCookie()) return NextResponse.json({message:'No autorizado'},{status:401});
  return NextResponse.json({export:await getExport((await context.params).orderId)},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request: Request, context: { params: Promise<{orderId:string}> }) {
  if (!await readSessionFromCookie()) return NextResponse.json({message:'No autorizado'},{status:401});
  const body = await request.json().catch(()=>({}));
  if (body.partnerId !== undefined && (!Number.isSafeInteger(body.partnerId) || body.partnerId <= 0)) return NextResponse.json({message:'Cliente inválido'},{status:400});
  return NextResponse.json({export:await exportPaidOrder((await context.params).orderId,body.partnerId)});
}
