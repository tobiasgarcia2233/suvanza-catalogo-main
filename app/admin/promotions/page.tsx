import Link from "next/link";
import { getAllPromotions } from "@/lib/productQueries";
import { Plus } from "lucide-react";
import PromotionsTable from "@/components/admin/PromotionsTable";

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
      <PromotionsTable promotions={promotions} />
    </div>
  );
}
