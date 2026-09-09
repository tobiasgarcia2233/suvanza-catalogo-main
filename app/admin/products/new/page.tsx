import Link from "next/link";
import { getAllPromotions } from "@/lib/productQueries";
import { getAllCategories } from "@/lib/categoryQueries";
import ProductForm from "@/components/admin/ProductForm";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [promotions, categories] = await Promise.all([
    getAllPromotions(),
    getAllCategories(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft size={14} /> Volver
        </Link>
        <h1 className="text-2xl font-bold mt-2">Nuevo producto</h1>
      </div>
      <ProductForm promotions={promotions} categories={categories} />
    </div>
  );
}
