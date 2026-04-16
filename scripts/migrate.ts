import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { realProducts, allCrossPromotions } from "../lib/product-data";
import type { Product, PriceTier, Variant, CrossPromotion } from "../types";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  throw new Error(
    "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (use: node --env-file=.env.local ...)",
  );
}

const db = createClient({ url, authToken });

async function applySchema() {
  const sql = readFileSync(resolve("db/schema.sql"), "utf8");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
  for (const stmt of statements) {
    await db.execute(stmt);
  }
  console.log(`✓ Applied schema (${statements.length} statements)`);
}

async function wipeData() {
  await db.batch(
    [
      "DELETE FROM product_promotions",
      "DELETE FROM promotion_items",
      "DELETE FROM promotions",
      "DELETE FROM price_tiers",
      "DELETE FROM product_images",
      "DELETE FROM variants",
      "DELETE FROM products",
    ],
    "write",
  );
  console.log("✓ Cleared product/promotion tables");
}

async function seedProduct(product: Product, index: number) {
  await db.execute({
    sql: `INSERT INTO products (id, brand, name, category, description, tags, position)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      String(product.id),
      product.brand ?? null,
      product.name,
      product.category,
      product.description ?? null,
      product.tags ? JSON.stringify(product.tags) : null,
      index,
    ],
  });

  // Top-level product images
  for (let i = 0; i < (product.imageUrls ?? []).length; i++) {
    await db.execute({
      sql: `INSERT INTO product_images (product_id, variant_id, url, position)
            VALUES (?, NULL, ?, ?)`,
      args: [String(product.id), product.imageUrls[i], i],
    });
  }

  // Top-level price tiers (products without variants)
  for (let i = 0; i < (product.priceTiers ?? []).length; i++) {
    const t: PriceTier = product.priceTiers[i];
    await db.execute({
      sql: `INSERT INTO price_tiers (product_id, variant_id, min_quantity, price_per_unit, label, position)
            VALUES (?, NULL, ?, ?, ?, ?)`,
      args: [String(product.id), t.minQuantity, t.pricePerUnit, t.label ?? null, i],
    });
  }

  // Variants
  for (let vi = 0; vi < (product.variants ?? []).length; vi++) {
    const v: Variant = product.variants![vi];
    await db.execute({
      sql: `INSERT INTO variants (id, product_id, name, position)
            VALUES (?, ?, ?, ?)`,
      args: [v.id, String(product.id), v.name, vi],
    });
    for (let i = 0; i < (v.imageUrls ?? []).length; i++) {
      await db.execute({
        sql: `INSERT INTO product_images (product_id, variant_id, url, position)
              VALUES (?, ?, ?, ?)`,
        args: [String(product.id), v.id, v.imageUrls![i], i],
      });
    }
    for (let i = 0; i < (v.priceTiers ?? []).length; i++) {
      const t = v.priceTiers![i];
      await db.execute({
        sql: `INSERT INTO price_tiers (product_id, variant_id, min_quantity, price_per_unit, label, position)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [String(product.id), v.id, t.minQuantity, t.pricePerUnit, t.label ?? null, i],
      });
    }
  }
}

async function seedPromotion(promo: CrossPromotion, index: number) {
  await db.execute({
    sql: `INSERT INTO promotions (id, title, total_price, is_promo, position)
          VALUES (?, ?, ?, ?, ?)`,
    args: [promo.id, promo.title, promo.totalPrice, promo.isPromo ? 1 : 0, index],
  });
  for (let i = 0; i < promo.items.length; i++) {
    const it = promo.items[i];
    await db.execute({
      sql: `INSERT INTO promotion_items
              (promotion_id, item_id, item_name, brand, quantity, price_per_unit, notes, match_by, position)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        promo.id,
        it.id,
        it.name,
        // brand lives in items only in one legacy entry; tolerate undefined
        (it as { brand?: string }).brand ?? null,
        it.quantity,
        it.pricePerUnit,
        it.notes ?? null,
        it.matchBy ?? null,
        i,
      ],
    });
  }
}

async function seedProductPromotionLinks() {
  for (const product of realProducts) {
    const promos = product.crossProductPromotions ?? [];
    for (const promo of promos) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO product_promotions (product_id, promotion_id) VALUES (?, ?)`,
        args: [String(product.id), promo.id],
      });
    }
  }
}

async function main() {
  const shouldWipe = process.argv.includes("--wipe");
  await applySchema();
  if (shouldWipe) await wipeData();

  const { rows } = await db.execute("SELECT COUNT(*) AS c FROM products");
  const existing = Number(rows[0]?.c ?? 0);
  if (existing > 0 && !shouldWipe) {
    console.log(`✓ Products already seeded (${existing}). Use --wipe to reseed.`);
    return;
  }

  for (let i = 0; i < allCrossPromotions.length; i++) {
    await seedPromotion(allCrossPromotions[i] as CrossPromotion, i);
  }
  console.log(`✓ Seeded ${allCrossPromotions.length} promotions`);

  for (let i = 0; i < realProducts.length; i++) {
    await seedProduct(realProducts[i], i);
  }
  console.log(`✓ Seeded ${realProducts.length} products`);

  await seedProductPromotionLinks();
  console.log("✓ Linked products ↔ promotions");
}

main()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
