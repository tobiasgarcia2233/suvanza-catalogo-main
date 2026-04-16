import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllProducts, getAllPromotions } from "@/lib/productQueries";
import PromotionForm from "@/components/admin/PromotionForm";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EditPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const [products, promotions] = await Promise.all([
    getAllProducts(),
    getAllPromotions(),
  ]);
  const promo = promotions.find((p) => p.id === decoded);
  if (!promo) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/promotions"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft size={14} /> Volver
        </Link>
        <h1 className="text-2xl font-bold mt-2">Editar promoción</h1>
        <p className="text-sm text-gray-500">{promo.title}</p>
      </div>
      <PromotionForm promo={promo} products={products} />
    </div>
  );
}
