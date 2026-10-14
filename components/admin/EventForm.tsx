"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, LockOpen, Plus, TriangleAlert } from "lucide-react";
import type { CrossPromotion, Product } from "@/types";
import type { SalesEventDetail } from "@/lib/eventQueries";
import type { Seller } from "@/lib/sellerQueries";
import { slugify } from "@/lib/slug";
import { missingRequirements } from "@/lib/eventPromotionCoverage";
import { useUIStore } from "@/store/uiStore";
import SearchBox from "./SearchBox";

type FormState = {
  name: string;
  slug: string;
  /** Once the admin edits the slug by hand it stops following the name. */
  slugTouched: boolean;
  starts_at: string;
  ends_at: string;
  sellerIds: Set<string>;
  productIds: Set<string>;
  promotionIds: Set<string>;
};

export default function EventForm({
  event,
  sellers,
  products,
  promotions,
}: {
  event?: SalesEventDetail;
  sellers: Seller[];
  products: Product[];
  promotions: CrossPromotion[];
}) {
  const router = useRouter();
  const { openConfirmationModal } = useUIStore();
  const isEdit = !!event;
  const [state, setState] = useState<FormState>(() => {
    // Drop links to rows deleted since the event was saved.
    const keep = (ids: string[] | undefined, valid: string[]) => {
      const set = new Set(valid);
      return new Set((ids ?? []).filter((id) => set.has(id)));
    };
    return {
      name: event?.name ?? "",
      slug: event?.slug ?? "",
      slugTouched: isEdit,
      starts_at: event?.starts_at ?? "",
      ends_at: event?.ends_at ?? "",
      sellerIds: keep(event?.sellerIds, sellers.map((s) => s.id)),
      productIds: keep(event?.productIds, products.map((p) => String(p.id))),
      promotionIds: keep(event?.promotionIds, promotions.map((p) => p.id)),
    };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = state.slugTouched ? state.slug : slugify(state.name);

  const productLabel = (p: Product) => (p.brand ? `${p.brand} — ${p.name}` : p.name);

  const missingByPromo = useMemo(() => {
    const out = new Map<string, ReturnType<typeof missingRequirements>>();
    for (const promo of promotions) {
      if (!state.promotionIds.has(promo.id)) continue;
      const missing = missingRequirements(promo, products, state.productIds);
      if (missing.length > 0) out.set(promo.id, missing);
    }
    return out;
  }, [promotions, products, state.promotionIds, state.productIds]);

  function setIds(key: "sellerIds" | "productIds" | "promotionIds", ids: Set<string>) {
    setState((s) => ({ ...s, [key]: ids }));
  }

  function addMissingProducts(promoIds: string[]) {
    setState((s) => {
      const next = new Set(s.productIds);
      for (const promoId of promoIds) {
        for (const m of missingByPromo.get(promoId) ?? []) {
          for (const p of m.candidates) next.add(String(p.id));
        }
      }
      return { ...s, productIds: next };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(isEdit ? `/api/events/${event!.id}` : "/api/events", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name.trim(),
          slug,
          starts_at: state.starts_at || null,
          ends_at: state.ends_at || null,
          sellerIds: [...state.sellerIds],
          productIds: [...state.productIds],
          promotionIds: [...state.promotionIds],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Error al guardar");
      }
      router.push("/admin/events");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  function onToggleStatus() {
    if (!event) return;
    const closing = event.status === "active";
    openConfirmationModal({
      title: closing ? "Cerrar evento" : "Reabrir evento",
      message: closing
        ? `¿Cerrar "${event.name}"? Ya no se van a poder cargar ni editar ventas en este evento.`
        : `¿Reabrir "${event.name}"? Se va a poder volver a vender en este evento.`,
      onConfirm: async () => {
        setBusy(true);
        setError(null);
        try {
          const res = await fetch(`/api/events/${event.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: closing ? "closed" : "active" }),
          });
          if (!res.ok) throw new Error("No se pudo actualizar el estado.");
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  function onDelete() {
    if (!event) return;
    openConfirmationModal({
      title: "Eliminar evento",
      message: `¿Eliminar "${event.name}"? Solo se puede si todavía no tiene pedidos.`,
      onConfirm: async () => {
        setBusy(true);
        setError(null);
        try {
          const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message ?? "No se pudo eliminar.");
          }
          router.push("/admin/events");
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error");
          setBusy(false);
        }
      },
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {isEdit && (
        <section
          className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 ${
            event!.status === "active"
              ? "bg-green-50 border-green-200"
              : "bg-gray-100 border-gray-200"
          }`}
        >
          <div className="text-sm">
            <p className="font-semibold">
              {event!.status === "active" ? "Evento abierto" : "Evento cerrado"}
            </p>
            <p className="text-gray-600">
              {event!.status === "active"
                ? "Se pueden cargar ventas desde los links del equipo asignado."
                : `Cerrado el ${new Date(event!.closed_at ?? "").toLocaleDateString("es-AR")}. No se pueden cargar ni editar ventas.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleStatus}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            {event!.status === "active" ? (
              <>
                <Lock size={14} /> Cerrar evento
              </>
            ) : (
              <>
                <LockOpen size={14} /> Reabrir evento
              </>
            )}
          </button>
        </section>
      )}

      <section className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-4">
        <h2 className="font-semibold">Datos del evento</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col text-sm">
            <span className="text-gray-600">Nombre</span>
            <input
              required
              value={state.name}
              onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
              placeholder="Ej: Expo Suvanza 2026"
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="text-gray-600">Slug (link del evento)</span>
            <input
              required
              value={slug}
              onChange={(e) =>
                setState((s) => ({ ...s, slug: e.target.value, slugTouched: true }))
              }
              className="rounded border border-gray-300 px-3 py-2 font-mono text-xs"
            />
            <span className="mt-1 text-xs text-gray-500">
              Se ve en <code>/link-de-venta/{slugify(slug) || "…"}</code>
            </span>
          </label>
          <label className="flex flex-col text-sm">
            <span className="text-gray-600">Inicio (opcional)</span>
            <input
              type="date"
              value={state.starts_at}
              onChange={(e) => setState((s) => ({ ...s, starts_at: e.target.value }))}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="text-gray-600">Fin (opcional)</span>
            <input
              type="date"
              value={state.ends_at}
              onChange={(e) => setState((s) => ({ ...s, ends_at: e.target.value }))}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
        </div>
        <p className="text-xs text-gray-500">
          Las fechas son informativas: el evento se cierra solo cuando lo cerrás a mano.
        </p>
      </section>

      <SelectionSection
        title="Equipo de ventas"
        items={sellers.map((s) => ({ id: s.id, label: s.name, hint: `/${s.slug}` }))}
        selected={state.sellerIds}
        onChange={(ids) => setIds("sellerIds", ids)}
        searchPlaceholder="Buscar por nombre..."
      />

      <SelectionSection
        title="Productos"
        items={products.map((p) => ({ id: String(p.id), label: productLabel(p) }))}
        selected={state.productIds}
        onChange={(ids) => setIds("productIds", ids)}
        searchPlaceholder="Buscar por marca o nombre..."
      />

      <SelectionSection
        title="Promociones"
        items={promotions.map((p) => ({
          id: p.id,
          label: p.title,
          hint: `$${p.totalPrice.toLocaleString("es-AR")}`,
        }))}
        selected={state.promotionIds}
        onChange={(ids) => setIds("promotionIds", ids)}
        searchPlaceholder="Buscar promoción..."
        header={
          missingByPromo.size > 0 && (
            <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-start gap-2">
                  <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                  {missingByPromo.size === 1
                    ? "1 promoción usa productos que no están en el evento: no se va a poder armar."
                    : `${missingByPromo.size} promociones usan productos que no están en el evento: no se van a poder armar.`}
                </p>
                <button
                  type="button"
                  onClick={() => addMissingProducts([...missingByPromo.keys()])}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  <Plus size={12} /> Agregar productos faltantes
                </button>
              </div>
              <ul className="flex flex-col gap-1 pl-6 text-xs">
                {[...missingByPromo.entries()].map(([promoId, missing]) => (
                  <li key={promoId}>
                    <span className="font-semibold">
                      {promotions.find((p) => p.id === promoId)?.title}
                    </span>
                    {": falta "}
                    {missing
                      .map((m) =>
                        m.candidates.length > 0
                          ? m.candidates.map(productLabel).join(" o ")
                          : `${m.row.name} (no existe en el catálogo)`,
                      )
                      .join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )
        }
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2 text-white font-semibold disabled:opacity-50"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          {busy ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear evento"}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="rounded-md border border-red-600 text-red-600 px-5 py-2 font-semibold hover:bg-red-50 disabled:opacity-50"
          >
            Eliminar
          </button>
        )}
      </div>
    </form>
  );
}

function SelectionSection({
  title,
  items,
  selected,
  onChange,
  searchPlaceholder,
  header,
}: {
  title: string;
  items: { id: string; label: string; hint?: string }[];
  selected: Set<string>;
  onChange: (ids: Set<string>) => void;
  searchPlaceholder: string;
  header?: React.ReactNode;
}) {
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((it) =>
      `${it.label} ${it.hint ?? ""}`.toLowerCase().includes(query),
    );
  }, [items, q]);

  const allVisibleSelected =
    visible.length > 0 && visible.every((it) => selected.has(it.id));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  // "Select all" acts on what the search shows, so the admin can filter by
  // brand and add the whole line in one click.
  function toggleVisible() {
    const next = new Set(selected);
    for (const it of visible) {
      if (allVisibleSelected) next.delete(it.id);
      else next.add(it.id);
    }
    onChange(next);
  }

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">
          {title}{" "}
          <span className="text-sm font-normal text-gray-500">
            ({selected.size} de {items.length})
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder={searchPlaceholder}
            className="w-64 max-w-full"
          />
          <button
            type="button"
            onClick={toggleVisible}
            disabled={visible.length === 0}
            className="shrink-0 text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            {allVisibleSelected ? "Quitar" : "Seleccionar"} {q.trim() ? "resultados" : "todos"}
          </button>
        </div>
      </div>
      {header}
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No hay nada cargado todavía.</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-500">Sin resultados.</p>
      ) : (
        <div className="grid max-h-80 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
          {visible.map((it) => (
            <label key={it.id} className="inline-flex items-center gap-2 py-1 text-sm">
              <input
                type="checkbox"
                checked={selected.has(it.id)}
                onChange={() => toggle(it.id)}
              />
              <span className="truncate">{it.label}</span>
              {it.hint && <span className="shrink-0 text-xs text-gray-400">{it.hint}</span>}
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
