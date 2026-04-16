import Link from "next/link";
import { getAllProducts } from "@/lib/productQueries";
import PromotionForm from "@/components/admin/PromotionForm";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewPromotionPage() {
  const products = await getAllProducts();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/promotions"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft size={14} /> Volver
        </Link>
        <h1 className="text-2xl font-bold mt-2">Nueva promoción</h1>
      </div>
      <PromotionForm products={products} />
    </div>
  );
}
