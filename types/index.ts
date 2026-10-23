// src/types/index.ts

export interface PriceTier {
  minQuantity: number;
  pricePerUnit: number;
}

export interface Variant {
  id: string;
  odooProductId?: number | null;
  name: string;
  imageUrls?: string[];
  priceTiers?: PriceTier[];
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: number | string;
  /** Unresolved reference from the former parent-level integration. */
  legacyOdooProductId?: number | null;
  brand?: string;
  name: string;
  categoryIds?: string[];
  categoryNames?: string[];
  priceTiers: PriceTier[];
  imageUrls: string[];
  variants?: Variant[];
  crossProductPromotions?: CrossPromotion[];
}

export interface OdooProduct {
  id: number;
  name: string;
  companyName: string;
}

/** One requirement the export checks on a linked product (see lib/odooQuotation.ts). */
export interface OdooLinkCheck {
  key: "found" | "company" | "active" | "sale_ok" | "uom";
  label: string;
  ok: boolean;
  /** What to fix in Odoo when it fails. */
  hint: string;
}

/** Read-only view of a linked variant, including the ones the export would reject. */
export interface OdooProductDetails {
  id: number;
  found: boolean;
  name: string | null;
  /** null when the company is empty ("Visible para todos"). */
  companyName: string | null;
  templateId: number | null;
  defaultCode: string | null;
  barcode: string | null;
  uomName: string | null;
  checks: OdooLinkCheck[];
  exportable: boolean;
}

export interface PricingAllocation {
  version: 2;
  kind: 'promotion' | 'extra';
  unitPrice: number;
  agreedTotal: number;
  baseUnitPrice?: number;
  tiers?: PriceTier[];
  tierQuantity?: number;
  promotionId?: string;
  allocationId?: string;
  comboSource?: 'explicit' | 'automatic';
  configuredUnitPrice?: number;
  promotionTotal?: number;
  repetitions?: number;
  quantityPerPromotion?: number;
  adjustment?: { manualPricePerUnit?: number | null; manualPercentage?: number; manualTotal?: number | null };
}

export interface CartItem extends Product {
  promotionUnitPrice?: number;
  promotionTotal?: number;
  tierQuantity?: number;
  quantity: number;
  parentId?: number | string;
  customTotal?: number | null;
  finalPrice?: number | null;
  discountPercentage: number;
  manualTotal: number | null;
  manualPercentage: number;
  promoId?: string;
  isPromo?: boolean;
  includedItems?: CartItem[];
  // One visible promotion row can contain repetitions with different concrete
  // variants or manual adjustments. Parts retain their per-repetition manifests.
  comboParts?: CartItem[];
  manualPricePerUnit?: number | null;
  // Automatic regrouping is distinct from explicitly purchasing a bundle.
  comboSource?: "automatic" | "explicit";
  comboChoiceKey?: string;
  cartLineKey?: string;
}

export type PaymentMethod =
  | "Efectivo pesos"
  | "Efectivo dólares"
  | "Transferencia Macro"
  | "Transferencia Santander"
  | "Mercado Pago"
  | "Tarjeta de crédito NAVE";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "Efectivo pesos",
  "Efectivo dólares",
  "Transferencia Macro",
  "Transferencia Santander",
  "Mercado Pago",
  "Tarjeta de crédito NAVE",
];

export interface OrderPayment {
  method: PaymentMethod | string;
  amount: number;
}

// Payment lifecycle: PENDING_PAYMENT → COMPLETED. New exports use odoo_exports.
// ODOO_SENT / ODOO_ERROR remain readable for historical manual transfers.
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "COMPLETED"
  | "ODOO_SENT"
  | "ODOO_ERROR";

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING_PAYMENT",
  "COMPLETED",
  "ODOO_SENT",
  "ODOO_ERROR",
];

/** Statuses waiting to be sent to Odoo (never sent, or the last send failed). */
export const ODOO_QUEUE_STATUSES: OrderStatus[] = ["COMPLETED", "ODOO_ERROR"];

/**
 * A closed sale: payment confirmed, whatever happened with Odoo afterwards.
 * This is what every sales metric counts ("carro").
 */
export function isClosedSale(status: string): boolean {
  return status === "COMPLETED" || status === "ODOO_SENT" || status === "ODOO_ERROR";
}

/**
 * A seller can no longer edit or delete the order. Besides closed sales this
 * covers legacy orders transcribed to Odoo before their payment was confirmed
 * (still PENDING_PAYMENT, but with odoo_sent_at set).
 */
export function isOrderLocked(order: Pick<Order, "status" | "odoo_sent_at">): boolean {
  return isClosedSale(order.status) || !!order.odoo_sent_at;
}

export interface Order {
  id: string; // uuid
  created_at: string;
  status: OrderStatus | string;
  /** null = venta "Individual" (fuera de cualquier evento). */
  event_id?: string | null;
  odoo_ref?: string | null;
  odoo_export_status?: string | null;
  odoo_error?: string | null;
  odoo_sent_at?: string | null;
  date: {
    day: number;
    month: number;
    year: number;
    hour: number;
    minutes: number;
  };
  total: number;
  discounted_amount: number;
  items: {
    id: string;
    brand: string;
    name: string;
    quantity: number;
    pricing?: PricingAllocation;
    finalPrice: number | null;
    discountPercentage: number;
  }[];
  buyer_details: {
    name: string;
    dni: string;
    phone: string;
  };
  seller_name: string;
  autoApplyPromos?: boolean;
  notes?: string | null;
  payment_method?: PaymentMethod | string | null;
  payments?: OrderPayment[] | null;
  promos_sold?: { id: string; title: string; quantity: number }[] | null;
}

export interface CrossPromotion {
  id: string;
  title: string;
  totalPrice: number;
  isPromo: boolean;
  items: {
    id: string;
    name: string;
    quantity: number;
    pricePerUnit: number;
    notes?: string;
    matchBy?: string;
    brand?: string;
  }[];
}
