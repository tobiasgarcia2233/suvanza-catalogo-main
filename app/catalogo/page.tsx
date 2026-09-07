import { redirect } from "next/navigation";
import { readSessionFromCookie } from "@/lib/auth";
import { getAllProducts, getAllPromotions } from "@/lib/productQueries";
import CatalogPageClient from "./CatalogPageClient";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const session = await readSessionFromCookie();
  if (!session) redirect("/?next=/catalogo");

  const [products, promotions] = await Promise.all([
    getAllProducts(),
    getAllPromotions(),
  ]);

  return <CatalogPageClient products={products} promotions={promotions} />;
}
