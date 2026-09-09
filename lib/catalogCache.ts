import "server-only";
import { unstable_cache } from "next/cache";
import { getAllProducts, getAllPromotions } from "./productQueries";
import { getAllCategories } from "./categoryQueries";
import { getSellerBySlug } from "./sellerQueries";

/**
 * Cache tags for on-demand revalidation.
 *
 * The seller catalog (`/[seller_name]`, `/catalogo`) barely changes during a
 * sales day, so instead of hitting Turso on every visit we serve a cached copy
 * and bust it explicitly when the admin edits something — see
 * `revalidateCatalog()` / `revalidateSellers()`, called from the mutation API
 * routes. `revalidate: 3600` is only a self-healing safety net for the case
 * where a bust is missed (a migration, a manual DB edit).
 */
export const CATALOG_TAG = "catalog";
export const SELLERS_TAG = "sellers";

const CACHE_TTL_SECONDS = 3600;

export const getCachedProducts = unstable_cache(
  () => getAllProducts(),
  ["catalog:products"],
  { tags: [CATALOG_TAG], revalidate: CACHE_TTL_SECONDS },
);

export const getCachedPromotions = unstable_cache(
  () => getAllPromotions(),
  ["catalog:promotions"],
  { tags: [CATALOG_TAG], revalidate: CACHE_TTL_SECONDS },
);

export const getCachedCategories = unstable_cache(
  () => getAllCategories(),
  ["catalog:categories"],
  { tags: [CATALOG_TAG], revalidate: CACHE_TTL_SECONDS },
);

export function getCachedSellerBySlug(slug: string) {
  return unstable_cache(
    () => getSellerBySlug(slug),
    ["catalog:seller-by-slug", slug],
    { tags: [SELLERS_TAG], revalidate: CACHE_TTL_SECONDS },
  )();
}
