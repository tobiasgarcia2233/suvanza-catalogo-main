"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CrossPromotion, Product } from "@/types";
import { Plus, Trash2, Loader2 } from "lucide-react";
import Combobox from "./Combobox";

type ItemState = {
  itemId: string;
  itemName: string;
  brand: string;
  quantity: number;
  pricePerUnit: number;
  notes: string;
  matchBy: "" | "brand" | "nameContains";
};

type FormState = {
  id: string;
  title: string;
  totalPrice: number;
  isPromo: boolean;
  items: ItemState[];
  linkedProductIds: string[];
};

function initial(promo?: CrossPromotion): FormState {
  return {
    id: promo?.id ?? "",
    title: promo?.title ?? "",
    totalPrice: promo?.totalPrice ?? 0,
    isPromo: promo?.isPromo ?? true,
    items:
      promo?.items?.map((it) => ({
        itemId: it.id,
        itemName: it.name,
        brand: (it as { brand?: string }).brand ?? "",
        quantity: it.quantity,
        pricePerUnit: it.pricePerUnit,
        notes: it.notes ?? "",
        matchBy: (it.matchBy as ItemState["matchBy"]) ?? "",
      })) ?? [],
    linkedProductIds: [],
  };
}

export default function PromotionForm({
  promo,
  products,
}: {
  promo?: CrossPromotion;
  products: Product[];
}) {
  const router = useRouter();
  const isEdit = !!promo;
  const [state, setState] = useState<FormState>(() => {
    const s = initial(promo);
    if (promo) {
      s.linkedProductIds = products
        .filter((p) =>
          p.crossProductPromotions?.some((cp) => cp.id === promo.id),
        )
        .map((p) => String(p.id));
    }
    return s;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const variantOptions = useMemo(() => {
    const opts: {
      value: string;
      label: string;
      hint?: string;
      brand?: string;
      rawName: string;
    }[] = [];
    for (const p of products) {
      if (p.variants && p.variants.length > 0) {
        for (const v of p.variants) {
          opts.push({
            value: v.id,
            label: v.name,
            hint: p.brand ?? undefined,
            brand: p.brand,
            rawName: v.name,
          });
        }
      } else {
        opts.push({
          value: String(p.id),
          label: p.name,
          hint: p.brand ?? undefined,
          brand: p.brand,
          rawName: p.name,
        });
      }
    }
    return opts;
  }, [products]);

  function updateItem(i: number, patch: Partial<ItemState>) {
    setState((s) => ({
      ...s,
      items: s.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    }));
  }
  function addItem() {
    setState((s) => ({
      ...s,
      items: [
        ...s.items,
        {
          itemId: "",
          itemName: "",
          brand: "",
          quantity: 1,
          pricePerUnit: 0,
          notes: "",
          matchBy: "",
        },
      ],
    }));
  }
  function removeItem(i: number) {
    setState((s) => ({ ...s, items: s.items.filter((_, idx) => idx !== i) }));
  }
  function toggleProduct(id: string) {
    setState((s) => ({
      ...s,
      linkedProductIds: s.linkedProductIds.includes(id)
        ? s.linkedProductIds.filter((x) => x !== id)
        : [...s.linkedProductIds, id],
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = {
        id: state.id || undefined,
        title: state.title.trim(),
        totalPrice: Number(state.totalPrice),
        isPromo: state.isPromo,
        items: state.items.map((it) => ({
          itemId: it.itemId.trim(),
          itemName: it.itemName.trim() || it.itemId.trim(),
          brand: it.brand.trim() || null,
          quantity: Number(it.quantity),
          pricePerUnit: Number(it.pricePerUnit),
          notes: it.notes.trim() || null,
          matchBy: it.matchBy || null,
        })),
        linkedProductIds: state.linkedProductIds,
      };
      const res = await fetch(
        isEdit
          ? `/api/promotions/${encodeURIComponent(promo!.id)}`
          : "/api/promotions",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Error al guardar");
      }
      router.push("/admin/promotions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!promo) return;
    if (!confirm(`¿Eliminar la promoción "${promo.title}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/promotions/${encodeURIComponent(promo.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("No se pudo eliminar");
      router.push("/admin/promotions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <section className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-4">
        <h2 className="font-semibold">Datos de la promoción</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="flex flex-col text-sm">
            <span className="text-gray-600">Título</span>
            <input
              required
              value={state.title}
              onChange={(e) =>
                setState((s) => ({ ...s, title: e.target.value }))
              }
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="text-gray-600">Precio total del combo</span>
            <input
              type="number"
              required
              min={0}
              value={state.totalPrice}
              onChange={(e) =>
                setState((s) => ({ ...s, totalPrice: Number(e.target.value) }))
              }
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input
              type="checkbox"
              checked={state.isPromo}
              onChange={(e) =>
                setState((s) => ({ ...s, isPromo: e.target.checked }))
              }
            />
            <span>Es una promo (se aplica automáticamente)</span>
          </label>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Productos incluidos</h2>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 text-sm rounded-md bg-gray-900 text-white px-3 py-1.5"
          >
            <Plus size={14} /> Agregar ítem
          </button>
        </div>
        {state.items.length === 0 && (
          <p className="text-sm text-gray-500">
            Sin ítems. Agregá al menos uno para que la promo se aplique.
          </p>
        )}
        {state.items.map((it, i) => (
          <div
            key={i}
            className="border border-gray-200 rounded-md p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
          >
            <div className="flex flex-col text-xs md:col-span-4">
              <span className="text-gray-600 mb-1">Producto / Variante</span>
              <Combobox
                value={it.itemId}
                options={variantOptions}
                placeholder="— Elegir o escribir ID manual —"
                onChange={(nextValue, opt) => {
                  updateItem(i, {
                    itemId: nextValue,
                    itemName: opt?.rawName ?? (opt ? opt.label : it.itemName),
                    brand: opt?.brand ?? it.brand,
                  });
                }}
              />
            </div>
            <label className="flex flex-col text-xs md:col-span-3">
              <span className="text-gray-600">Nombre visible</span>
              <input
                value={it.itemName}
                onChange={(e) => updateItem(i, { itemName: e.target.value })}
                className="rounded border border-gray-300 px-2 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col text-xs md:col-span-1">
              <span className="text-gray-600">Cant.</span>
              <input
                type="number"
                min={1}
                value={it.quantity}
                onChange={(e) =>
                  updateItem(i, { quantity: Number(e.target.value) })
                }
                className="rounded border border-gray-300 px-2 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col text-xs md:col-span-2">
              <span className="text-gray-600">Precio unitario</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={it.pricePerUnit}
                onChange={(e) =>
                  updateItem(i, { pricePerUnit: Number(e.target.value) })
                }
                className="rounded border border-gray-300 px-2 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col text-xs md:col-span-2">
              <span className="text-gray-600">Matching</span>
              <select
                value={it.matchBy}
                onChange={(e) =>
                  updateItem(i, {
                    matchBy: e.target.value as ItemState["matchBy"],
                  })
                }
                className="rounded border border-gray-300 px-2 py-2 text-sm bg-white"
              >
                <option value="">Exacto (por ID)</option>
                <option value="brand">Por marca</option>
                <option value="nameContains">Nombre contiene</option>
              </select>
            </label>
            <label className="flex flex-col text-xs md:col-span-4">
              <span className="text-gray-600">Marca (si matching ≠ exacto)</span>
              <input
                value={it.brand}
                onChange={(e) => updateItem(i, { brand: e.target.value })}
                className="rounded border border-gray-300 px-2 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col text-xs md:col-span-7">
              <span className="text-gray-600">Notas</span>
              <input
                value={it.notes}
                onChange={(e) => updateItem(i, { notes: e.target.value })}
                className="rounded border border-gray-300 px-2 py-2 text-sm"
              />
            </label>
            <div className="md:col-span-1 flex justify-end">
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
        <h2 className="font-semibold">Productos que muestran esta promo</h2>
        <p className="text-xs text-gray-500">
          La promo aparece como sugerencia en las fichas de los productos tildados.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {products.map((p) => (
            <label
              key={p.id}
              className="inline-flex items-center gap-2 text-sm py-1"
            >
              <input
                type="checkbox"
                checked={state.linkedProductIds.includes(String(p.id))}
                onChange={() => toggleProduct(String(p.id))}
              />
              <span>
                {p.brand ? <span className="text-gray-500">{p.brand} — </span> : null}
                {p.name}
              </span>
            </label>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2 text-white font-semibold disabled:opacity-50"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          {busy ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear promoción"}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="rounded-md border border-red-600 text-red-600 px-5 py-2 font-semibold hover:bg-red-50"
          >
            Eliminar
          </button>
        )}
      </div>
    </form>
  );
}
