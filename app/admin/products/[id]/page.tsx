import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getAllPromotions } from "@/lib/productQueries";
import { getAllCategories } from "@/lib/categoryQueries";
import ProductForm from "@/components/admin/ProductForm";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const [product, promotions, categories] = await Promise.all([
    getProduct(decoded),
    getAllPromotions(),
    getAllCategories(),
  ]);
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft size={14} /> Volver
        </Link>
        <h1 className="text-2xl font-bold mt-2">Editar producto</h1>
        <p className="text-sm text-gray-500">{product.name}</p>
      </div>
      <ProductForm product={product} promotions={promotions} categories={categories} />
    </div>
  );
}
