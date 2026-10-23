import { validatePromotion, promotionComponentTotal } from "./checkoutPricing";
import "server-only";
import { db } from "./db";
import type { Variant, PriceTier } from "@/types";
import { findOrCreateCategory } from "./categoryQueries";
import { validateOdooLink } from "./odooQueries";
import { OdooError } from "./odooClient";
import { getProduct } from "./productQueries";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export type ProductInput = {
  id?: string;
  /** Only accepted to reject stale parent-level clients; never persisted. */
  odooProductId?: number | null;
  resolveLegacyOdooProductId?: number;
  brand?: string | null;
  name: string;
  /** Category names — resolved/created on save. A product can have many. */
  categories?: string[];
  position?: number;
  imageUrls?: string[];
  priceTiers?: PriceTier[];
  variants?: (Variant & { originalId?: string })[];
  promotionIds?: string[];
};

async function prepareVariants(input: ProductInput, previous: Variant[]) {
  if (input.odooProductId != null) {
    throw new OdooError("El vínculo con Odoo pertenece a cada variante. Recargá el formulario.", 400);
  }
  const variants = input.variants ?? previous;
  if (!Array.isArray(variants)) throw new OdooError("Las variantes no son válidas.", 400);
  const used = new Set<string>();
  const ids = new Set<string>();
  const result: Variant[] = [];
  for (const v of variants) {
    if (!v || typeof v.id !== "string" || typeof v.name !== "string") {
      throw new OdooError("Revisá el nombre y el ID local de cada variante.", 400);
    }
    const source = "originalId" in v ? v.originalId : v.id.trim();
    if (source !== undefined && typeof source !== "string") throw new OdooError("Identidad de variante inválida.", 400);
    const saved = previous.find((old) => old.id === source);
    if (("originalId" in v && source && !saved) || (saved && used.has(saved.id))) {
      throw new OdooError("La variante original no existe o está duplicada. Recargá el formulario.", 400);
    }
    if (saved) used.add(saved.id);
    const localId = v.id.trim();
    if (localId && ids.has(localId)) throw new OdooError("Los IDs locales de variantes no pueden repetirse.", 400);
    if (localId) ids.add(localId);
    // Match by persisted identity, never by array position or submitted Odoo ID.
    const odooProductId = await validateOdooLink(v.odooProductId, saved?.odooProductId ?? null);
    result.push({ ...v, id: localId, odooProductId });
  }
  return result;
}

export async function createProduct(input: ProductInput): Promise<string> {
  const variants = await prepareVariants(input, []);
  if (input.resolveLegacyOdooProductId !== undefined) throw new OdooError("No hay un vínculo anterior para asignar.", 400);
  const id = input.id?.trim() || `${slugify(input.name)}-${Date.now().toString(36)}`;
  await persistProduct(id, { ...input, variants }, false);
  return id;
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const existing = await getProduct(id);
  if (!existing) throw new Error("Product not found");
  const variants = await prepareVariants(input, existing.variants ?? []);
  if (input.resolveLegacyOdooProductId !== undefined) {
    if (!existing.legacyOdooProductId || input.resolveLegacyOdooProductId !== existing.legacyOdooProductId ||
        !variants.some((v) => v.odooProductId === existing.legacyOdooProductId)) {
      throw new OdooError("Para resolver el vínculo anterior, asigná su ID a una variante y guardá nuevamente.", 400);
    }
  }
  await persistProduct(id, { ...input, variants }, true);
}

