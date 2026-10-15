import { requireActiveOrder, OrderActionError } from "@/lib/orderDeletion";
import { NextResponse } from "next/server";
import { exportPaidOrder, getExport } from "@/lib/odooExport";
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
    if (progress.some(p=>exportAction(p) !== 'retry')) return NextResponse.json({message:'La selección incluye pedidos manuales, enviados o que requieren revisión. Actualizá el estado y usá la acción de cada pedido.'},{status:409});
    const results = [];
    for (const id of ids) results.push({id, export:await exportPaidOrder(id)});
    return NextResponse.json({ message: "ok", count: ids.length, results });
  } catch (err) {
    if (err instanceof OrderActionError) return NextResponse.json({message:err.message},{status:err.status});
    console.error("bulk-transfer error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Error" },
      { status: 500 },
    );
  }
}
