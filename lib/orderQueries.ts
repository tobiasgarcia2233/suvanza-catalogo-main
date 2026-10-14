import "server-only";
import { db } from "./db";
import { ODOO_QUEUE_STATUSES, type Order, type OrderPayment } from "@/types";

const isNumeric = (s: string) => /^\d+$/.test(s);

// SQL twin of isClosedSale() in @/types — keep both in sync.
export const CLOSED_SALE_SQL = "'COMPLETED', 'ODOO_SENT', 'ODOO_ERROR'";

type OrderRow = {
  id: string;
  created_at: string;
  status: string;
  order_date: string | null;
  total: number;
  discounted_amount: number;
  items: string;
  buyer_details: string;
  seller_name: string | null;
  auto_apply_promos: number;
  event_id: string | null;
  odoo_ref: string | null;
  odoo_error: string | null;
  odoo_sent_at: string | null;
  notes: string | null;
  payment_method: string | null;
  payments: string | null;
  promos_sold: string | null;
};

function rowToOrder(r: OrderRow): Order {
  const date = r.order_date ? JSON.parse(r.order_date) : null;
  let payments: OrderPayment[] | null = null;
  if (r.payments) {
    try {
      const parsed = JSON.parse(r.payments) as OrderPayment[];
      if (Array.isArray(parsed)) payments = parsed;
    } catch {
      /* malformed — fall through */
    }
  }
  // Legacy: synthesize a single-entry payments array from payment_method so the
  // UI can treat everything uniformly.
  if (!payments && r.payment_method) {
    payments = [{ method: r.payment_method, amount: Number(r.total) }];
  }
  let promosSold: { id: string; title: string; quantity: number }[] | null = null;
  if (r.promos_sold) {
    try {
      const parsed = JSON.parse(r.promos_sold);
      if (Array.isArray(parsed)) promosSold = parsed;
    } catch {
      /* malformed — fall through */
    }
  }
  return {
    id: r.id,
    created_at: r.created_at,
    status: r.status,
    date,
    total: Number(r.total),
    discounted_amount: Number(r.discounted_amount),
    items: JSON.parse(r.items),
    buyer_details: JSON.parse(r.buyer_details),
    seller_name: r.seller_name ?? "",
    autoApplyPromos: !!r.auto_apply_promos,
    event_id: r.event_id ?? null,
    odoo_ref: r.odoo_ref ?? null,
    odoo_error: r.odoo_error ?? null,
    odoo_sent_at: r.odoo_sent_at ?? null,
    notes: r.notes,
    payment_method: r.payment_method,
    payments,
    promos_sold: promosSold,
  };
}

/**
 * Admin dashboard filter by sales context: "individual" (no event), an event
 * id, or undefined / "" for every order.
 */
function eventCondition(event: string | undefined): { sql: string; args: string[] } | null {
  if (!event) return null;
  // "individual" = INDIVIDUAL_EVENT_SLUG (lib/eventQueries imports this file).
  if (event === "individual") return { sql: "event_id IS NULL", args: [] };
  return { sql: "event_id = ?", args: [event] };
}

/** Admin dashboard filter by order status. */
export type OrderStatusFilter = "pending" | "paid" | "odoo_error";

const STATUS_CONDITIONS: Record<OrderStatusFilter, string> = {
  pending: "status = 'PENDING_PAYMENT'",
  paid: `status IN (${CLOSED_SALE_SQL})`,
  odoo_error: "status = 'ODOO_ERROR'",
};

