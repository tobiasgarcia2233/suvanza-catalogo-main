import { NextResponse } from "next/server";
import { resetOdooSent, setOdooResult } from "@/lib/orderQueries";
import { readSessionFromCookie } from "@/lib/auth";

// Manual Odoo flow: the admin transcribes paid orders into Odoo and marks them
// here as sent (or undoes the mark). Only paid orders are affected.
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
    if (transferred) await setOdooResult(ids, { ok: true });
    else await resetOdooSent(ids);
    return NextResponse.json({ message: "ok", count: ids.length });
  } catch (err) {
    console.error("bulk-transfer error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Error" },
      { status: 500 },
    );
  }
}
