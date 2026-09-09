"use client";

import { useMemo } from "react";
import type { CartItem } from "@/types";
import { priceCart } from "@/store/cartStore";
import { useProductsStore } from "@/store/productsStore";
import { getCartPricingInsights, type CartPricingInsights } from "@/lib/cartPricingInsights";

const money = (value: number) => `$${value.toLocaleString("es-CL", { maximumFractionDigits: 2 })}`;

export function useCartPricingInsights(items: CartItem[], total: number) {
  const { hydrated, products, promotions } = useProductsStore();
  return useMemo(() => hydrated
    ? getCartPricingInsights(items, total, priceCart)
    : { suggestions: [], limitation: "Cargando los precios para comparar y sugerir cantidades." },
  [items, total, hydrated, products, promotions]);
}

export function ComboPriceComparison({ insights, total }: {
  insights: CartPricingInsights;
  total: number;
}) {
  const comparison = insights.comparison;
  if (!comparison) return null;
  const increase = comparison.difference > 0;
  return (
    <section aria-label="Comparación de precios con y sin combos" aria-live="polite"
      className={`rounded-xl border p-4 text-lg leading-relaxed ${increase ? "border-amber-400 bg-amber-50 text-amber-950" : "border-border bg-surface"}`}>
      <p className="font-bold">Mismos productos, variantes y cantidades</p>
      <dl className="mt-2 space-y-1 text-xl">
        <div className="flex flex-wrap justify-between gap-x-4">
          <dt>Total con combos</dt>
          <dd className="font-bold">{money(total)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-4">
          <dt>Total sin combos</dt><dd className="font-bold">{money(comparison.withoutCombos)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xl font-bold">
        {increase ? `Con estos combos pagás ${money(comparison.difference)} más que sin combos.`
          : comparison.difference < 0 ? `Con estos combos pagás ${money(-comparison.difference)} menos que sin combos.`
          : "El total es igual con esta selección y sin combos."}
      </p>
      {increase && comparison.lostVolumeBrands.length > 0 && (
        <p className="mt-2">Al quedar unidades dentro de combos, baja la cantidad que cuenta para {comparison.lostVolumeBrands.join(", ")} y se pierde precio por volumen en los productos restantes.</p>
      )}
      <p className="mt-2">Usá «Quitar combo» o «Quitar combos» para conservar los productos y pagar el total sin combos.</p>
      {comparison.dropsComboAdjustment && (
        <p className="mt-2">El total sin combos elimina los ajustes manuales del combo y usa los ajustes de sus productos.</p>
      )}
      {comparison.mergesDifferentAdjustments && (
        <p className="mt-2">Sin combos, las unidades de una misma variante se unifican con el ajuste manual de su primera línea.</p>
      )}
    </section>
  );
}

export function NearbyVolumeSuggestions({ insights, items, compact = false }: {
  insights: CartPricingInsights;
  items: CartItem[];
  compact?: boolean;
}) {
  const products = useProductsStore((state) => state.products);
  return (
    <>
      {!compact && insights.limitation && <p className="rounded-lg bg-[#FBF4EF] p-3 text-lg leading-relaxed">{insights.limitation}</p>}
      {insights.suggestions.length > 0 && (
        <section aria-label="Sugerencias de precio por cantidad" className={compact ? "text-lg leading-snug" : "rounded-xl border border-border bg-surface p-4 text-lg leading-relaxed"}>
          {!compact && <>
            <h3 className="text-xl font-bold">Cerca del siguiente precio por cantidad</h3>
            <p className="mt-1">Se suman las unidades de la misma marca fuera de combos. Cada alternativa se calcula por separado.</p>
          </>}
          <ul className={compact ? "space-y-1" : "mt-3 space-y-3"} aria-live="polite">
            {insights.suggestions.map((suggestion) => {
              const { item, additionalQuantity: extra } = suggestion;
              const duplicate = items.some((other, index) => index !== suggestion.lineIndex && other.id === item.id);
              const ambiguousName = items.some((other) => other.id !== item.id && other.name === item.name && other.brand === item.brand);
              const label = `${item.name} (${item.brand}${ambiguousName ? `, variante ${item.id}` : ""})`;
              if (compact) {
                const product = products.find((product) => product.variants?.some((variant) => variant.id === item.id))
                  ?? products.find((product) => product.id === item.id);
                const variant = product?.variants?.find((variant) => variant.id === item.id);
                const name = variant?.name ?? product?.name ?? item.name;
                const context = variant ? product?.name : product?.brand ?? item.brand;
                const displayName = `${name}${context && context !== name ? ` (${context})` : ""}${ambiguousName ? ` · variante ${item.id}` : ""}`;
                return (
                  <li key={suggestion.key}>
                    {extra === 1 ? "Te falta 1 unidad" : "Te faltan 2 unidades"} de {displayName}
                    {duplicate ? `, en la línea de ${item.quantity} unidades a ${money(suggestion.currentUnitPrice)},` : ""} para alcanzar el próximo precio por cantidad.{" "}
                    (Total agregando {extra} {extra === 1 ? "unidad" : "unidades"}: {money(suggestion.total)}).
                  </li>
                );
              }
              return (
                <li key={suggestion.key} className="border-t border-border pt-3">
                  <p className="font-semibold">Agregando {extra} {extra === 1 ? "unidad" : "unidades"} de {label}, alcanzás el siguiente precio por cantidad.</p>
                  {duplicate && <p>En la línea de {item.quantity} unidades a {money(suggestion.currentUnitPrice)} por unidad.</p>}
                  <p>Precio por unidad de esta variante: <strong>{money(suggestion.nextUnitPrice)}</strong> (actual: {money(suggestion.currentUnitPrice)}).</p>
                  <p>Total con {extra === 1 ? "la unidad adicional" : `las ${extra} unidades adicionales`}: <strong>{money(suggestion.total)}</strong>.</p>
                  <p>{suggestion.difference > 0 ? `${money(suggestion.difference)} más que el total actual: baja el precio por unidad, pero aumenta el importe a pagar.`
                    : suggestion.difference < 0 ? `${money(-suggestion.difference)} menos que el total actual, incluyendo las unidades adicionales.`
                    : "El importe a pagar queda igual, incluyendo las unidades adicionales."}</p>
                </li>
              );
            })}
          </ul>
          {!compact && <p className="mt-3">Cada cálculo mantiene los combos actuales. Para agregar unidades, usá los controles de cantidad. Para elegir combos de nuevo, usá el botón de combos disponibles.</p>}
        </section>
      )}
    </>
  );
}

export function CartPricingInformation({ items, total }: { items: CartItem[]; total: number }) {
  const insights = useCartPricingInsights(items, total);
  return (
    <div className="mt-4 space-y-3">
      {items.some((item) => item.isPromo) && <ComboPriceComparison insights={insights} total={total} />}
      <NearbyVolumeSuggestions insights={insights} items={items} />
    </div>
  );
}
