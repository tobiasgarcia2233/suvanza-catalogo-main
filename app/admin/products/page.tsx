import Link from "next/link";
import { getAllProducts } from "@/lib/productQueries";
import { Plus } from "lucide-react";
import ProductsTable from "@/components/admin/ProductsTable";

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
      <ProductsTable products={products} />
    </div>
  );
}
