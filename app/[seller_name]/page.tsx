import SellerPageClient from "./SellerPageClient";
import { getAllProducts, getAllPromotions } from "@/lib/productQueries";

export const dynamic = "force-dynamic";

export default async function SellerPage({
  params,
}: {
  params: Promise<{ seller_name: string }>;
}) {
  const { seller_name } = await params;
  const sellerName = seller_name.replace(/_/g, " ");

  const [products, promotions] = await Promise.all([
    getAllProducts(),
    getAllPromotions(),
  ]);

  return (
    <SellerPageClient
      sellerName={sellerName}
      products={products}
      promotions={promotions}
    />
  );
}
