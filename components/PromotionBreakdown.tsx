"use client";

import type { CartItem, CrossPromotion, Product, Variant } from "@/types";
import { useProductsStore } from "@/store/productsStore";
import { resolvePromotionProduct } from "@/lib/promotionProducts";
import { expandComboRows } from "@/lib/comboRows";

const money = (value: number) => `$${value.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;

function concreteProduct(products: Product[], id: string | number): Product | Variant | undefined {
  return products.flatMap<Product | Variant>((product) => product.variants?.length ? product.variants : [product])
    .find((product) => String(product.id) === String(id));
}

// Match the catalog's quantity-tier lookup for one combo's required units.
// Manual cart adjustments and the number of combo repetitions do not apply.
function unitPriceForQuantity(product: Product | Variant | undefined, quantity: number): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const tiers = [...(product?.priceTiers ?? [])].sort((a, b) => a.minQuantity - b.minQuantity);
  let price: number | null = null;
  for (const tier of tiers) {
    if (tier.minQuantity <= quantity) {
      price = Number.isFinite(tier.pricePerUnit) && tier.pricePerUnit >= 0 ? tier.pricePerUnit : null;
    }
  }
  return price;
}

type Component = { name: string; quantity: number; price: number | null };

export function PromotionBreakdown({ item, promotion }: { item?: CartItem; promotion?: CrossPromotion }) {
  const products = useProductsStore((state) => state.products);
  let groups: Component[][];
  if (item) {
    // Aggregate row contents are display totals. Parts retain exact quantities
    // per repetition; never divide or average different variant compositions.
    const compositions = new Map<string, CartItem>();
    expandComboRows([item]).forEach((part) => {
      const key = JSON.stringify(part.includedItems?.map((included) => [included.id, included.quantity]).sort());
      if (!compositions.has(key)) compositions.set(key, part);
    });
    groups = [...compositions.values()].map((part) => (part.includedItems ?? []).map((included) => ({
      name: included.name, quantity: included.quantity,
      price: unitPriceForQuantity(concreteProduct(products, included.id) ?? included, included.quantity),
    })));
  } else {
    groups = [(promotion?.items ?? []).map((requirement) => {
      const product = (!requirement.matchBy ? concreteProduct(products, requirement.id) : undefined)
        ?? resolvePromotionProduct(products, requirement.name)?.variant;
      return { name: product?.name ?? requirement.name, quantity: requirement.quantity, price: unitPriceForQuantity(product, requirement.quantity) };
    })];
  }

  return (
    <div className="space-y-3 border-t border-border pt-3 text-sm text-text-secondary">
      {groups.map((components, index) => {
        const complete = components.length > 0 && components.every((component) => component.price !== null &&
          Number.isFinite(component.quantity) && component.quantity > 0);
        const total = complete ? components.reduce((sum, component) => sum + component.quantity * component.price!, 0) : null;
        return (
          <div key={index} className="space-y-1">
            <p className="font-medium">Valores por combo{groups.length > 1 ? ` · composición ${index + 1}` : ""}.</p>
            <ul className="space-y-1">
              {components.map((component, componentIndex) => (
                <li key={componentIndex}>
                  {component.quantity} × {component.name} — {component.price !== null
                    ? `${money(component.price)} c/u — ${money(component.quantity * component.price)}`
                    : "Precio por cantidad no disponible"}
                </li>
              ))}
            </ul>
            <p className="font-semibold text-text-primary">Sin promo: {total !== null ? money(total) : "No disponible"}</p>
          </div>
        );
      })}
    </div>
  );
}
