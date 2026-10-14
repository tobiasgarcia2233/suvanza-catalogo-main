import Link from "next/link";
import { BarChart3, Plus } from "lucide-react";
import { getAllEvents } from "@/lib/eventQueries";
import EventsTable from "@/components/admin/EventsTable";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const events = await getAllEvents();
  const open = events.filter((e) => e.status === "active").length;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Eventos</h1>
          <p className="text-sm text-gray-500">
            {events.length} evento{events.length === 1 ? "" : "s"} · {open} abierto
            {open === 1 ? "" : "s"}. Carros y monto cuentan solo ventas cobradas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/events/individual/stats"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            <BarChart3 size={16} /> Venta individual
          </Link>
          <Link
            href="/admin/events/new"
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-white text-sm font-semibold"
          >
            <Plus size={16} /> Nuevo evento
          </Link>
        </div>
      </div>
      <EventsTable events={events} />
    </div>
  );
}
