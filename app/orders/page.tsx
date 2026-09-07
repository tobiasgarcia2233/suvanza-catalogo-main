import { redirect } from "next/navigation";
import { readSessionFromCookie } from "@/lib/auth";
import { fetchRecentOrders } from "@/lib/orderQueries";
import { getAllProducts, getAllPromotions } from "@/lib/productQueries";
import { OrdersPageClient } from "./OrdersPageClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrdersDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; startDate?: string; endDate?: string }>;
}) {
  const session = await readSessionFromCookie();
  if (!session) redirect("/?next=/orders");

  const { q, startDate, endDate } = await searchParams;

  const [initialOrders, products, promotions] = await Promise.all([
    fetchRecentOrders(q || "", startDate, endDate),
    getAllProducts(),
    getAllPromotions(),
  ]);

  return (
    <Suspense fallback={<p className="p-8 text-center">Cargando pedidos...</p>}>
      <OrdersPageClient
        initialOrders={initialOrders}
        products={products}
        promotions={promotions}
      />
    </Suspense>
  );
}