export async function fetchRecentOrders(
  query?: string,
  startDate?: string,
  endDate?: string,
  filters: { event?: string; status?: OrderStatusFilter } = {},
): Promise<Order[]> {
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  const byEvent = eventCondition(filters.event);
  if (byEvent) {
    conditions.push(byEvent.sql);
    args.push(...byEvent.args);
  }
  if (filters.status && STATUS_CONDITIONS[filters.status]) {
    conditions.push(STATUS_CONDITIONS[filters.status]);
  }

  if (startDate && endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push("created_at >= ?");
    conditions.push("created_at <= ?");
    args.push(new Date(startDate).toISOString(), end.toISOString());
  } else if (!filters.event || filters.event === "individual") {
    // Without dates the dashboard shows the last 24 hs — except for an event,
    // which spans several days: then every order of the event is listed.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    conditions.push("created_at >= ?");
    args.push(since);
  }

  if (query) {
    const q = query.trim();
    if (isNumeric(q)) {
      conditions.push("json_extract(buyer_details, '$.dni') LIKE ?");
      args.push(`${q}%`);
    } else {
      conditions.push("LOWER(json_extract(buyer_details, '$.name')) LIKE ?");
      args.push(`%${q.toLowerCase()}%`);
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const res = await db.execute({
    sql: `SELECT * FROM orders ${where} ORDER BY created_at DESC`,
    args,
  });
  return (res.rows as unknown as OrderRow[]).map(rowToOrder);
}

/**
 * Cheap "did anything change?" signal for the orders dashboard to poll instead
 * of re-running the whole page every few seconds. One indexed scan, tiny
 * payload. Catches new orders (count / latest) and paid/unpaid transitions
 * (paid). It does not catch note/payment edits made from another device — those
 * are rare and the operator making them already refreshes locally.
 */
export async function getOrdersPulse(): Promise<{
  count: number;
  latest: string | null;
  paid: number;
}> {
  const res = await db.execute(
    `SELECT COUNT(*) AS count,
            MAX(created_at) AS latest,
            COALESCE(SUM(CASE WHEN status IN (${CLOSED_SALE_SQL}) THEN 1 ELSE 0 END), 0) AS paid
     FROM orders`,
  );
  const row = res.rows[0] as unknown as {
    count: number | bigint;
    latest: string | null;
    paid: number | bigint;
  };
  return {
    count: Number(row.count),
    latest: row.latest ?? null,
    paid: Number(row.paid),
  };
}

export async function fetchOrdersBySeller(
  sellerName: string,
  /** undefined = every order, null = "Individual" only, string = that event. */
  eventId?: string | null,
): Promise<Order[]> {
  // Unlike the admin dashboards, this keeps every order for the seller —
  // completed sales stay visible permanently instead of disappearing once
  // they're paid or sent to Odoo.
  const conditions = ["LOWER(seller_name) = LOWER(?)"];
  const args: string[] = [sellerName];
  if (eventId === null) {
    conditions.push("event_id IS NULL");
  } else if (eventId !== undefined) {
    conditions.push("event_id = ?");
    args.push(eventId);
  }
  const res = await db.execute({
    sql: `SELECT * FROM orders
          WHERE ${conditions.join(" AND ")}
          ORDER BY created_at DESC`,
    args,
  });
  return (res.rows as unknown as OrderRow[]).map(rowToOrder);
}

export async function getOrder(id: string): Promise<Order | null> {
  const res = await db.execute({
    sql: "SELECT * FROM orders WHERE id = ?",
    args: [id],
  });
  if (res.rows.length === 0) return null;
  return rowToOrder(res.rows[0] as unknown as OrderRow);
}

export async function createOrder(input: Omit<Order, "id" | "created_at"> & {
  id?: string;
}): Promise<string> {
  const id = input.id ?? crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO orders (id, status, order_date, total, discounted_amount, items, buyer_details, seller_name, auto_apply_promos, promos_sold, event_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.status,
      input.date ? JSON.stringify(input.date) : null,
      input.total,
      input.discounted_amount,
      JSON.stringify(input.items),
      JSON.stringify(input.buyer_details),
      input.seller_name ?? null,
      input.autoApplyPromos ? 1 : 0,
      input.promos_sold && input.promos_sold.length > 0
        ? JSON.stringify(input.promos_sold)
        : null,
      input.event_id ?? null,
    ],
  });
  return id;
}

