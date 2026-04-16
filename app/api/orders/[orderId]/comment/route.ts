import { NextResponse } from "next/server";

// Odoo comments removed alongside the rest of the Odoo integration.
export async function POST() {
  return NextResponse.json({ message: "Odoo comments disabled." }, { status: 410 });
}
