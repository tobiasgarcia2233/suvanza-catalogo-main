import { retryPaidOrder } from '@/lib/odooRetry';
import { requireActiveOrder, OrderActionError } from "@/lib/orderDeletion";
import { NextResponse } from "next/server";
import { getExport } from "@/lib/odooExport";
import { exportAction } from '@/lib/odooExportStatus';
import { readSessionFromCookie } from "@/lib/auth";

// Existing dashboard now runs the same durable export as payment/retry.
export async function POST(request: Request) {
  const session = await readSessionFromCookie();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const { ids, transferred } = await request.json();
    if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) {
      return NextResponse.json({ message: "ids inválidos" }, { status: 400 });
    }
    if (!transferred) return NextResponse.json({message:"No se puede deshacer una exportación. Revisá el presupuesto en Odoo."},{status:409});
    if (ids.length > 20) return NextResponse.json({message:"Exportá hasta 20 pedidos por vez."},{status:400});
    await Promise.all(ids.map((id:string)=>requireActiveOrder(id)));
    const progress = await Promise.all(ids.map((id: string)=>getExport(id)));
    // Only plain retries run in bulk. Orders that need a decision (customer,
    // reconcile...) are skipped and keep their own action in the modal.
    const eligible = ids.filter((_: string, i: number) => exportAction(progress[i]) === 'retry');
    const skipped = ids.filter((id: string) => !eligible.includes(id));
    if (!eligible.length) return NextResponse.json({message:'Ninguno de estos pedidos se puede reintentar en bloque: cada uno requiere revisarlo en su detalle.',skipped},{status:409});
    const results = [];
    for (const id of eligible) results.push({id, export:await retryPaidOrder(id,session.sub)});
    return NextResponse.json({ message: "ok", count: eligible.length, results, skipped });
  } catch (err) {
    if (err instanceof OrderActionError) return NextResponse.json({message:err.message},{status:err.status});
    console.error("bulk-transfer error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Error" },
      { status: 500 },
    );
  }
}
