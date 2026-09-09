import { notFound } from "next/navigation";
import SellerPageClient from "./SellerPageClient";
import {
  getCachedProducts,
  getCachedPromotions,
  getCachedCategories,
  getCachedSellerBySlug,
} from "@/lib/catalogCache";
import { getAllSellers } from "@/lib/sellerQueries";

// ISR: known sellers are prerendered at build; the catalog is served from cache
// and rebuilt on demand when the admin edits a product/promo/category
// (revalidateCatalog) — plus an hourly safety net. No Turso round-trips on a
// normal visit.
export const revalidate = 3600;

// Sellers added after a deploy still work — they render on first visit and are
// cached from then on.
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const sellers = await getAllSellers();
    return sellers.map((s) => ({ seller_name: s.slug }));
  } catch {
    return [];
  }
}

export default async function SellerPage({
  params,
}: {
  params: Promise<{ seller_name: string }>;
}) {
  const { seller_name } = await params;

  const seller = await getCachedSellerBySlug(seller_name);
  if (!seller) notFound();

  const [products, promotions, categories] = await Promise.all([
    getCachedProducts(),
    getCachedPromotions(),
    getCachedCategories(),
  ]);

  return (
    <SellerPageClient
      sellerName={seller.name}
      sellerSlug={seller.slug}
      products={products}
      promotions={promotions}
      categories={categories}
    />
  );
}
