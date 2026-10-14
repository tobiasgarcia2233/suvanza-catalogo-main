import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, ChevronLeft } from "lucide-react";
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
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Editar evento</h1>
            <p className="text-sm text-gray-500">{event.name}</p>
          </div>
          <Link
            href={`/admin/events/${event.id}/stats`}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            <BarChart3 size={14} /> Ver métricas
          </Link>
        </div>
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
