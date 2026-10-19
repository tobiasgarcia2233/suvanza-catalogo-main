import { redirect } from "next/navigation";

// The Odoo queue now lives in the orders dashboard ("Requiere atención").
// Kept so old links and bookmarks still land somewhere useful.
export default function OdooDashboardPage() {
  redirect("/orders?status=attention");
}
