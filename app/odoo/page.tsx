import { readSessionFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchOrdersForOdoo } from "@/lib/orderQueries";
import { getEventOptions } from "@/lib/eventQueries";
import OdooPageClient from "./OdooPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OdooDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    includeTransferred?: string;
    startDate?: string;
    endDate?: string;
    event?: string;
  }>;
}) {
  const session = await readSessionFromCookie();
  if (!session) redirect("/?next=/odoo");

  const { includeTransferred, startDate, endDate, event } = await searchParams;
  const [orders, events] = await Promise.all([
    fetchOrdersForOdoo({
      includeSent: includeTransferred === "1",
      startDate,
      endDate,
      event,
    }),
    getEventOptions(),
  ]);

  return (
    <OdooPageClient
      orders={orders}
      includeTransferred={includeTransferred === "1"}
      startDate={startDate ?? ""}
      endDate={endDate ?? ""}
      event={event ?? ""}
      events={events}
    />
  );
}
