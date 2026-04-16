import Link from "next/link";
import { getAllProducts } from "@/lib/productQueries";
import { Plus, Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await getAllProducts();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-sm text-gray-500">
            {products.length} producto{products.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-white text-sm font-semibold"
        >
          <Plus size={16} /> Nuevo producto
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="text-left py-2 px-4 w-14"></th>
              <th className="text-left py-2 px-4">Nombre</th>
              <th className="text-left py-2 px-4">Marca</th>
              <th className="text-left py-2 px-4">Categoría</th>
              <th className="text-left py-2 px-4">Variantes</th>
              <th className="text-right py-2 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const thumb = p.variants?.[0]?.imageUrls?.[0] ?? p.imageUrls[0];
              return (
                <tr key={p.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 px-4">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded" />
                    )}
                  </td>
                  <td className="py-2 px-4 font-medium">{p.name}</td>
                  <td className="py-2 px-4 text-gray-600">{p.brand ?? "—"}</td>
                  <td className="py-2 px-4 text-gray-600">{p.category}</td>
                  <td className="py-2 px-4 text-gray-600">
                    {p.variants?.length ?? 0}
                  </td>
                  <td className="py-2 px-4 text-right">
                    <Link
                      href={`/admin/products/${encodeURIComponent(String(p.id))}`}
                      className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900"
                    >
                      <Pencil size={14} /> Editar
                    </Link>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  Todavía no hay productos. Creá el primero.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
