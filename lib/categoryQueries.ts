import "server-only";
import { db } from "./db";
import type { Category } from "@/types";

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function toCategory(row: Record<string, unknown>): Category {
  return { id: row.id as string, name: row.name as string };
}

export async function getAllCategories(): Promise<Category[]> {
  const res = await db.execute("SELECT id, name FROM categories ORDER BY name ASC");
  return (res.rows as unknown as Record<string, unknown>[]).map(toCategory);
}

export async function getCategoryByName(name: string): Promise<Category | null> {
  const res = await db.execute({
    sql: "SELECT id, name FROM categories WHERE LOWER(name) = LOWER(?)",
    args: [name.trim()],
  });
  if (res.rows.length === 0) return null;
  return toCategory(res.rows[0] as unknown as Record<string, unknown>);
}

export async function findOrCreateCategory(name: string): Promise<Category> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("El nombre de la categoría no puede estar vacío.");

  const existing = await getCategoryByName(trimmed);
  if (existing) return existing;

  const base = slugify(trimmed) || "categoria";
  let id = base;
  let n = 2;
  while (
    (await db.execute({ sql: "SELECT id FROM categories WHERE id = ?", args: [id] }))
      .rows.length > 0
  ) {
    id = `${base}-${n++}`;
  }

  await db.execute({
    sql: "INSERT INTO categories (id, name) VALUES (?, ?)",
    args: [id, trimmed],
  });

  return { id, name: trimmed };
}

export async function renameCategory(id: string, name: string): Promise<Category> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("El nombre de la categoría no puede estar vacío.");

  const clash = await db.execute({
    sql: "SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id <> ?",
    args: [trimmed, id],
  });
  if (clash.rows.length > 0) {
    throw new Error(`Ya existe una categoría llamada "${trimmed}".`);
  }

  const res = await db.execute({
    sql: "UPDATE categories SET name = ? WHERE id = ?",
    args: [trimmed, id],
  });
  if (res.rowsAffected === 0) throw new Error("La categoría no existe.");

  return { id, name: trimmed };
}

export async function deleteCategory(id: string): Promise<void> {
  // Explicitly unlink from every product first (don't rely on FK cascade being
  // enabled on the connection); no product is deleted, they just lose the tag.
  await db.batch(
    [
      { sql: "DELETE FROM product_categories WHERE category_id = ?", args: [id] },
      { sql: "DELETE FROM categories WHERE id = ?", args: [id] },
    ],
    "write",
  );
}
