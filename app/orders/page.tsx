import { redirect } from "next/navigation";
import { readSessionFromCookie } from "@/lib/auth";
import { fetchRecentOrders } from "@/lib/orderQueries";
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

  // Only the orders list is fetched here, so router.refresh() (polling or after
  // creating a sale) stays cheap. The product catalog needed by "Nuevo pedido"
  // is loaded once, client-side, in OrdersPageClient.
  const initialOrders = await fetchRecentOrders(q || "", startDate, endDate);

  return (
    <Suspense fallback={<p className="p-8 text-center">Cargando pedidos...</p>}>
      <OrdersPageClient initialOrders={initialOrders} />
    </Suspense>
  );
}
