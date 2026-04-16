"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CrossPromotion } from "@/types";
import { Pencil } from "lucide-react";
import SearchBox from "./SearchBox";

export default function PromotionsTable({
  promotions,
}: {
  promotions: CrossPromotion[];
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return promotions;
    return promotions.filter((p) => {
      const hay = [p.title, ...p.items.map((it) => it.name)]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [promotions, q]);

  return (
    <div className="flex flex-col gap-3">
      <SearchBox
        value={q}
        onChange={setQ}
        placeholder="Buscar por título o producto incluido..."
        className="max-w-md"
      />

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="text-left py-2 px-4">Título</th>
              <th className="text-left py-2 px-4">Ítems</th>
              <th className="text-right py-2 px-4">Precio</th>
              <th className="text-right py-2 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-gray-100 last:border-0">
                <td className="py-2 px-4 font-medium">{p.title}</td>
                <td className="py-2 px-4 text-gray-600">
                  {p.items.map((it) => `${it.quantity}x ${it.name}`).join(", ")}
                </td>
                <td className="py-2 px-4 text-right">
                  ${p.totalPrice.toLocaleString("es-AR")}
                </td>
                <td className="py-2 px-4 text-right">
                  <Link
                    href={`/admin/promotions/${encodeURIComponent(p.id)}`}
                    className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900"
                  >
                    <Pencil size={14} /> Editar
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  {q
                    ? "No se encontraron promociones para esa búsqueda."
                    : "Todavía no hay promociones."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
