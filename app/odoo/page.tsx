import { readSessionFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchOrdersForOdoo } from "@/lib/orderQueries";
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
  }>;
}) {
  const session = await readSessionFromCookie();
  if (!session) redirect("/?next=/odoo");

  const { includeTransferred, startDate, endDate } = await searchParams;
  const orders = await fetchOrdersForOdoo({
    includeTransferred: includeTransferred === "1",
    startDate,
    endDate,
  });

  return (
    <OdooPageClient
      orders={orders}
      includeTransferred={includeTransferred === "1"}
      startDate={startDate ?? ""}
      endDate={endDate ?? ""}
    />
  );
}
