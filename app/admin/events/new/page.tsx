import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAllProducts, getAllPromotions } from "@/lib/productQueries";
import { getAllSellers } from "@/lib/sellerQueries";
import EventForm from "@/components/admin/EventForm";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const [sellers, products, promotions] = await Promise.all([
    getAllSellers(),
    getAllProducts(),
    getAllPromotions(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft size={14} /> Volver
        </Link>
        <h1 className="text-2xl font-bold mt-2">Nuevo evento</h1>
      </div>
      <EventForm sellers={sellers} products={products} promotions={promotions} />
    </div>
  );
}
