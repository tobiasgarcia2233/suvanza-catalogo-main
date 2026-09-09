"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, Variant, CrossPromotion, Category } from "@/types";
import ImageUpload from "./ImageUpload";
import PriceTiersEditor from "./PriceTiersEditor";
import SearchBox from "./SearchBox";
import Combobox from "./Combobox";
import CategoryManager from "./CategoryManager";
import { Plus, Trash2, Loader2, X } from "lucide-react";
import { useMemo } from "react";

function emptyVariant(): Variant {
  return { id: "", name: "", imageUrls: [], priceTiers: [] };
}

type FormState = {
  id: string;
  brand: string;
  name: string;
  categories: string[];
  imageUrls: string[];
  priceTiers: Product["priceTiers"];
  variants: Variant[];
  promotionIds: string[];
};

function initial(product?: Product): FormState {
  const variants =
    product?.variants?.map((v) => ({
      id: v.id,
      name: v.name,
      imageUrls: v.imageUrls ?? [],
      priceTiers: v.priceTiers ?? [],
    })) ?? [];
  return {
    id: product ? String(product.id) : "",
    brand: product?.brand ?? "",
    name: product?.name ?? "",
    categories: product?.categoryNames ?? [],
    imageUrls: product?.imageUrls ?? [],
    priceTiers: product?.priceTiers ?? [],
    variants: variants.length > 0 ? variants : [emptyVariant()],
    promotionIds: (product?.crossProductPromotions ?? []).map((p) => p.id),
  };
}

