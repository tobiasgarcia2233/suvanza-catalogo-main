import { notFound } from "next/navigation";
import SellerPageClient from "./SellerPageClient";
import { getAllProducts, getAllPromotions } from "@/lib/productQueries";
import { getSellerBySlug } from "@/lib/sellerQueries";

export const dynamic = "force-dynamic";

export default async function SellerPage({
  params,
}: {
  params: Promise<{ seller_name: string }>;
}) {
  const { seller_name } = await params;

  const seller = await getSellerBySlug(seller_name);
  if (!seller) notFound();

  const [products, promotions] = await Promise.all([
    getAllProducts(),
    getAllPromotions(),
  ]);

  return (
    <SellerPageClient
      sellerName={seller.name}
      sellerSlug={seller.slug}
      products={products}
      promotions={promotions}
    />
  );
}
