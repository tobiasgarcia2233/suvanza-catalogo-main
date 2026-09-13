import type { Product, Variant } from "@/types";

// Canonical presentation price: the first configured entry, independent of quantity.
export function getBaseUnitPrice(product: Product | Variant): number | undefined {
  return product.priceTiers?.[0]?.pricePerUnit;
}

export function getCatalogStartingPrice(product: Product): number {
  const presentations = product.variants?.length ? product.variants : [product];
  const prices = presentations.map(getBaseUnitPrice)
    .filter((price): price is number => price !== undefined && Number.isFinite(price) && price >= 0);
  return prices.length ? Math.min(...prices) : 0;
}