export default function ProductForm({
  product,
  promotions,
  categories,
}: {
  product?: Product;
  promotions: CrossPromotion[];
  categories: Category[];
}) {
  const router = useRouter();
  const isEdit = !!product;
  const [state, setState] = useState<FormState>(initial(product));
  const [cats, setCats] = useState<Category[]>(categories);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoQuery, setPromoQuery] = useState("");

  const categoryOptions = useMemo(
    () =>
      cats
        .filter(
          (c) =>
            !state.categories.some(
              (sel) => sel.toLowerCase() === c.name.toLowerCase(),
            ),
        )
        .map((c) => ({ value: c.name, label: c.name })),
    [cats, state.categories],
  );

  const filteredPromotions = useMemo(() => {
    const q = promoQuery.trim().toLowerCase();
    if (!q) return promotions;
    return promotions.filter((p) => {
      const hay = [p.title, ...p.items.map((it) => it.name)]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [promoQuery, promotions]);

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setState((s) => ({ ...s, [key]: val }));
  }

  function updateVariant(i: number, patch: Partial<Variant>) {
    setState((s) => ({
      ...s,
      variants: s.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)),
    }));
  }
  function addVariant() {
    setState((s) => ({ ...s, variants: [...s.variants, emptyVariant()] }));
  }
  function removeVariant(i: number) {
    setState((s) => {
      if (s.variants.length <= 1) return s;
      return { ...s, variants: s.variants.filter((_, idx) => idx !== i) };
    });
  }
  function addCategory(name: string) {
    const n = name.trim();
    if (!n) return;
    setState((s) =>
      s.categories.some((c) => c.toLowerCase() === n.toLowerCase())
        ? s
        : { ...s, categories: [...s.categories, n] },
    );
  }
  function removeCategory(name: string) {
    setState((s) => ({
      ...s,
      categories: s.categories.filter((c) => c !== name),
    }));
  }
  function togglePromotion(id: string) {
    setState((s) => ({
      ...s,
      promotionIds: s.promotionIds.includes(id)
        ? s.promotionIds.filter((x) => x !== id)
        : [...s.promotionIds, id],
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = {
        id: state.id || undefined,
        brand: state.brand.trim() || null,
        name: state.name.trim(),
        categories: state.categories,
        imageUrls: state.imageUrls,
        priceTiers: state.priceTiers,
        variants: state.variants,
        promotionIds: state.promotionIds,
      };
      const res = await fetch(
        isEdit
          ? `/api/products/${encodeURIComponent(String(product!.id))}`
          : "/api/products",
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
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!product) return;
    if (!confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`))
      return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/products/${encodeURIComponent(String(product.id))}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("No se pudo eliminar");
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <section className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-4">
        <h2 className="font-semibold">Información general</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col text-sm">
            <span className="text-gray-600">Nombre</span>
            <input
              required
              value={state.name}
              onChange={(e) => setField("name", e.target.value)}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="text-gray-600">Marca</span>
            <input
              value={state.brand}
              onChange={(e) => setField("brand", e.target.value)}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <div className="flex flex-col gap-3 text-sm sm:col-span-2">
            <div className="flex flex-col text-sm sm:max-w-xs">
              <span className="text-gray-600">Categorías</span>
              <Combobox
                value=""
                options={categoryOptions}
                placeholder="— Agregar categoría —"
                customLabel="categoría nueva"
                onChange={(next) => addCategory(next)}
              />
            </div>
            {state.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {state.categories.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-900 py-1 pl-3 pr-1.5 text-xs font-medium text-white"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeCategory(name)}
                      className="rounded-full p-0.5 hover:bg-white/20"
                      aria-label={`Quitar ${name}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <CategoryManager
              categories={cats}
              onChange={setCats}
              onCategoryRenamed={(prev, next) =>
                setState((s) => ({
                  ...s,
                  categories: s.categories.map((c) => (c === prev ? next : c)),
                }))
              }
              onCategoryDeleted={(name) =>
                setState((s) => ({
                  ...s,
                  categories: s.categories.filter((c) => c !== name),
                }))
              }
            />
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-4">
        <h2 className="font-semibold">Imagen del catálogo</h2>
        <p className="text-xs text-gray-500">
          La primera imagen es la que se muestra en la grilla del catálogo.
          Subí varias si querés tener opciones para reordenar.
        </p>
        <ImageUpload
          value={state.imageUrls}
          onChange={(urls) => setField("imageUrls", urls)}
          folder={`suvanza/products/${state.id || "new"}`}
        />
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Variantes</h2>
            <p className="text-xs text-gray-500">
              Cada variante tiene su propio nombre, precios e imágenes de ficha.
            </p>
          </div>
          <button
            type="button"
            onClick={addVariant}
            className="inline-flex items-center gap-1 text-sm rounded-md bg-gray-900 text-white px-3 py-1.5"
          >
            <Plus size={14} /> Agregar variante
          </button>
        </div>
        {state.variants.map((v, i) => {
          const canRemove = state.variants.length > 1;
          return (
            <div
              key={i}
              className="border border-gray-200 rounded-md p-4 flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                  <label className="flex flex-col text-sm">
                    <span className="text-gray-600">Nombre de la variante</span>
                    <input
                      value={v.name}
                      onChange={(e) =>
                        updateVariant(i, { name: e.target.value })
                      }
                      className="rounded border border-gray-300 px-3 py-2"
                    />
                  </label>
                  <label className="flex flex-col text-sm">
                    <span className="text-gray-600">
                      ID (opcional; se genera si se deja vacío)
                    </span>
                    <input
                      value={v.id}
                      onChange={(e) => updateVariant(i, { id: e.target.value })}
                      className="rounded border border-gray-300 px-3 py-2"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => removeVariant(i)}
                  disabled={!canRemove}
                  title={
                    canRemove
                      ? "Eliminar variante"
                      : "Tiene que haber al menos una variante"
                  }
                  className="p-2 text-red-600 hover:bg-red-50 rounded disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-2">Imágenes</p>
                <ImageUpload
                  value={v.imageUrls ?? []}
                  onChange={(urls) => updateVariant(i, { imageUrls: urls })}
                  folder={`suvanza/products/${state.id || "new"}/${v.id || `var-${i + 1}`}`}
                />
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-2">Precios</p>
                <PriceTiersEditor
                  value={v.priceTiers ?? []}
                  onChange={(tiers) => updateVariant(i, { priceTiers: tiers })}
                />
              </div>
            </div>
          );
        })}
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
        <h2 className="font-semibold">Promociones asociadas</h2>
        <p className="text-xs text-gray-500">
          Las promociones que aparecen en la ficha del producto.
        </p>
        {promotions.length === 0 ? (
          <p className="text-sm text-gray-500">
            Todavía no hay promociones. Creá promociones en /admin/promotions.
          </p>
        ) : (
          <>
            <SearchBox
              value={promoQuery}
              onChange={setPromoQuery}
              placeholder="Buscar promoción por título o producto..."
              className="max-w-md"
            />
            <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
              {filteredPromotions.map((p) => (
                <label
                  key={p.id}
                  className="inline-flex items-center gap-2 text-sm py-1"
                >
                  <input
                    type="checkbox"
                    checked={state.promotionIds.includes(p.id)}
                    onChange={() => togglePromotion(p.id)}
                  />
                  <span>{p.title}</span>
                  <span className="text-xs text-gray-500">
                    (${p.totalPrice.toLocaleString("es-AR")})
                  </span>
                </label>
              ))}
              {filteredPromotions.length === 0 && (
                <p className="text-xs text-gray-500 py-2">
                  Sin coincidencias.
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2 text-white font-semibold disabled:opacity-50"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          {busy ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear producto"}
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
