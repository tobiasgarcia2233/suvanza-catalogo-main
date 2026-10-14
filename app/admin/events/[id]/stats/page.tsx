import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { getEvent } from "@/lib/eventQueries";
import { getAllSellers } from "@/lib/sellerQueries";
import { getContextMetrics } from "@/lib/eventMetrics";
import ContextMetricsView from "@/components/admin/ContextMetricsView";

export const dynamic = "force-dynamic";

export default async function EventStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, sellers] = await Promise.all([
    getEvent(decodeURIComponent(id)),
    getAllSellers(),
  ]);
  if (!event) notFound();

  // Every seller of the event shows up, with or without sales.
  const assigned = new Set(event.sellerIds);
  const metrics = await getContextMetrics(
    event.id,
    sellers.filter((s) => assigned.has(s.id)).map((s) => s.name),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft size={14} /> Eventos
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{event.name}</h1>
          <p className="text-sm text-gray-500">
            {event.status === "active" ? "Abierto" : "Cerrado"} · métricas de ventas
            cobradas
          </p>
        </div>
        <Link
          href={`/admin/events/${event.id}`}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          <Pencil size={14} /> Editar evento
        </Link>
      </div>
      <ContextMetricsView metrics={metrics} />
    </div>
  );
}
