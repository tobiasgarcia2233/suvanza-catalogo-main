import "server-only";
import { db } from "./db";
import type { Product, CrossPromotion, Variant, PriceTier } from "@/types";

type Row = Record<string, unknown>;

function readProduct(row: Row): Product {
  return {
    id: row.id as string,
    brand: (row.brand as string | null) ?? undefined,
    name: row.name as string,
    category: row.category as string,
    description: (row.description as string | null) ?? "",
    priceTiers: [],
    imageUrls: [],
    tags: row.tags
      ? (JSON.parse(row.tags as string) as Product["tags"])
      : undefined,
    variants: [],
    crossProductPromotions: [],
  };
}

function buildPromotions(
  promos: Row[],
  items: Row[],
): Map<string, CrossPromotion> {
  const map = new Map<string, CrossPromotion>();
  for (const p of promos) {
    map.set(p.id as string, {
      id: p.id as string,
      title: p.title as string,
      totalPrice: Number(p.total_price),
      isPromo: !!p.is_promo,
      items: [],
    });
  }
  for (const it of items) {
    const promo = map.get(it.promotion_id as string);
    if (!promo) continue;
    promo.items.push({
      id: it.item_id as string,
      name: it.item_name as string,
      quantity: Number(it.quantity),
      pricePerUnit: Number(it.price_per_unit),
      notes: (it.notes as string | null) ?? undefined,
      matchBy: (it.match_by as string | null) ?? undefined,
      ...(it.brand ? { brand: it.brand as string } : {}),
    });
  }
  return map;
}

export async function getAllProducts(): Promise<Product[]> {
  const [prodRes, varRes, tierRes, imgRes, linksRes, promoRes, promoItemRes] =
    await Promise.all([
      db.execute("SELECT * FROM products ORDER BY position ASC, name ASC"),
      db.execute("SELECT * FROM variants ORDER BY position ASC"),
      db.execute("SELECT * FROM price_tiers ORDER BY position ASC, min_quantity ASC"),
      db.execute("SELECT * FROM product_images ORDER BY position ASC"),
      db.execute("SELECT product_id, promotion_id FROM product_promotions"),
      db.execute("SELECT * FROM promotions ORDER BY position ASC"),
      db.execute("SELECT * FROM promotion_items ORDER BY position ASC"),
    ]);

  const promos = buildPromotions(
    promoRes.rows as unknown as Row[],
    promoItemRes.rows as unknown as Row[],
  );

  const productsMap = new Map<string, Product>();
  for (const row of prodRes.rows as unknown as Row[]) {
    productsMap.set(row.id as string, readProduct(row));
  }

  for (const row of varRes.rows as unknown as Row[]) {
    const p = productsMap.get(row.product_id as string);
    if (!p) continue;
    const v: Variant = {
      id: row.id as string,
      name: row.name as string,
      imageUrls: [],
      priceTiers: [],
    };
    p.variants!.push(v);
  }

  for (const row of imgRes.rows as unknown as Row[]) {
    const p = productsMap.get(row.product_id as string);
    if (!p) continue;
    const url = row.url as string;
    if (row.variant_id) {
      const v = p.variants!.find((x) => x.id === row.variant_id);
      v?.imageUrls!.push(url);
    } else {
      p.imageUrls.push(url);
    }
  }

  for (const row of tierRes.rows as unknown as Row[]) {
    const p = productsMap.get(row.product_id as string);
    if (!p) continue;
    const tier: PriceTier = {
      minQuantity: Number(row.min_quantity),
      pricePerUnit: Number(row.price_per_unit),
      label: (row.label as string | null) ?? undefined,
    };
    if (row.variant_id) {
      const v = p.variants!.find((x) => x.id === row.variant_id);
      v?.priceTiers!.push(tier);
    } else {
      p.priceTiers.push(tier);
    }
  }

  for (const row of linksRes.rows as unknown as Row[]) {
    const p = productsMap.get(row.product_id as string);
    const promo = promos.get(row.promotion_id as string);
    if (p && promo) p.crossProductPromotions!.push(promo);
  }

  return Array.from(productsMap.values());
}

export async function getAllPromotions(): Promise<CrossPromotion[]> {
  const [promoRes, promoItemRes] = await Promise.all([
    db.execute("SELECT * FROM promotions ORDER BY position ASC"),
    db.execute("SELECT * FROM promotion_items ORDER BY position ASC"),
  ]);
  const map = buildPromotions(
    promoRes.rows as unknown as Row[],
    promoItemRes.rows as unknown as Row[],
  );
  return Array.from(map.values());
}

export async function getProduct(id: string): Promise<Product | null> {
  const res = await db.execute({
    sql: "SELECT * FROM products WHERE id = ?",
    args: [id],
  });
  if (res.rows.length === 0) return null;

  const [varRes, tierRes, imgRes, linksRes] = await Promise.all([
    db.execute({
      sql: "SELECT * FROM variants WHERE product_id = ? ORDER BY position ASC",
      args: [id],
    }),
    db.execute({
      sql: "SELECT * FROM price_tiers WHERE product_id = ? ORDER BY position ASC, min_quantity ASC",
      args: [id],
    }),
    db.execute({
      sql: "SELECT * FROM product_images WHERE product_id = ? ORDER BY position ASC",
      args: [id],
    }),
    db.execute({
      sql: "SELECT promotion_id FROM product_promotions WHERE product_id = ?",
      args: [id],
    }),
  ]);

  const product = readProduct(res.rows[0] as unknown as Row);

  for (const row of varRes.rows as unknown as Row[]) {
    product.variants!.push({
      id: row.id as string,
      name: row.name as string,
      imageUrls: [],
      priceTiers: [],
    });
  }
  for (const row of imgRes.rows as unknown as Row[]) {
    const url = row.url as string;
    if (row.variant_id) {
      product.variants!.find((v) => v.id === row.variant_id)?.imageUrls!.push(url);
    } else {
      product.imageUrls.push(url);
    }
  }
  for (const row of tierRes.rows as unknown as Row[]) {
    const tier: PriceTier = {
      minQuantity: Number(row.min_quantity),
      pricePerUnit: Number(row.price_per_unit),
      label: (row.label as string | null) ?? undefined,
    };
    if (row.variant_id) {
      product.variants!
        .find((v) => v.id === row.variant_id)
        ?.priceTiers!.push(tier);
    } else {
      product.priceTiers.push(tier);
    }
  }

  if ((linksRes.rows as unknown as Row[]).length > 0) {
    const promoIds = (linksRes.rows as unknown as Row[]).map(
      (r) => r.promotion_id as string,
    );
    const promos = await getAllPromotions();
    product.crossProductPromotions = promos.filter((p) => promoIds.includes(p.id));
  }

  return product;
}
