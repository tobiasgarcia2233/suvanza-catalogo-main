import type { Product, Variant } from "@/types";

// Shared with explicit promotion purchases: preserve the existing resolver.
export function resolvePromotionProduct(
  products: Product[], itemName: string,
): { parentProduct: Product; variant: Variant } | null {
  const lowerItemName = itemName.toLowerCase();
  for (const product of products) {
    if (product.brand?.toLowerCase() === lowerItemName) {
      if (product.variants && product.variants.length > 0) {
        return { parentProduct: product, variant: product.variants[0] };
      }
    }
    if (product.variants) {
      for (const variant of product.variants) {
        if (
          product.name.toLowerCase() === lowerItemName ||
          variant.name.toLowerCase() === lowerItemName
        ) {
          return { parentProduct: product, variant: variant };
        }
      }
    }
  }
  return null;
}
