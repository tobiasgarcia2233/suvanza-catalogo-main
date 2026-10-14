import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getContextMetrics } from "@/lib/eventMetrics";
import ContextMetricsView from "@/components/admin/ContextMetricsView";

export const dynamic = "force-dynamic";

// Sales outside any event (event_id = NULL), including orders loaded from the
// admin screens.
export default async function IndividualStatsPage() {
  const metrics = await getContextMetrics(null);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft size={14} /> Eventos
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Venta individual</h1>
        <p className="text-sm text-gray-500">
          Ventas cobradas fuera de cualquier evento, de todo el historial.
        </p>
      </div>
      <ContextMetricsView metrics={metrics} />
    </div>
  );
}
