import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getAllProducts, getAllPromotions } from "@/lib/productQueries";
import { getAllSellers } from "@/lib/sellerQueries";
import { getEvent } from "@/lib/eventQueries";
import EventForm from "@/components/admin/EventForm";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, sellers, products, promotions] = await Promise.all([
    getEvent(decodeURIComponent(id)),
    getAllSellers(),
    getAllProducts(),
    getAllPromotions(),
  ]);
  if (!event) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft size={14} /> Volver
        </Link>
        <h1 className="text-2xl font-bold mt-2">Editar evento</h1>
        <p className="text-sm text-gray-500">{event.name}</p>
      </div>
      <EventForm
        event={event}
        sellers={sellers}
        products={products}
        promotions={promotions}
      />
    </div>
  );
}
