import { NextResponse } from "next/server";

// Odoo sync removed. Owner now transfers orders to Odoo manually via the dashboard.
// This endpoint exists only as a placeholder for a future "send to Odoo" button.
export async function POST() {
  return NextResponse.json(
    { message: "Odoo sync is not configured. Mark the order as transferred from the dashboard." },
    { status: 410 },
  );
}
