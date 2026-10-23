/**
 * Status shown on an order card. Payment comes from the order; everything
 * about Odoo comes only from odoo_exports.status (the source of truth).
 */
export type OrderDisplayStatus =
  | "pending"
  | "paid"
  | "odoo_pending"
  | "odoo_processing"
  | "odoo_sent"
  | "odoo_manual"
  | "odoo_review"
  | "odoo_error";

export function orderDisplayStatus(paid: boolean, exportStatus: string | null | undefined): OrderDisplayStatus {
  if (!paid) return "pending";
  switch (exportStatus) {
    case "processing":
      return "odoo_processing";
    case "exported":
    case "legacy_sent":
      return "odoo_sent";
    case "manual_resolved":
      return "odoo_manual";
    case "review":
    case "pricing_review":
    case "customer_review":
    case "customer_selection":
      return "odoo_review";
    case "error":
      return "odoo_error";
    case "pending":
      // Paid, but the automatic send didn't finish.
      return "odoo_pending";
    default:
      // No outbox row: handled by hand in Odoo.
      return "paid";
  }
}

export const DISPLAY_STATUS_META: Record<
  OrderDisplayStatus,
  { label: string; badge: string; dot: string; attention: boolean }
> = {
  pending: { label: "Pendiente", badge: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500", attention: false },
  paid: { label: "Pagada", badge: "bg-green-100 text-green-800", dot: "bg-green-500", attention: false },
  odoo_pending: { label: "Por enviar a Odoo", badge: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500", attention: false },
  odoo_processing: { label: "Odoo enviando", badge: "bg-sky-100 text-sky-800", dot: "bg-sky-500", attention: false },
  odoo_sent: { label: "Odoo enviado", badge: "bg-green-700 text-white", dot: "bg-green-700", attention: false },
  odoo_manual: { label: "Odoo manual", badge: "bg-green-100 text-green-800", dot: "bg-green-700", attention: false },
  odoo_review: { label: "Odoo revisión", badge: "bg-orange-100 text-orange-800", dot: "bg-orange-500", attention: true },
  odoo_error: { label: "Odoo error", badge: "bg-red-100 text-red-800", dot: "bg-red-500", attention: true },
};
