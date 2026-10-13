import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Lock, ShoppingBag } from "lucide-react";
import {
  getCachedSellerBySlug,
  getCachedSellerEvents,
} from "@/lib/catalogCache";
import { getAllSellers } from "@/lib/sellerQueries";
import { INDIVIDUAL_EVENT_SLUG, type SalesEvent } from "@/lib/eventQueries";

// ISR: the seller's events come from the cache and are rebuilt on demand when
// the admin edits an event (revalidateEvents) — plus an hourly safety net.
export const revalidate = 3600;

// Sellers added after a deploy still work — they render on first visit and are
// cached from then on.
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const sellers = await getAllSellers();
    return sellers.map((s) => ({ seller_name: s.slug }));
  } catch {
    return [];
  }
}

function formatRange(start: string | null, end: string | null) {
  const fmt = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
    });
  if (start && end) return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
  if (start) return `Desde ${fmt(start)}`;
  if (end) return `Hasta ${fmt(end)}`;
  return null;
}

// The seller's home: pick where to sell — "Individual" (full catalog) or one of
// her events.
export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ seller_name: string }>;
}) {
  const { seller_name } = await params;

  const seller = await getCachedSellerBySlug(seller_name);
  if (!seller) notFound();

  const events = await getCachedSellerEvents(seller.id);
  const open = events.filter((e) => e.status === "active");
  const closed = events.filter((e) => e.status !== "active");

  return (
    <div className="bg-[url(/images/Suvanza-back.png)] bg-contain bg-repeat bg-center min-h-[100dvh]">
      <div className="flex flex-col gap-8 mx-auto px-4 sm:px-6 py-8 max-w-3xl">
        <div>
          <p className="text-text-secondary text-sm">Hola,</p>
          <h1 className="font-bold text-text-primary text-3xl">{seller.name}</h1>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-text-secondary text-xs uppercase tracking-wide">
            Eventos abiertos
          </h2>
          {open.length === 0 ? (
            <p className="bg-surface/80 p-4 border border-border border-dashed rounded-xl text-text-secondary text-sm">
              No tenés eventos abiertos en este momento.
            </p>
          ) : (
            open.map((e) => (
              <EventCard key={e.id} sellerSlug={seller.slug} event={e} />
            ))
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-text-secondary text-xs uppercase tracking-wide">
            Fuera de eventos
          </h2>
          <Link
            href={`/${seller.slug}/${INDIVIDUAL_EVENT_SLUG}`}
            className="flex items-center gap-4 bg-surface hover:shadow-md p-4 border border-border rounded-xl transition"
          >
            <ShoppingBag size={24} className="shrink-0 text-brand" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Venta individual</p>
              <p className="text-text-secondary text-sm">
                Catálogo completo, ventas que no pertenecen a ningún evento.
              </p>
            </div>
            <ChevronRight size={20} className="shrink-0 text-text-secondary" />
          </Link>
        </section>

        {closed.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-text-secondary text-xs uppercase tracking-wide">
              Eventos cerrados
            </h2>
            {closed.map((e) => (
              <EventCard key={e.id} sellerSlug={seller.slug} event={e} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function EventCard({ sellerSlug, event }: { sellerSlug: string; event: SalesEvent }) {
  const isOpen = event.status === "active";
  const range = formatRange(event.starts_at, event.ends_at);
  return (
    <Link
      href={`/${sellerSlug}/${event.slug}`}
      className={`flex items-center gap-4 p-4 border rounded-xl transition hover:shadow-md ${
        isOpen ? "bg-surface border-border" : "bg-surface/70 border-border text-text-secondary"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className={`font-semibold ${isOpen ? "text-text-primary" : ""}`}>{event.name}</p>
        <p className="text-sm text-text-secondary">
          {[range, isOpen ? "Abierto" : "Cerrado · solo consulta"].filter(Boolean).join(" · ")}
        </p>
      </div>
      {isOpen ? (
        <ChevronRight size={20} className="shrink-0 text-text-secondary" />
      ) : (
        <Lock size={18} className="shrink-0" />
      )}
    </Link>
  );
}
