import type { CrossPromotion, Product } from "@/types";

type Requirement = CrossPromotion["items"][number];

/**
 * Products able to fill one promo row, using the same rules the cart uses to
 * build combos (see matchesRequirement in lib/comboSelection.ts): by brand, by
 * brand + name fragment, or by exact product / variant id.
 */
export function requirementCandidates(row: Requirement, products: Product[]): Product[] {
  return products.filter((p) => {
    if (row.matchBy === "brand") return p.brand === row.id;
    if (row.matchBy === "nameContains") {
      return (
        p.brand === row.brand &&
        (p.name.includes(row.id) || !!p.variants?.some((v) => v.name.includes(row.id)))
      );
    }
    return String(p.id) === row.id || !!p.variants?.some((v) => v.id === row.id);
  });
}

export interface MissingRequirement {
  row: Requirement;
  /** Products that would cover the row if added to the event. */
  candidates: Product[];
}

/**
 * Promo rows no product in the event can fill. While any is missing, the
 * combo can't be assembled from the event's catalog.
 */
export function missingRequirements(
  promo: CrossPromotion,
  products: Product[],
  eventProductIds: Set<string>,
): MissingRequirement[] {
  const missing: MissingRequirement[] = [];
  for (const row of promo.items) {
    const candidates = requirementCandidates(row, products);
    if (!candidates.some((p) => eventProductIds.has(String(p.id)))) {
      missing.push({ row, candidates });
    }
  }
  return missing;
}
