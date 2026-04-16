import "server-only";
import { db } from "./db";
import type { Order } from "@/types";

const isNumeric = (s: string) => /^\d+$/.test(s);

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
  transferred_to_odoo: number;
  transferred_at: string | null;
};

function rowToOrder(r: OrderRow): Order & { transferred_to_odoo?: boolean; transferred_at?: string | null } {
  const date = r.order_date ? JSON.parse(r.order_date) : null;
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
    transferred_to_odoo: !!r.transferred_to_odoo,
    transferred_at: r.transferred_at,
  };
}

export async function fetchRecentOrders(
  query?: string,
  startDate?: string,
  endDate?: string,
): Promise<Order[]> {
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (startDate && endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push("created_at >= ?");
    conditions.push("created_at <= ?");
    args.push(new Date(startDate).toISOString(), end.toISOString());
  } else {
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
    sql: `INSERT INTO orders (id, status, order_date, total, discounted_amount, items, buyer_details, seller_name, auto_apply_promos)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ],
  });
  return id;
}

export async function updateOrder(
  id: string,
  patch: Partial<Omit<Order, "id" | "created_at">> & {
    transferred_to_odoo?: boolean;
  },
): Promise<void> {
  const updates: string[] = [];
  const args: (string | number | null)[] = [];

  if (patch.status !== undefined) {
    updates.push("status = ?");
    args.push(patch.status);
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
  if (patch.transferred_to_odoo !== undefined) {
    updates.push("transferred_to_odoo = ?");
    args.push(patch.transferred_to_odoo ? 1 : 0);
    updates.push("transferred_at = ?");
    args.push(patch.transferred_to_odoo ? new Date().toISOString() : null);
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
  includeTransferred?: boolean;
  startDate?: string;
  endDate?: string;
}): Promise<Order[]> {
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (!options.includeTransferred) {
    conditions.push("transferred_to_odoo = 0");
  }
  if (options.startDate && options.endDate) {
    const end = new Date(options.endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push("created_at >= ?");
    conditions.push("created_at <= ?");
    args.push(new Date(options.startDate).toISOString(), end.toISOString());
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const res = await db.execute({
    sql: `SELECT * FROM orders ${where} ORDER BY created_at DESC`,
    args,
  });
  return (res.rows as unknown as OrderRow[]).map(rowToOrder);
}

export async function bulkSetTransferred(
  ids: string[],
  transferred: boolean,
): Promise<void> {
  if (ids.length === 0) return;
  const now = new Date().toISOString();
  const placeholders = ids.map(() => "?").join(", ");
  await db.execute({
    sql: `UPDATE orders
          SET transferred_to_odoo = ?, transferred_at = ?
          WHERE id IN (${placeholders})`,
    args: [transferred ? 1 : 0, transferred ? now : null, ...ids],
  });
}