async function persistProduct(
  id: string,
  input: ProductInput,
  isUpdate: boolean,
): Promise<void> {
  const now = new Date().toISOString();

  const categoryNames = Array.from(
    new Set((input.categories ?? []).map((c) => c.trim()).filter(Boolean)),
  );
  const categoryIds: string[] = [];
  for (const name of categoryNames) {
    categoryIds.push((await findOrCreateCategory(name)).id);
  }

  const tx = await db.transaction("write");
  try {
    if (isUpdate) {
      await tx.execute({
        sql: `UPDATE products SET brand=?, name=?, position=?, updated_at=?,
          odoo_product_id=CASE WHEN odoo_product_id=? THEN NULL ELSE odoo_product_id END WHERE id=?`,
        args: [input.brand ?? null, input.name, input.position ?? 0, now, input.resolveLegacyOdooProductId ?? null, id],
      });
      // Cascading children — wipe and reinsert
      await tx.batch(
        [
          { sql: "DELETE FROM product_images WHERE product_id = ?", args: [id] },
          { sql: "DELETE FROM price_tiers WHERE product_id = ?", args: [id] },
          { sql: "DELETE FROM variants WHERE product_id = ?", args: [id] },
          { sql: "DELETE FROM product_promotions WHERE product_id = ?", args: [id] },
          { sql: "DELETE FROM product_categories WHERE product_id = ?", args: [id] },
        ],
      );
    } else {
      await tx.execute({
        sql: `INSERT INTO products (id, brand, name, position, odoo_product_id) VALUES (?, ?, ?, ?, ?)`,
        args: [id, input.brand ?? null, input.name, input.position ?? 0, null],
      });
    }

    for (const categoryId of categoryIds) {
      await tx.execute({
        sql: `INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)`,
        args: [id, categoryId],
      });
    }

    // Top-level images
    const imageUrls = input.imageUrls ?? [];
    for (let i = 0; i < imageUrls.length; i++) {
      await tx.execute({
        sql: `INSERT INTO product_images (product_id, variant_id, url, position) VALUES (?, NULL, ?, ?)`,
        args: [id, imageUrls[i], i],
      });
    }

    // Top-level price tiers
    const topTiers = input.priceTiers ?? [];
    for (let i = 0; i < topTiers.length; i++) {
      const t = topTiers[i];
      await tx.execute({
        sql: `INSERT INTO price_tiers (product_id, variant_id, min_quantity, price_per_unit, position) VALUES (?, NULL, ?, ?, ?)`,
        args: [id, t.minQuantity, t.pricePerUnit, i],
      });
    }

    // Variants with their images + tiers
    const variants = input.variants ?? [];
    for (let vi = 0; vi < variants.length; vi++) {
      const v = variants[vi];
      const vid = v.id?.trim() || `${id}-var-${vi + 1}-${Date.now().toString(36)}`;
      await tx.execute({
        sql: `INSERT INTO variants (id, product_id, name, position, odoo_product_id) VALUES (?, ?, ?, ?, ?)`,
        args: [vid, id, v.name, vi, v.odooProductId ?? null],
      });
      const imgs = v.imageUrls ?? [];
      for (let i = 0; i < imgs.length; i++) {
        await tx.execute({
          sql: `INSERT INTO product_images (product_id, variant_id, url, position) VALUES (?, ?, ?, ?)`,
          args: [id, vid, imgs[i], i],
        });
      }
      const tiers = v.priceTiers ?? [];
      for (let i = 0; i < tiers.length; i++) {
        const t = tiers[i];
        await tx.execute({
          sql: `INSERT INTO price_tiers (product_id, variant_id, min_quantity, price_per_unit, position) VALUES (?, ?, ?, ?, ?)`,
          args: [id, vid, t.minQuantity, t.pricePerUnit, i],
        });
      }
    }

    // Promotion links
    const promotionIds = input.promotionIds ?? [];
    for (const pid of promotionIds) {
      await tx.execute({
        sql: `INSERT OR IGNORE INTO product_promotions (product_id, promotion_id) VALUES (?, ?)`,
        args: [id, pid],
      });
    }
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}

export async function deleteProduct(id: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM products WHERE id = ?", args: [id] });
}

// ----- Promotions -----

export type PromotionInput = {
  id?: string;
  title: string;
  totalPrice?: number;
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
  const derivedTotal = promotionComponentTotal(input.items);
  validatePromotion({title:input.title,totalPrice:input.totalPrice ?? derivedTotal,items:input.items.map(i => ({...i,id:i.itemId,name:i.itemName}))});
  if (isUpdate) {
    await db.execute({
      sql: `UPDATE promotions SET title=?, total_price=?, is_promo=?, position=? WHERE id=?`,
      args: [
        input.title,
        derivedTotal,
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
        derivedTotal,
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
