import { redirect } from "next/navigation";
import { readSessionFromCookie } from "@/lib/auth";
import {
  getCachedProducts,
  getCachedPromotions,
  getCachedCategories,
} from "@/lib/catalogCache";
import CatalogPageClient from "./CatalogPageClient";

// Session-gated, so it can't be statically cached — but the catalog data is
// still served from the shared on-demand cache (see lib/catalogCache.ts).
export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const session = await readSessionFromCookie();
  if (!session) redirect("/?next=/catalogo");

  const [products, promotions, categories] = await Promise.all([
    getCachedProducts(),
    getCachedPromotions(),
    getCachedCategories(),
  ]);

  return (
    <CatalogPageClient
      products={products}
      promotions={promotions}
      categories={categories}
    />
  );
}
