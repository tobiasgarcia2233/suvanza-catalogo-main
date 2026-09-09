import type { CartItem } from "@/types";

interface PricedCart {
  items: CartItem[];
  total: number;
}

type CalculateCart = (items: CartItem[], combos: boolean) => PricedCart;

export interface VolumeSuggestion {
  key: string;
  item: CartItem;
  lineIndex: number;
  additionalQuantity: number;
  currentUnitPrice: number;
  nextUnitPrice: number;
  total: number;
  difference: number;
}

export interface CartPricingInsights {
  comparison?: {
    withoutCombos: number;
    difference: number;
    lostVolumeBrands: string[];
    dropsComboAdjustment: boolean;
    mergesDifferentAdjustments: boolean;
  };
  suggestions: VolumeSuggestion[];
  limitation?: string;
}

// Use cents for comparisons so floating-point residue never becomes a warning.
const cents = (amount: number) => Math.round(amount * 100);
const difference = (a: number, b: number) => (cents(a) - cents(b)) / 100;
const unitPrice = (item: CartItem) => (item.customTotal ?? NaN) / item.quantity;
const hasUnitOverride = (item: CartItem) => item.manualPricePerUnit != null || item.manualPercentage > 0;
const adjustmentKey = (item: CartItem) => JSON.stringify([
  item.manualPricePerUnit ?? null, item.manualPercentage, item.manualTotal,
]);

function hasReliableProductPrice(item: CartItem): boolean {
  if (item.manualPricePerUnit != null) return Number.isFinite(item.manualPricePerUnit);
  return !!item.priceTiers?.length && item.priceTiers.every((tier) =>
    Number.isFinite(tier.minQuantity) && Number.isFinite(tier.pricePerUnit)) &&
    Number.isFinite(item.manualPercentage);
}

/** Read-only scenarios. The supplied calculator is the cart's own priceCart;
 * never invoke combo discovery, allocation or store actions from here. */
export function getCartPricingInsights(
  items: CartItem[], total: number, calculate: CalculateCart,
): CartPricingInsights {
  const result: CartPricingInsights = { suggestions: [] };
  const bundles = items.filter((item) => item.isPromo);
  if (bundles.some((item) => !item.includedItems?.length ||
    item.includedItems.some((included) => included.isPromo || !Number.isFinite(included.quantity) || included.quantity <= 0))) {
    return { ...result, limitation: "No podemos comparar ni sugerir cantidades: falta el detalle de productos y variantes de un combo." };
  }
  const purchasedProducts = items.flatMap((item) => item.isPromo ? item.includedItems! : [item]);
  if (!Number.isFinite(total) || items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0) ||
    purchasedProducts.some((item) => !hasReliableProductPrice(item))) {
    return { ...result, limitation: "No podemos comparar ni sugerir cantidades: faltan precios por cantidad válidos para algún producto o variante." };
  }

  // Some legacy bundles lack a catalog definition and use customTotal as a
  // fallback unit price. Verify repricing is stable before advertising totals
  // or attributing a price difference to lost volume pricing.
  const current = calculate(items, true);
  if (difference(current.total, total) !== 0 || current.items.some((item, index) =>
    !Number.isFinite(unitPrice(item)) || difference(item.customTotal ?? NaN, items[index]?.customTotal ?? NaN) !== 0)) {
    return { ...result, limitation: "No podemos comparar ni sugerir cantidades: los precios guardados no coinciden con el recálculo actual del carrito. Revisá los precios y la definición de los combos." };
  }

  // This is exactly the same flattening, merging and manual-adjustment behavior
  // as turning off the existing Combos switch, including explicit bundles.
  const without = calculate(items, false);
  if (!Number.isFinite(without.total)) {
    return { ...result, limitation: "No se pudo calcular un total sin combos con los precios actuales." };
  }
  const ordinary = items.filter((item) => !item.isPromo);
  const brandQuantities = new Map<string, number>();
  ordinary.forEach((item) => {
    if (item.brand) brandQuantities.set(item.brand, (brandQuantities.get(item.brand) ?? 0) + item.quantity);
  });
  const lostVolumeBrands = new Set<string>();
  ordinary.forEach((item) => {
    const noComboItem = without.items.find((other) => other.id === item.id);
    // A lower price is attributable to volume only when neither line has a
    // manual override and both use identical configured tiers.
    if (item.brand && noComboItem && !hasUnitOverride(item) && !hasUnitOverride(noComboItem) &&
      JSON.stringify(item.priceTiers) === JSON.stringify(noComboItem.priceTiers) &&
      difference(unitPrice(item), unitPrice(noComboItem)) > 0 &&
      without.items.filter((other) => !other.isPromo && other.brand === item.brand)
        .reduce((sum, other) => sum + other.quantity, 0) > (brandQuantities.get(item.brand) ?? 0)) {
      lostVolumeBrands.add(item.brand);
    }
  });
  result.comparison = {
    withoutCombos: without.total,
    difference: difference(total, without.total),
    lostVolumeBrands: [...lostVolumeBrands],
    dropsComboAdjustment: bundles.some((item) => hasUnitOverride(item) || item.manualTotal != null),
    mergesDifferentAdjustments: purchasedProducts.some((item, index) =>
      purchasedProducts.some((other, otherIndex) => index !== otherIndex && item.id === other.id &&
        adjustmentKey(item) !== adjustmentKey(other))),
  };

  items.forEach((item, lineIndex) => {
    if (item.isPromo || !item.brand || hasUnitOverride(item)) return;
    const quantity = brandQuantities.get(item.brand) ?? 0;
    const thresholds = [...new Set(item.priceTiers.map((tier) => tier.minQuantity))]
      .filter((threshold) => threshold > quantity && threshold - quantity <= 2)
      .sort((a, b) => a - b);
    for (const threshold of thresholds) {
      const additionalQuantity = threshold - quantity;
      if (additionalQuantity !== 1 && additionalQuantity !== 2) continue;
      // Each alternative starts from the actual selection. Existing bundles and
      // their manifests stay fixed; extra units go only to this ordinary line.
      const hypothetical = calculate(items.map((line, index) => ({
        ...line, quantity: line.quantity + (index === lineIndex ? additionalQuantity : 0),
      })), true);
      const nextItem = hypothetical.items[lineIndex];
      if (!nextItem || !Number.isFinite(hypothetical.total) || !Number.isFinite(unitPrice(nextItem)) ||
        difference(unitPrice(item), unitPrice(nextItem)) <= 0) continue;
      result.suggestions.push({
        key: item.cartLineKey ?? String(item.id), item, lineIndex, additionalQuantity,
        currentUnitPrice: unitPrice(item), nextUnitPrice: unitPrice(nextItem),
        total: hypothetical.total, difference: difference(hypothetical.total, total),
      });
      break; // Only the next threshold that actually improves this variant.
    }
  });
  return result;
}
