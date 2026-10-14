import { notFound } from "next/navigation";
import SellerPageClient from "../SellerPageClient";
import {
  getCachedProducts,
  getCachedPromotions,
  getCachedCategories,
  getCachedSellerBySlug,
  getCachedEventBySlug,
} from "@/lib/catalogCache";

// ISR: catalog and event come from the shared cache, rebuilt on demand when
// the admin edits the catalog (revalidateCatalog) or an event
// (revalidateEvents) — plus an hourly safety net.
export const revalidate = 3600;
export const dynamicParams = true;

// Rendered on first visit per seller + event, then cached.
export async function generateStaticParams() {
  return [];
}

export default async function SellerEventPage({
  params,
}: {
  params: Promise<{ seller_name: string; event_slug: string }>;
}) {
  const { seller_name, event_slug } = await params;

  const [seller, event] = await Promise.all([
    getCachedSellerBySlug(seller_name),
    getCachedEventBySlug(event_slug),
  ]);
  if (!seller || !event || !event.sellerIds.includes(seller.id)) notFound();

  const [allProducts, allPromotions, allCategories] = await Promise.all([
    getCachedProducts(),
    getCachedPromotions(),
    getCachedCategories(),
  ]);

  // The event's catalog: only what the admin picked. Prices stay the
  // product's / promo's own.
  const productIds = new Set(event.productIds);
  const promotionIds = new Set(event.promotionIds);
  const products = allProducts
    .filter((p) => productIds.has(String(p.id)))
    // A product card suggests its promos: only those of the event.
    .map((p) => ({
      ...p,
      crossProductPromotions: p.crossProductPromotions?.filter((cp) =>
        promotionIds.has(cp.id),
      ),
    }));
  const promotions = allPromotions.filter((p) => promotionIds.has(p.id));
  const usedCategories = new Set(products.flatMap((p) => p.categoryIds ?? []));
  const categories = allCategories.filter((c) => usedCategories.has(c.id));

  return (
    <SellerPageClient
      sellerName={seller.name}
      sellerSlug={seller.slug}
      context={{
        key: event.id,
        eventId: event.id,
        title: event.name,
        closed: event.status !== "active",
      }}
      products={products}
      promotions={promotions}
      categories={categories}
    />
  );
}
