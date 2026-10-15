import { activeOrderSql } from "./orderDeletion";
import "server-only";
import { db } from "./db";
import { CLOSED_SALE_SQL } from "./orderQueries";

// Sales metrics per context: an event, or "Individual" (event_id IS NULL).
// Only closed sales count (see isClosedSale): a "carro" is a paid order.

export interface ProductMetric {
  /** Product id; for lines whose product no longer exists, the line's id. */
  key: string;
  label: string;
  units: number;
  amount: number;
}

export interface PromotionMetric {
  id: string;
  title: string;
  quantity: number;
}

interface SalesTotals {
  /** Closed sales. */
  carts: number;
  /** Units sold, combos counted by their products. */
  units: number;
  amount: number;
  /** Orders still waiting for payment — informative, not part of the totals. */
  pendingCarts: number;
  pendingAmount: number;
  /** Paid orders whose last Odoo request failed. */
  odooErrors: number;
}

export interface SellerMetrics extends SalesTotals {
  sellerName: string;
  products: ProductMetric[];
  promotions: PromotionMetric[];
}

export interface ContextMetrics extends SalesTotals {
  sellers: SellerMetrics[];
  products: ProductMetric[];
  promotions: PromotionMetric[];
}

function emptyTotals(): SalesTotals {
  return { carts: 0, units: 0, amount: 0, pendingCarts: 0, pendingAmount: 0, odooErrors: 0 };
}

const byAmount = (a: { amount: number }, b: { amount: number }) => b.amount - a.amount;
const byQuantity = (a: { quantity: number }, b: { quantity: number }) =>
  b.quantity - a.quantity;

function mergeProducts(rows: ProductMetric[]): ProductMetric[] {
  const out = new Map<string, ProductMetric>();
  for (const r of rows) {
    const m = out.get(r.key);
    if (m) {
      m.units += r.units;
      m.amount += r.amount;
    } else out.set(r.key, { ...r });
  }
  return [...out.values()].sort(byAmount);
}

function mergePromotions(rows: PromotionMetric[]): PromotionMetric[] {
  const out = new Map<string, PromotionMetric>();
  for (const r of rows) {
    const m = out.get(r.id);
    if (m) m.quantity += r.quantity;
    else out.set(r.id, { ...r });
  }
  return [...out.values()].sort(byQuantity);
}

/**
 * @param eventId the event, or null for "Individual".
 * @param sellerNames sellers to list even without sales (an event's sellers).
 */
export async function getContextMetrics(
  eventId: string | null,
  sellerNames: string[] = [],
): Promise<ContextMetrics> {
  const where = eventId === null ? "o.event_id IS NULL" : "o.event_id = ?";
  const args = eventId === null ? [] : [eventId];

  const [orderRes, productRes, promoRes] = await db.batch(
    [
      {
        sql: `SELECT o.seller_name AS sellerName,
                SUM(CASE WHEN o.status IN (${CLOSED_SALE_SQL}) THEN 1 ELSE 0 END) AS carts,
                SUM(CASE WHEN o.status IN (${CLOSED_SALE_SQL}) THEN o.total ELSE 0 END) AS amount,
                SUM(CASE WHEN o.status = 'PENDING_PAYMENT' THEN 1 ELSE 0 END) AS pendingCarts,
                SUM(CASE WHEN o.status = 'PENDING_PAYMENT' THEN o.total ELSE 0 END) AS pendingAmount,
                SUM(CASE WHEN o.status = 'ODOO_ERROR' THEN 1 ELSE 0 END) AS odooErrors
              FROM orders o
              WHERE ${activeOrderSql("o")} AND ${where}
              GROUP BY o.seller_name`,
        args,
      },
      {
        // Lines carry a product or variant id: resolve it to its product so
        // variants add up. Lines from a replaced catalog keep their own label.
        sql: `SELECT o.seller_name AS sellerName,
                COALESCE(p.id, j.value->>'id') AS key,
                MAX(CASE WHEN p.id IS NOT NULL
                  THEN COALESCE(NULLIF(p.brand, '') || ' — ', '') || p.name
                  ELSE COALESCE(NULLIF(j.value->>'brand', '') || ' — ', '') || (j.value->>'name')
                END) AS label,
                SUM(j.value->>'quantity') AS units,
                SUM(COALESCE(j.value->>'finalPrice', 0)) AS amount
              FROM orders o, json_each(o.items) j
              LEFT JOIN variants v ON v.id = j.value->>'id'
              LEFT JOIN products p ON p.id = COALESCE(v.product_id, j.value->>'id')
              WHERE ${activeOrderSql("o")} AND ${where} AND o.status IN (${CLOSED_SALE_SQL})
              GROUP BY o.seller_name, COALESCE(p.id, j.value->>'id')`,
        args,
      },
      {
        sql: `SELECT o.seller_name AS sellerName,
                j.value->>'id' AS id,
                MAX(j.value->>'title') AS title,
                SUM(j.value->>'quantity') AS quantity
              FROM orders o, json_each(o.promos_sold) j
              WHERE ${activeOrderSql("o")} AND ${where} AND o.status IN (${CLOSED_SALE_SQL}) AND o.promos_sold IS NOT NULL
              GROUP BY o.seller_name, j.value->>'id'`,
        args,
      },
    ],
    "read",
  );

  const sellers = new Map<string, SellerMetrics>();
  const sellerFor = (name: string) => {
    let s = sellers.get(name);
    if (!s) {
      s = { sellerName: name, ...emptyTotals(), products: [], promotions: [] };
      sellers.set(name, s);
    }
    return s;
  };
  for (const name of sellerNames) sellerFor(name);

  for (const r of orderRes.rows) {
    const s = sellerFor(String(r.sellerName ?? "—"));
    s.carts = Number(r.carts);
    s.amount = Number(r.amount);
    s.pendingCarts = Number(r.pendingCarts);
    s.pendingAmount = Number(r.pendingAmount);
    s.odooErrors = Number(r.odooErrors);
  }
  for (const r of productRes.rows) {
    const s = sellerFor(String(r.sellerName ?? "—"));
    const metric: ProductMetric = {
      key: String(r.key),
      label: String(r.label),
      units: Number(r.units),
      amount: Number(r.amount),
    };
    s.products.push(metric);
    s.units += metric.units;
  }
  for (const r of promoRes.rows) {
    sellerFor(String(r.sellerName ?? "—")).promotions.push({
      id: String(r.id),
      title: String(r.title),
      quantity: Number(r.quantity),
    });
  }

  const list = [...sellers.values()];
  for (const s of list) {
    s.products.sort(byAmount);
    s.promotions.sort(byQuantity);
  }
  list.sort((a, b) => byAmount(a, b) || b.carts - a.carts);

  const totals = emptyTotals();
  for (const s of list) {
    for (const k of Object.keys(totals) as (keyof SalesTotals)[]) totals[k] += s[k];
  }

  return {
    ...totals,
    sellers: list,
    products: mergeProducts(list.flatMap((s) => s.products)),
    promotions: mergePromotions(list.flatMap((s) => s.promotions)),
  };
}
