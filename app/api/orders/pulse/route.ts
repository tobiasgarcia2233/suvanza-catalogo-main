import { NextResponse } from "next/server";
import { readSessionFromCookie } from "@/lib/auth";
import { getOrdersPulse } from "@/lib/orderQueries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSessionFromCookie();
  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const pulse = await getOrdersPulse();
  return NextResponse.json(pulse, {
    headers: { "Cache-Control": "no-store" },
  });
}
