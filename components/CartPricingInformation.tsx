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

export function NearbyVolumeSuggestions({ insights }: { insights: CartPricingInsights }) {
  if (!insights.suggestions.length) return null;
  return (
    <ul aria-label="Sugerencias de precio por cantidad" aria-live="polite" className="space-y-1 text-lg leading-snug text-text-secondary">
      {insights.suggestions.map(({ key, item, additionalQuantity, nextUnitPrice }) => (
        <li key={key}>
          Agregando {additionalQuantity} {additionalQuantity === 1 ? "unidad" : "unidades"} de {item.name}, alcanzás el siguiente precio por cantidad ({money(nextUnitPrice)} por unidad).
        </li>
      ))}
    </ul>
  );
}

export function CartPricingInformation({ items, total }: { items: CartItem[]; total: number }) {
  const insights = useCartPricingInsights(items, total);
  if (!insights.suggestions.length) return null;
  return (
    <div className="mt-4">
      <NearbyVolumeSuggestions insights={insights} />
    </div>
  );
}