export async function updateOrder(
  id: string,
  patch: Partial<
    Omit<Order, "id" | "created_at" | "event_id" | "odoo_ref" | "odoo_error" | "odoo_sent_at">
  >,
): Promise<void> {
  const updates: string[] = [];
  const args: (string | number | null)[] = [];

  if (patch.status !== undefined) {
    // Orders already transcribed to Odoo before their payment was confirmed
    // (legacy) skip straight to ODOO_SENT once the payment lands.
    updates.push(
      "status = CASE WHEN ? = 'COMPLETED' AND odoo_sent_at IS NOT NULL THEN 'ODOO_SENT' ELSE ? END",
    );
    args.push(patch.status, patch.status);
  }
  if (patch.date !== undefined) {
    updates.push("order_date = ?");
    args.push(patch.date ? JSON.stringify(patch.date) : null);
  }
  if (patch.total !== undefined) {
    updates.push("total = ?");
    args.push(patch.total);
  }
  if (patch.discounted_amount !== undefined) {
    updates.push("discounted_amount = ?");
    args.push(patch.discounted_amount);
  }
  if (patch.items !== undefined) {
    updates.push("items = ?");
    args.push(JSON.stringify(patch.items));
  }
  if (patch.buyer_details !== undefined) {
    updates.push("buyer_details = ?");
    args.push(JSON.stringify(patch.buyer_details));
  }
  if (patch.seller_name !== undefined) {
    updates.push("seller_name = ?");
    args.push(patch.seller_name);
  }
  if (patch.autoApplyPromos !== undefined) {
    updates.push("auto_apply_promos = ?");
    args.push(patch.autoApplyPromos ? 1 : 0);
  }
  if (patch.promos_sold !== undefined) {
    updates.push("promos_sold = ?");
    args.push(
      patch.promos_sold && patch.promos_sold.length > 0
        ? JSON.stringify(patch.promos_sold)
        : null,
    );
  }
  if (patch.notes !== undefined) {
    updates.push("notes = ?");
    args.push(patch.notes === null ? null : String(patch.notes));
  }
  if (patch.payment_method !== undefined) {
    updates.push("payment_method = ?");
    args.push(patch.payment_method === null ? null : String(patch.payment_method));
  }
  if (patch.payments !== undefined) {
    updates.push("payments = ?");
    if (patch.payments === null) {
      args.push(null);
    } else {
      args.push(JSON.stringify(patch.payments));
    }
    // Clear the legacy single-method field so UIs don't double-count.
    updates.push("payment_method = ?");
    args.push(null);
  }

  if (updates.length === 0) return;
  args.push(id);
  await db.execute({
    sql: `UPDATE orders SET ${updates.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function deleteOrder(id: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM orders WHERE id = ?", args: [id] });
}

export async function fetchOrdersForOdoo(options: {
  includeSent?: boolean;
  startDate?: string;
  endDate?: string;
  event?: string;
}): Promise<Order[]> {
  // Only paid orders go to Odoo. By default the queue is what still needs
  // sending (never sent, or the last attempt failed); includeSent adds the
  // ones already in Odoo.
  const conditions: string[] = [
    options.includeSent
      ? `status IN (${CLOSED_SALE_SQL})`
      : `status IN (${ODOO_QUEUE_STATUSES.map((s) => `'${s}'`).join(", ")})`,
  ];
  const args: (string | number)[] = [];

  const byEvent = eventCondition(options.event);
  if (byEvent) {
    conditions.push(byEvent.sql);
    args.push(...byEvent.args);
  }

  if (options.startDate && options.endDate) {
    const end = new Date(options.endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push("created_at >= ?");
    conditions.push("created_at <= ?");
    args.push(new Date(options.startDate).toISOString(), end.toISOString());
  }

  const res = await db.execute({
    sql: `SELECT * FROM orders WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    args,
  });
  return (res.rows as unknown as OrderRow[]).map(rowToOrder);
}

export async function getSellerSalesStats(
  sellerName: string,
): Promise<{ productsSold: number; cartsBuilt: number }> {
  // "Carro cerrado" = the sale closed: the seller received payment and
  // handed over the product (see isClosedSale). Each order row counts once,
  // even if the same buyer ordered more than once.
  const res = await db.execute({
    sql: `SELECT items FROM orders
          WHERE LOWER(seller_name) = LOWER(?) AND status IN (${CLOSED_SALE_SQL})`,
    args: [sellerName],
  });

  let productsSold = 0;
  for (const row of res.rows as unknown as { items: string }[]) {
    const items = JSON.parse(row.items) as { quantity: number }[];
    productsSold += items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  }

  return { productsSold, cartsBuilt: res.rows.length };
}

export type OdooResult = { ok: true; ref?: string | null } | { ok: false; error: string };

/**
 * Records the outcome of sending paid orders to Odoo. Today the admin calls it
 * by hand from /odoo ("ya lo pasé"); the future Odoo integration reports each
 * request's result through here too. Orders not yet paid are left untouched.
 */
export async function setOdooResult(ids: string[], result: OdooResult): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => "?").join(", ");
  const queue = ODOO_QUEUE_STATUSES.map((s) => `'${s}'`).join(", ");
  if (result.ok) {
    await db.execute({
      sql: `UPDATE orders
            SET status = 'ODOO_SENT', odoo_sent_at = ?, odoo_ref = ?, odoo_error = NULL
            WHERE id IN (${placeholders}) AND status IN (${queue})`,
      args: [new Date().toISOString(), result.ref ?? null, ...ids],
    });
  } else {
    await db.execute({
      sql: `UPDATE orders
            SET status = 'ODOO_ERROR', odoo_error = ?
            WHERE id IN (${placeholders}) AND status IN (${queue})`,
      args: [result.error, ...ids],
    });
  }
}

/** Undoes a manual "sent to Odoo" mark: back to paid, waiting to be sent. */
export async function resetOdooSent(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => "?").join(", ");
  await db.execute({
    sql: `UPDATE orders
          SET status = 'COMPLETED', odoo_sent_at = NULL, odoo_ref = NULL, odoo_error = NULL
          WHERE id IN (${placeholders}) AND status = 'ODOO_SENT'`,
    args: ids,
  });
}
