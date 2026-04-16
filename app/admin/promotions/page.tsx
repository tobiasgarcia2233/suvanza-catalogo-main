import Link from "next/link";
import { getAllPromotions } from "@/lib/productQueries";
import { Plus, Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  const promotions = await getAllPromotions();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promociones</h1>
          <p className="text-sm text-gray-500">
            {promotions.length} promoción{promotions.length === 1 ? "" : "es"}
          </p>
        </div>
        <Link
          href="/admin/promotions/new"
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-white text-sm font-semibold"
        >
          <Plus size={16} /> Nueva promoción
        </Link>
      </div>

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
            {promotions.map((p) => (
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
            {promotions.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  Todavía no hay promociones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
