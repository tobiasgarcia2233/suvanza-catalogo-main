import "server-only";
import { db } from "./db";
import type { Product, Variant, PriceTier } from "@/types";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export type ProductInput = {
  id?: string;
  brand?: string | null;
  name: string;
  position?: number;
  imageUrls?: string[];
  priceTiers?: PriceTier[];
  variants?: Variant[];
  promotionIds?: string[];
};

export async function createProduct(input: ProductInput): Promise<string> {
  const id =
    input.id?.trim() || `${slugify(input.name)}-${Date.now().toString(36)}`;
  await persistProduct(id, input, false);
  return id;
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<void> {
  const existing = await db.execute({
    sql: "SELECT id FROM products WHERE id = ?",
    args: [id],
  });
  if (existing.rows.length === 0) {
    throw new Error("Product not found");
  }
  await persistProduct(id, input, true);
}

async function persistProduct(
  id: string,
  input: ProductInput,
  isUpdate: boolean,
): Promise<void> {
  const now = new Date().toISOString();

  if (isUpdate) {
    await db.execute({
      sql: `UPDATE products SET brand=?, name=?, position=?, updated_at=? WHERE id=?`,
      args: [
        input.brand ?? null,
        input.name,
        input.position ?? 0,
        now,
        id,
      ],
    });
    // Cascading children — wipe and reinsert
    await db.batch(
      [
        { sql: "DELETE FROM product_images WHERE product_id = ?", args: [id] },
        { sql: "DELETE FROM price_tiers WHERE product_id = ?", args: [id] },
        { sql: "DELETE FROM variants WHERE product_id = ?", args: [id] },
        { sql: "DELETE FROM product_promotions WHERE product_id = ?", args: [id] },
      ],
      "write",
    );
  } else {
    await db.execute({
      sql: `INSERT INTO products (id, brand, name, position) VALUES (?, ?, ?, ?)`,
      args: [
        id,
        input.brand ?? null,
        input.name,
        input.position ?? 0,
      ],
    });
  }

  // Top-level images
  const imageUrls = input.imageUrls ?? [];
  for (let i = 0; i < imageUrls.length; i++) {
    await db.execute({
      sql: `INSERT INTO product_images (product_id, variant_id, url, position) VALUES (?, NULL, ?, ?)`,
      args: [id, imageUrls[i], i],
    });
  }

  // Top-level price tiers
  const topTiers = input.priceTiers ?? [];
  for (let i = 0; i < topTiers.length; i++) {
    const t = topTiers[i];
    await db.execute({
      sql: `INSERT INTO price_tiers (product_id, variant_id, min_quantity, price_per_unit, position) VALUES (?, NULL, ?, ?, ?)`,
      args: [id, t.minQuantity, t.pricePerUnit, i],
    });
  }

  // Variants with their images + tiers
  const variants = input.variants ?? [];
  for (let vi = 0; vi < variants.length; vi++) {
    const v = variants[vi];
    const vid = v.id?.trim() || `${id}-var-${vi + 1}-${Date.now().toString(36)}`;
    await db.execute({
      sql: `INSERT INTO variants (id, product_id, name, position) VALUES (?, ?, ?, ?)`,
      args: [vid, id, v.name, vi],
    });
    const imgs = v.imageUrls ?? [];
    for (let i = 0; i < imgs.length; i++) {
      await db.execute({
        sql: `INSERT INTO product_images (product_id, variant_id, url, position) VALUES (?, ?, ?, ?)`,
        args: [id, vid, imgs[i], i],
      });
    }
    const tiers = v.priceTiers ?? [];
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      await db.execute({
        sql: `INSERT INTO price_tiers (product_id, variant_id, min_quantity, price_per_unit, position) VALUES (?, ?, ?, ?, ?)`,
        args: [id, vid, t.minQuantity, t.pricePerUnit, i],
      });
    }
  }

  // Promotion links
  const promotionIds = input.promotionIds ?? [];
  for (const pid of promotionIds) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO product_promotions (product_id, promotion_id) VALUES (?, ?)`,
      args: [id, pid],
    });
  }
}

export async function deleteProduct(id: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM products WHERE id = ?", args: [id] });
}

// ----- Promotions -----

export type PromotionInput = {
  id?: string;
  title: string;
  totalPrice: number;
  isPromo?: boolean;
  position?: number;
  items: {
    itemId: string;
    itemName: string;
    brand?: string | null;
    quantity: number;
    pricePerUnit: number;
    notes?: string | null;
    matchBy?: string | null;
  }[];
  linkedProductIds?: string[];
};

export async function createPromotion(input: PromotionInput): Promise<string> {
  const id =
    input.id?.trim() ||
    `${slugify(input.title)}-${Date.now().toString(36)}`;
  await persistPromotion(id, input, false);
  return id;
}

export async function updatePromotion(
  id: string,
  input: PromotionInput,
): Promise<void> {
  const existing = await db.execute({
    sql: "SELECT id FROM promotions WHERE id = ?",
    args: [id],
  });
  if (existing.rows.length === 0) throw new Error("Promotion not found");
  await persistPromotion(id, input, true);
}

async function persistPromotion(
  id: string,
  input: PromotionInput,
  isUpdate: boolean,
) {
  if (isUpdate) {
    await db.execute({
      sql: `UPDATE promotions SET title=?, total_price=?, is_promo=?, position=? WHERE id=?`,
      args: [
        input.title,
        input.totalPrice,
        input.isPromo === false ? 0 : 1,
        input.position ?? 0,
        id,
      ],
    });
    await db.batch(
      [
        { sql: "DELETE FROM promotion_items WHERE promotion_id = ?", args: [id] },
        {
          sql: "DELETE FROM product_promotions WHERE promotion_id = ?",
          args: [id],
        },
      ],
      "write",
    );
  } else {
    await db.execute({
      sql: `INSERT INTO promotions (id, title, total_price, is_promo, position) VALUES (?, ?, ?, ?, ?)`,
      args: [
        id,
        input.title,
        input.totalPrice,
        input.isPromo === false ? 0 : 1,
        input.position ?? 0,
      ],
    });
  }

  for (let i = 0; i < input.items.length; i++) {
    const it = input.items[i];
    await db.execute({
      sql: `INSERT INTO promotion_items
              (promotion_id, item_id, item_name, brand, quantity, price_per_unit, notes, match_by, position)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        it.itemId,
        it.itemName,
        it.brand ?? null,
        it.quantity,
        it.pricePerUnit,
        it.notes ?? null,
        it.matchBy ?? null,
        i,
      ],
    });
  }

  for (const productId of input.linkedProductIds ?? []) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO product_promotions (product_id, promotion_id) VALUES (?, ?)`,
      args: [productId, id],
    });
  }
}

export async function deletePromotion(id: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM promotions WHERE id = ?", args: [id] });
}
