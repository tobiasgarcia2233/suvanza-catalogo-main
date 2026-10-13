"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import type { SalesEventSummary } from "@/lib/eventQueries";
import SearchBox from "./SearchBox";

function formatRange(start: string | null, end: string | null) {
  const fmt = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  if (start && end) return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
  if (start) return `Desde ${fmt(start)}`;
  if (end) return `Hasta ${fmt(end)}`;
  return "—";
}

export default function EventsTable({ events }: { events: SalesEventSummary[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return events;
    return events.filter((e) => `${e.name} ${e.slug}`.toLowerCase().includes(query));
  }, [events, q]);

  return (
    <div className="flex flex-col gap-3">
      <SearchBox
        value={q}
        onChange={setQ}
        placeholder="Buscar evento..."
        className="max-w-md"
      />

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="text-left py-2 px-4">Evento</th>
              <th className="text-left py-2 px-4">Fechas</th>
              <th className="text-left py-2 px-4">Estado</th>
              <th className="text-right py-2 px-4">Vendedoras</th>
              <th className="text-right py-2 px-4">Productos</th>
              <th className="text-right py-2 px-4">Promos</th>
              <th className="text-right py-2 px-4">Carros</th>
              <th className="text-right py-2 px-4">Monto</th>
              <th className="text-right py-2 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-gray-100 last:border-0">
                <td className="py-2 px-4">
                  <p className="font-medium">{e.name}</p>
                  <code className="text-xs text-gray-500">{e.slug}</code>
                </td>
                <td className="py-2 px-4 text-gray-600 whitespace-nowrap">
                  {formatRange(e.starts_at, e.ends_at)}
                </td>
                <td className="py-2 px-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {e.status === "active" ? "Abierto" : "Cerrado"}
                  </span>
                </td>
                <td className="py-2 px-4 text-right tabular-nums">{e.sellerCount}</td>
                <td className="py-2 px-4 text-right tabular-nums">{e.productCount}</td>
                <td className="py-2 px-4 text-right tabular-nums">{e.promotionCount}</td>
                <td className="py-2 px-4 text-right tabular-nums">{e.salesCount}</td>
                <td className="py-2 px-4 text-right tabular-nums whitespace-nowrap">
                  ${e.salesTotal.toLocaleString("es-AR")}
                </td>
                <td className="py-2 px-4 text-right">
                  <Link
                    href={`/admin/events/${e.id}`}
                    className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900"
                  >
                    <Pencil size={14} /> Editar
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-gray-500">
                  {q
                    ? "No se encontraron eventos para esa búsqueda."
                    : "Todavía no hay eventos."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
