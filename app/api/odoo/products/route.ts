import { NextResponse } from "next/server";
import { readSessionFromCookie } from "@/lib/auth";
import { OdooError } from "@/lib/odooClient";
import { getOdooProductDetails, searchOdooProducts } from "@/lib/odooQueries";

export async function GET(request: Request) {
  if (!(await readSessionFromCookie())) return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  const headers = { "Cache-Control": "no-store" };
  try {
    const params = new URL(request.url).searchParams;
    if (params.has("id")) {
      const raw = params.get("id")!;
      if (!/^[1-9]\d*$/.test(raw)) throw new OdooError("ID de Odoo inválido.", 400);
      // Display only: saving a link still goes through validateOdooLink.
      return NextResponse.json({ details: await getOdooProductDetails(Number(raw)) }, { headers });
    }
    return NextResponse.json({ products: await searchOdooProducts(params.get("q") ?? "") }, { headers });
  } catch (error) {
    return NextResponse.json({ message: error instanceof OdooError ? error.message : "No se pudo consultar Odoo. Intentá nuevamente." }, { status: error instanceof OdooError ? error.status : 503, headers });
  }
}
