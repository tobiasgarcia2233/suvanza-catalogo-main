import "server-only";
import { db } from "./db";
import { slugify } from "./slug";

export interface Seller {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

// libSQL rows are Row instances, not plain objects: React refuses to pass them
// from a Server Component to a Client Component. Copy the fields out.
function rowToSeller(r: Record<string, unknown>): Seller {
  return {
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    created_at: String(r.created_at),
  };
}

const CODE_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomCode(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

export async function getAllSellers(): Promise<Seller[]> {
  const res = await db.execute("SELECT * FROM sellers ORDER BY created_at DESC");
  return res.rows.map(rowToSeller);
}

export async function getSellerBySlug(slug: string): Promise<Seller | null> {
  const res = await db.execute({
    sql: "SELECT * FROM sellers WHERE LOWER(slug) = LOWER(?)",
    args: [slug],
  });
  if (res.rows.length === 0) return null;
  return rowToSeller(res.rows[0]);
}

export async function getSellerByName(name: string): Promise<Seller | null> {
  const res = await db.execute({
    sql: "SELECT * FROM sellers WHERE LOWER(name) = LOWER(?)",
    args: [name],
  });
  if (res.rows.length === 0) return null;
  return rowToSeller(res.rows[0]);
}

export async function createSeller(name: string): Promise<Seller> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("El nombre no puede estar vacío.");

  const base = slugify(trimmed);
  if (!base) throw new Error("El nombre no puede estar vacío.");

  let slug = `${base}-${randomCode()}`;
  while (await getSellerBySlug(slug)) {
    slug = `${base}-${randomCode()}`;
  }

  const id = crypto.randomUUID();
  await db.execute({
    sql: "INSERT INTO sellers (id, name, slug) VALUES (?, ?, ?)",
    args: [id, trimmed, slug],
  });

  return { id, name: trimmed, slug, created_at: new Date().toISOString() };
}

export async function deleteSeller(id: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM sellers WHERE id = ?", args: [id] });
}
