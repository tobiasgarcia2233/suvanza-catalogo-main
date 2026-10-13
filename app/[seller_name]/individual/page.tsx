import { notFound } from "next/navigation";
import SellerPageClient from "../SellerPageClient";
import {
  getCachedProducts,
  getCachedPromotions,
  getCachedCategories,
  getCachedSellerBySlug,
} from "@/lib/catalogCache";
import { INDIVIDUAL_EVENT_SLUG } from "@/lib/eventQueries";

// ISR: served from the catalog cache, rebuilt on demand when the admin edits a
// product/promo/category (revalidateCatalog) — plus an hourly safety net.
export const revalidate = 3600;
export const dynamicParams = true;

// Rendered on first visit per seller, then cached.
export async function generateStaticParams() {
  return [];
}

// Sales outside any event: the full catalog, orders with event_id = NULL.
export default async function SellerIndividualPage({
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
      context={{
        key: INDIVIDUAL_EVENT_SLUG,
        eventId: null,
        title: "Venta individual",
        closed: false,
      }}
      products={products}
      promotions={promotions}
      categories={categories}
    />
  );
}
