import "server-only";
import type { InStatement } from "@libsql/client";
import { db } from "./db";
import { slugify } from "./slug";
import { CLOSED_SALE_SQL } from "./orderQueries";

export type EventStatus = "active" | "closed";

/**
 * Slug reserved for the virtual "Individual" context (orders with
 * event_id = NULL, full catalog). No real event may take it.
 */
export const INDIVIDUAL_EVENT_SLUG = "individual";

export interface SalesEvent {
  id: string;
  name: string;
  slug: string;
  status: EventStatus;
  starts_at: string | null;
  ends_at: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface SalesEventDetail extends SalesEvent {
  sellerIds: string[];
  productIds: string[];
  promotionIds: string[];
}

export interface SalesEventSummary extends SalesEvent {
  sellerCount: number;
  productCount: number;
  promotionCount: number;
  /** Closed sales (see isClosedSale) and their amount. */
  salesCount: number;
  salesTotal: number;
}

export interface SalesEventInput {
  name: string;
  slug?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  sellerIds: string[];
  productIds: string[];
  promotionIds: string[];
}

/** Validation failure the admin can fix (bad name, slug taken...) → HTTP 400. */
export class EventInputError extends Error {}

export async function getAllEvents(): Promise<SalesEventSummary[]> {
  const res = await db.execute(
    `SELECT e.*,
            -- Joined so links to deleted rows never count, even if the
            -- ON DELETE CASCADE didn't run.
            (SELECT COUNT(*) FROM event_sellers es JOIN sellers x ON x.id = es.seller_id
              WHERE es.event_id = e.id) AS sellerCount,
            (SELECT COUNT(*) FROM event_products ep JOIN products x ON x.id = ep.product_id
              WHERE ep.event_id = e.id) AS productCount,
            (SELECT COUNT(*) FROM event_promotions epr JOIN promotions x ON x.id = epr.promotion_id
              WHERE epr.event_id = e.id) AS promotionCount,
            COALESCE(s.salesCount, 0) AS salesCount,
            COALESCE(s.salesTotal, 0) AS salesTotal
     FROM events e
     LEFT JOIN (
       SELECT event_id, COUNT(*) AS salesCount, SUM(total) AS salesTotal
       FROM orders
       WHERE event_id IS NOT NULL AND status IN (${CLOSED_SALE_SQL})
       GROUP BY event_id
     ) s ON s.event_id = e.id
     ORDER BY CASE e.status WHEN 'active' THEN 0 ELSE 1 END, e.created_at DESC`,
  );
  return (res.rows as unknown as SalesEventSummary[]).map((r) => ({
    ...r,
    sellerCount: Number(r.sellerCount),
    productCount: Number(r.productCount),
    promotionCount: Number(r.promotionCount),
    salesCount: Number(r.salesCount),
    salesTotal: Number(r.salesTotal),
  }));
}

export async function getEvent(id: string): Promise<SalesEventDetail | null> {
  const [eventRes, sellerRes, productRes, promoRes] = await db.batch(
    [
      { sql: "SELECT * FROM events WHERE id = ?", args: [id] },
      { sql: "SELECT seller_id AS id FROM event_sellers WHERE event_id = ?", args: [id] },
      { sql: "SELECT product_id AS id FROM event_products WHERE event_id = ?", args: [id] },
      { sql: "SELECT promotion_id AS id FROM event_promotions WHERE event_id = ?", args: [id] },
    ],
    "read",
  );
  if (eventRes.rows.length === 0) return null;
  const ids = (rows: typeof sellerRes.rows) => rows.map((r) => String(r.id));
  return {
    ...(eventRes.rows[0] as unknown as SalesEvent),
    sellerIds: ids(sellerRes.rows),
    productIds: ids(productRes.rows),
    promotionIds: ids(promoRes.rows),
  };
}

async function normalizeInput(
  input: SalesEventInput,
  currentId?: string,
): Promise<{ name: string; slug: string; starts_at: string | null; ends_at: string | null }> {
  const name = (input.name ?? "").trim();
  if (!name) throw new EventInputError("El nombre no puede estar vacío.");

  const slug = slugify(input.slug?.trim() || name);
  if (!slug) throw new EventInputError("El slug no puede estar vacío.");
  if (slug === INDIVIDUAL_EVENT_SLUG) {
    throw new EventInputError(`"${INDIVIDUAL_EVENT_SLUG}" está reservado. Elegí otro slug.`);
  }
  const taken = await db.execute({
    sql: "SELECT id FROM events WHERE slug = ? AND id != ?",
    args: [slug, currentId ?? ""],
  });
  if (taken.rows.length > 0) {
    throw new EventInputError(`Ya existe un evento con el slug "${slug}".`);
  }

  const starts_at = input.starts_at || null;
  const ends_at = input.ends_at || null;
  if (starts_at && ends_at && ends_at < starts_at) {
    throw new EventInputError("La fecha de fin es anterior a la de inicio.");
  }
  return { name, slug, starts_at, ends_at };
}

function clearMembershipStatements(id: string): InStatement[] {
  return [
    { sql: "DELETE FROM event_sellers WHERE event_id = ?", args: [id] },
    { sql: "DELETE FROM event_products WHERE event_id = ?", args: [id] },
    { sql: "DELETE FROM event_promotions WHERE event_id = ?", args: [id] },
  ];
}

/** Replaces the event's sellers / products / promos with the given lists. */
function membershipStatements(id: string, input: SalesEventInput): InStatement[] {
  const unique = (xs: string[]) => [...new Set((xs ?? []).map(String))];
  return [
    ...clearMembershipStatements(id),
    ...unique(input.sellerIds).map((sellerId) => ({
      sql: "INSERT INTO event_sellers (event_id, seller_id) VALUES (?, ?)",
      args: [id, sellerId],
    })),
    ...unique(input.productIds).map((productId) => ({
      sql: "INSERT INTO event_products (event_id, product_id) VALUES (?, ?)",
      args: [id, productId],
    })),
    ...unique(input.promotionIds).map((promotionId) => ({
      sql: "INSERT INTO event_promotions (event_id, promotion_id) VALUES (?, ?)",
      args: [id, promotionId],
    })),
  ];
}

export async function createEvent(input: SalesEventInput): Promise<string> {
  const data = await normalizeInput(input);
  const id = crypto.randomUUID();
  await db.batch(
    [
      {
        sql: `INSERT INTO events (id, name, slug, starts_at, ends_at) VALUES (?, ?, ?, ?, ?)`,
        args: [id, data.name, data.slug, data.starts_at, data.ends_at],
      },
      ...membershipStatements(id, input),
    ],
    "write",
  );
  return id;
}

export async function updateEvent(id: string, input: SalesEventInput): Promise<void> {
  const data = await normalizeInput(input, id);
  await db.batch(
    [
      {
        sql: `UPDATE events SET name = ?, slug = ?, starts_at = ?, ends_at = ? WHERE id = ?`,
        args: [data.name, data.slug, data.starts_at, data.ends_at, id],
      },
      ...membershipStatements(id, input),
    ],
    "write",
  );
}

/** Only the admin closes an event; closing stops its sales (see phase 3). */
export async function setEventStatus(id: string, status: EventStatus): Promise<void> {
  await db.execute({
    sql: `UPDATE events SET status = ?, closed_at = ? WHERE id = ?`,
    args: [status, status === "closed" ? new Date().toISOString() : null, id],
  });
}

/**
 * Events with orders can't be deleted — their sales would silently fall into
 * "Individual". Close them instead.
 */
export async function deleteEvent(id: string): Promise<void> {
  const orders = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM orders WHERE event_id = ?",
    args: [id],
  });
  const n = Number(orders.rows[0]?.n ?? 0);
  if (n > 0) {
    throw new EventInputError(
      `El evento tiene ${n} pedido${n === 1 ? "" : "s"} y no se puede eliminar. Cerralo en su lugar.`,
    );
  }
  await db.batch(
    [...clearMembershipStatements(id), { sql: "DELETE FROM events WHERE id = ?", args: [id] }],
    "write",
  );
}
