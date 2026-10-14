import { redirect } from "next/navigation";
import { readSessionFromCookie } from "@/lib/auth";
import { fetchRecentOrders, type OrderStatusFilter } from "@/lib/orderQueries";
import { getEventOptions } from "@/lib/eventQueries";
import { OrdersPageClient } from "./OrdersPageClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrdersDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    startDate?: string;
    endDate?: string;
    event?: string;
    status?: string;
  }>;
}) {
  const session = await readSessionFromCookie();
  if (!session) redirect("/?next=/orders");

  const { q, startDate, endDate, event, status } = await searchParams;

  // Only the orders list is fetched here, so router.refresh() (polling or after
  // creating a sale) stays cheap. The product catalog needed by "Nuevo pedido"
  // is loaded once, client-side, in OrdersPageClient.
  const [initialOrders, events] = await Promise.all([
    fetchRecentOrders(q || "", startDate, endDate, {
      event,
      status: status as OrderStatusFilter | undefined,
    }),
    getEventOptions(),
  ]);

  return (
    <Suspense fallback={<p className="p-8 text-center">Cargando pedidos...</p>}>
      <OrdersPageClient initialOrders={initialOrders} events={events} />
    </Suspense>
  );
}
