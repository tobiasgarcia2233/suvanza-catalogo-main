import "server-only";
import { db } from "./db";

export interface Seller {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

type SellerRow = Seller;

const CODE_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomCode(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

function baseSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getAllSellers(): Promise<Seller[]> {
  const res = await db.execute("SELECT * FROM sellers ORDER BY created_at DESC");
  return res.rows as unknown as SellerRow[];
}

export async function getSellerBySlug(slug: string): Promise<Seller | null> {
  const res = await db.execute({
    sql: "SELECT * FROM sellers WHERE LOWER(slug) = LOWER(?)",
    args: [slug],
  });
  if (res.rows.length === 0) return null;
  return res.rows[0] as unknown as SellerRow;
}

export async function getSellerByName(name: string): Promise<Seller | null> {
  const res = await db.execute({
    sql: "SELECT * FROM sellers WHERE LOWER(name) = LOWER(?)",
    args: [name],
  });
  if (res.rows.length === 0) return null;
  return res.rows[0] as unknown as SellerRow;
}

export async function createSeller(name: string): Promise<Seller> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("El nombre no puede estar vacío.");

  const base = baseSlug(trimmed);
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
