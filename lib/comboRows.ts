import type { CartItem } from "@/types";

export const promotionId = (item: CartItem) => String(item.promoId ?? item.id);

export function expandComboRows(items: CartItem[]): CartItem[] {
  return items.flatMap((item) => item.isPromo && item.comboParts?.length ? item.comboParts : [item]);
}

export function appliedComboQuantities(items: CartItem[]): Record<string, number> {
  const quantities: Record<string, number> = {};
  items.filter((item) => item.isPromo).forEach((item) => {
    const id = promotionId(item);
    quantities[id] = (quantities[id] ?? 0) + item.quantity;
  });
  return quantities;
}

export function sameComboQuantities(a: Record<string, number>, b: Record<string, number>) {
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].every((id) => (a[id] ?? 0) === (b[id] ?? 0));
}

export function comboContentsKey(item: CartItem): string {
  return JSON.stringify(item.includedItems?.map((included) => JSON.stringify([
    included.id, included.quantity, included.manualPercentage, included.manualPricePerUnit ?? null,
    included.manualTotal, included.priceTiers,
  ])).sort());
}

/** Normalize presentation only. Never average manifests or manual adjustments. */
export function mergeComboRows(items: CartItem[]): CartItem[] {
  const rows: CartItem[] = [];
  const groups = new Map<string, CartItem[]>();
  for (const item of expandComboRows(items)) {
    if (!item.isPromo) { rows.push(item); continue; }
    const id = promotionId(item);
    let group = groups.get(id);
    if (!group) { group = []; groups.set(id, group); rows.push(item); }
    group.push(item);
  }
  return rows.map((row) => {
    if (!row.isPromo) return row;
    const compatible = new Map<string, CartItem>();
    groups.get(promotionId(row))!.forEach((part) => {
      const key = JSON.stringify([comboContentsKey(part), part.manualPercentage,
        part.manualPricePerUnit ?? null, part.manualTotal]);
      const previous = compatible.get(key);
      compatible.set(key, previous ? { ...previous, quantity: previous.quantity + part.quantity,
        customTotal: (previous.customTotal ?? 0) + (part.customTotal ?? 0) } : part);
    });
    const parts = [...compatible.values()];
    if (parts.length === 1) return parts[0];
    const rowId = `combo:${promotionId(row)}`;
    const quantity = parts.reduce((sum, part) => sum + part.quantity, 0);
    const total = parts.reduce((sum, part) => sum + (part.customTotal ?? 0), 0);
    const sameAdjustment = parts.every((part) => part.manualPercentage === row.manualPercentage &&
      part.manualPricePerUnit === row.manualPricePerUnit && part.manualTotal === row.manualTotal);
    const contents = new Map<string, CartItem>();
    parts.forEach((part) => part.includedItems?.forEach((included) => {
      const key = String(included.id);
      const previous = contents.get(key);
      const count = included.quantity * part.quantity;
      contents.set(key, { ...included, quantity: (previous?.quantity ?? 0) + count });
    }));
    return {
      ...row, id: rowId, cartLineKey: undefined, promoId: promotionId(row), quantity, customTotal: total,
      // Aggregate contents are for display; calculations always expand parts.
      includedItems: [...contents.values()],
      comboParts: parts.map((part, index) => ({ ...part, id: `${rowId}:part:${index}`, comboParts: undefined })),
      manualPercentage: sameAdjustment ? row.manualPercentage : 0,
      manualPricePerUnit: sameAdjustment ? row.manualPricePerUnit : undefined,
      manualTotal: sameAdjustment ? row.manualTotal : null,
    };
  });
}

export function resizeComboRow(item: CartItem, quantity: number): CartItem {
  if (!item.comboParts?.length || quantity === item.quantity) return { ...item, quantity };
  let remaining = quantity;
  const parts = item.comboParts.map((part, index) => {
    const count = index === item.comboParts!.length - 1 ? remaining : Math.min(part.quantity, remaining);
    remaining -= count;
    return { ...part, quantity: count };
  }).filter((part) => part.quantity > 0);
  return { ...item, quantity, comboParts: parts };
}

export function adjustComboRow(item: CartItem, adjustment: Partial<CartItem>): CartItem {
  return { ...item, ...adjustment, ...(item.comboParts ? {
    comboParts: item.comboParts.map((part) => ({ ...part, ...adjustment })),
  } : {}) };
}
