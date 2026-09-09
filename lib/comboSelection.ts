import type { CartItem, CrossPromotion } from "@/types";

export interface ComboCandidate {
  promotion: CrossPromotion;
  repetitions: number;
  bundles: CartItem[];
  remaining: CartItem[];
}

// A read-only view of the complete purchase, including explicitly added and
// manually adjusted bundles. Do not invent variants for old/incomplete bundles.
export function getAvailableCombos(items: CartItem[], promotions: CrossPromotion[]) {
  const incomplete = items.some((item) => item.isPromo && (!item.includedItems?.length ||
    item.includedItems.some((included) => included.isPromo || !Number.isFinite(included.quantity) || included.quantity <= 0)));
  if (incomplete) return {
    availableItems: null, candidates: [],
    limitation: "Falta el detalle de productos de un combo. No podemos reorganizarlo ni quitarlo sin perder cantidades.",
  };
  const expanded = items.flatMap((item) => item.isPromo
    ? item.includedItems!.map((included) => ({ ...included, quantity: included.quantity * item.quantity }))
    : [{ ...item }]);
  // Match the existing regrouping rule: equivalent lines merge, while distinct
  // manual product adjustments remain separate. No-combo removal uses priceCart.
  const merged = new Map<string, CartItem>();
  expanded.forEach((item) => {
    const key = JSON.stringify([item.id, item.manualPercentage, item.manualPricePerUnit, item.manualTotal, item.priceTiers]);
    const previous = merged.get(key);
    if (previous) previous.quantity += item.quantity;
    else merged.set(key, item);
  });
  const availableItems = [...merged.values()];
  return { availableItems, candidates: findComboCandidates(availableItems, promotions), limitation: null };
}

export function preserveComboAdjustments(allocated: CartItem[], original: CartItem[]) {
  const adjusted = original.filter((item) => item.isPromo &&
    (item.manualPercentage > 0 || item.manualPricePerUnit != null || item.manualTotal != null));
  const contentsKey = (bundle: CartItem) => JSON.stringify(bundle.includedItems?.map((item) =>
    JSON.stringify([item.id, item.quantity, item.manualPercentage, item.manualPricePerUnit ?? null, item.manualTotal, item.priceTiers])).sort());
  const remaining = allocated.map((item) => ({ ...item }));
  const preserved: CartItem[] = [];
  for (const bundle of adjusted) {
    let needed = bundle.quantity;
    for (const replacement of remaining) {
      if (!replacement.isPromo || (replacement.promoId ?? replacement.id) !== (bundle.promoId ?? bundle.id) ||
        contentsKey(replacement) !== contentsKey(bundle) || replacement.quantity <= 0) continue;
      const quantity = Math.min(needed, replacement.quantity);
      let id = `${replacement.id}:adjusted`;
      while ([...remaining, ...preserved].some((item) => item.id === id)) id += ":next";
      preserved.push({
        ...replacement, id, quantity, manualPercentage: bundle.manualPercentage,
        manualPricePerUnit: bundle.manualPricePerUnit, manualTotal: bundle.manualTotal,
      });
      replacement.quantity -= quantity;
      needed -= quantity;
      if (needed === 0) break;
    }
    if (needed > 0) return {
      items: allocated,
      limitation: `Para reemplazar «${bundle.name}», quitá primero su ajuste manual en el carrito. O usá la acción de quitar combos para desarmarlos y usar el precio sin combos.`,
    };
  }
  return { items: [...remaining.filter((item) => item.quantity > 0), ...preserved], limitation: null };
}

export function matchesRequirement(
  item: CartItem,
  requirement: CrossPromotion["items"][number],
): boolean {
  if (requirement.matchBy === "brand") return item.brand === requirement.id;
  if (requirement.matchBy === "nameContains") {
    return item.brand === requirement.brand && item.name.includes(requirement.id);
  }
  return item.id === requirement.id;
}

// A flow network reserves concrete product units across ALL requirement rows.
// Reverse edges let an exact requirement reclaim units from a broader match.
function allocate(items: CartItem[], promotion: CrossPromotion, count: number) {
  const rows = promotion.items.length;
  const sink = 1 + items.length + rows;
  const capacity = Array.from({ length: sink + 1 }, () => Array(sink + 1).fill(0) as number[]);
  items.forEach((item, i) => {
    capacity[0][1 + i] = Math.floor(item.quantity);
    promotion.items.forEach((row, j) => {
      if (matchesRequirement(item, row)) capacity[1 + i][1 + items.length + j] = Math.floor(item.quantity);
    });
  });
  promotion.items.forEach((row, j) => {
    capacity[1 + items.length + j][sink] = row.quantity * count;
  });
  const residual = capacity.map((row) => [...row]);
  const target = promotion.items.reduce((sum, row) => sum + row.quantity * count, 0);
  let flow = 0;
  while (flow < target) {
    const parent = Array(sink + 1).fill(-1) as number[];
    parent[0] = 0;
    const queue = [0];
    for (let head = 0; head < queue.length && parent[sink] === -1; head++) {
      const from = queue[head];
      for (let to = 1; to <= sink; to++) {
        if (parent[to] === -1 && residual[from][to] > 0) {
          parent[to] = from;
          queue.push(to);
        }
      }
    }
    if (parent[sink] === -1) return null;
    let amount = target - flow;
    for (let to = sink; to !== 0; to = parent[to]) amount = Math.min(amount, residual[parent[to]][to]);
    for (let to = sink; to !== 0; to = parent[to]) {
      residual[parent[to]][to] -= amount;
      residual[to][parent[to]] += amount;
    }
    flow += amount;
  }
  return promotion.items.map((_, j) => items.map((_, i) =>
    capacity[1 + i][1 + items.length + j] - residual[1 + i][1 + items.length + j],
  ));
}

function buildBundles(loose: CartItem[], promotion: CrossPromotion, count: number, allocation: number[][]): CartItem[] {
  // Group repetitions with identical concrete contents. Different variants
  // stay in separate bundle lines, avoiding fractional units in manifests.
  const bundles: CartItem[] = [];
  let repetitionsLeft = count;
  while (repetitionsLeft > 0) {
    const one = allocation.map((row, j) => {
      let needed = promotion.items[j].quantity;
      return row.map((available) => {
        const take = Math.min(needed, available);
        needed -= take;
        return take;
      });
    });
    let repetitions = repetitionsLeft;
    one.forEach((row, j) => row.forEach((take, i) => {
      if (take) repetitions = Math.min(repetitions, Math.floor(allocation[j][i] / take));
    }));
    const includedItems = loose.flatMap((item, i) => {
      const quantity = one.reduce((sum, row) => sum + row[i], 0);
      return quantity ? [{ ...item, quantity }] : [];
    });
    bundles.push({
      id: `combo:${promotion.id}:${bundles.length}`,
      promoId: promotion.id,
      name: promotion.title,
      brand: "Promoción",
      priceTiers: [],
      imageUrls: [],
      quantity: repetitions,
      isPromo: true,
      comboSource: "automatic",
      includedItems,
      customTotal: promotion.totalPrice * repetitions,
      finalPrice: promotion.totalPrice,
      manualPercentage: 0,
      manualTotal: null,
      discountPercentage: 0,
    });
    one.forEach((row, j) => row.forEach((take, i) => { allocation[j][i] -= take * repetitions; }));
    repetitionsLeft -= repetitions;
  }
  return bundles;
}

export function findComboCandidates(items: CartItem[], promotions: CrossPromotion[]): ComboCandidate[] {
  const loose = items.filter((item) => !item.isPromo);
  if (loose.some((item) => !Number.isSafeInteger(Math.floor(item.quantity)) || item.quantity < 0)) return [];
  return promotions.flatMap((promotion): ComboCandidate[] => {
    if (!promotion.isPromo || !promotion.items.length || promotion.items.some((row) =>
      !Number.isSafeInteger(row.quantity) || row.quantity <= 0,
    )) return [];
    let high = Math.min(...promotion.items.map((row) => Math.floor(
      loose.reduce((sum, item) => sum + (matchesRequirement(item, row) ? Math.floor(item.quantity) : 0), 0) / row.quantity,
    )));
    let low = 0;
    while (low < high) {
      const mid = low + Math.ceil((high - low) / 2);
      if (allocate(loose, promotion, mid)) low = mid;
      else high = mid - 1;
    }
    if (!low) return [];
    const allocation = allocate(loose, promotion, low)!;
    const remaining = loose.map((item, i) => ({
      ...item,
      quantity: item.quantity - allocation.reduce((sum, row) => sum + row[i], 0),
    })).filter((item) => item.quantity > 0);

    const bundles = buildBundles(loose, promotion, low, allocation);
    return [{ promotion, repetitions: low, bundles, remaining }];
  });
}

export function choiceKey(items: CartItem[], candidates: ComboCandidate[], selectedId: string): string {
  // Unrelated products/prices don't invalidate a confirmed allocation. A new
  // competitor or a change to any matching product quantity does invalidate it.
  const related = new Set([selectedId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of candidates) {
      if (related.has(candidate.promotion.id)) continue;
      const sharesUnits = items.some((item) => !item.isPromo &&
        candidate.promotion.items.some((row) => matchesRequirement(item, row)) &&
        candidates.some((other) => related.has(other.promotion.id) &&
          other.promotion.items.some((row) => matchesRequirement(item, row))));
      if (sharesUnits) { related.add(candidate.promotion.id); changed = true; }
    }
  }
  const alternatives = candidates.filter((candidate) => related.has(candidate.promotion.id));
  const matching = items.filter((item) => !item.isPromo && alternatives.some((candidate) =>
    candidate.promotion.items.some((row) => matchesRequirement(item, row)),
  ));
  const quantities = new Map<string, number>();
  matching.forEach((item) => {
    const key = JSON.stringify([item.id, item.name, item.brand]);
    quantities.set(key, (quantities.get(key) ?? 0) + item.quantity);
  });
  const relevant = [...quantities.entries()];
  return JSON.stringify([
    alternatives.map(({ promotion, repetitions }) => [promotion.id, promotion.items, repetitions])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    relevant.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  ]);
}

export function applyCandidate(items: CartItem[], candidate: ComboCandidate, key: string): CartItem[] {
  const existing = items.filter((item) => item.isPromo);
  const usedIds = new Set(items.map((item) => item.id));
  return [
    ...existing,
    ...candidate.remaining,
    ...candidate.bundles.map((bundle, i) => {
      let id = `combo:${candidate.promotion.id}:${existing.length}:${i}`;
      while (usedIds.has(id)) id += ":next";
      usedIds.add(id);
      return { ...bundle, id, comboChoiceKey: key };
    }),
  ];
}


export function isAutomaticBundle(item: CartItem): boolean {
  // Old automatic bundles have no source marker. Old explicitly-added bundles
  // have promoId on their constituent lines.
  return !!item.isPromo && (item.comboSource === "automatic" ||
    (!item.comboSource && !item.includedItems?.some((included) => included.promoId)));
}

export function expandAutomaticBundles(items: CartItem[], includeAdjusted = false): CartItem[] {
  // A bundle-level adjustment has no defined transfer rule. Preserve that
  // purchased bundle until its adjustment is cleared or combos are turned off.
  const expanded = items.flatMap((item) => isAutomaticBundle(item) &&
    (includeAdjusted || !(item.manualPercentage > 0 || item.manualPricePerUnit != null || item.manualTotal != null))
    ? (item.includedItems ?? []).map((included) => ({ ...included, quantity: included.quantity * item.quantity }))
    : [{ ...item }]);
  // Merge only equivalent product lines; never discard distinct manual prices.
  const merged = new Map<string, CartItem>();
  expanded.forEach((item) => {
    const key = item.isPromo ? JSON.stringify(["bundle", item.id]) : JSON.stringify([
      item.id, item.manualPercentage, item.manualPricePerUnit, item.manualTotal, item.priceTiers,
    ]);
    const previous = merged.get(key);
    if (previous) previous.quantity += item.quantity;
    else merged.set(key, item);
  });
  return [...merged.values()];
}

// Allocate the complete requested combination in one network. Allocating each
// combo sequentially could let a broad match hide a valid exact-match combo.
export function allocateComboSelection(
  items: CartItem[], promotions: CrossPromotion[], quantities: Record<string, number>,
): CartItem[] | null {
  const selected = promotions.filter((promotion) => (quantities[promotion.id] ?? 0) > 0);
  if (Object.entries(quantities).some(([id, quantity]) => !Number.isSafeInteger(quantity) || quantity < 0 ||
    (quantity > 0 && !promotions.some((promotion) => promotion.id === id)))) return null;
  if (!selected.length) return items.map((item) => ({ ...item }));
  const loose = items.filter((item) => !item.isPromo);
  const combined: CrossPromotion = {
    id: "selection", title: "Selección", totalPrice: 0, isPromo: true,
    items: selected.flatMap((promotion) => promotion.items.map((row) => ({
      ...row, quantity: row.quantity * quantities[promotion.id],
    }))),
  };
  const allocation = allocate(loose, combined, 1);
  if (!allocation) return null;
  const remaining = loose.map((item, i) => ({
    ...item, quantity: item.quantity - allocation.reduce((sum, row) => sum + row[i], 0),
  })).filter((item) => item.quantity > 0);
  let rowOffset = 0;
  const bundles = selected.flatMap((promotion) => {
    const rows = allocation.slice(rowOffset, rowOffset + promotion.items.length);
    rowOffset += promotion.items.length;
    return buildBundles(loose, promotion, quantities[promotion.id], rows);
  });
  const existing = items.filter((item) => item.isPromo);
  const usedIds = new Set(items.map((item) => item.id));
  return [...existing, ...remaining, ...bundles.map((bundle) => {
    let id = String(bundle.id);
    while (usedIds.has(id)) id += ":next";
    usedIds.add(id);
    return { ...bundle, id };
  })];
}

export function selectionLimits(items: CartItem[], candidates: ComboCandidate[], quantities: Record<string, number>) {
  const promotions = candidates.map((candidate) => candidate.promotion);
  return Object.fromEntries(candidates.map((candidate) => {
    const id = candidate.promotion.id;
    let low = quantities[id] ?? 0;
    let high = candidate.repetitions;
    while (low < high) {
      const mid = low + Math.ceil((high - low) / 2);
      if (allocateComboSelection(items, promotions, { ...quantities, [id]: mid })) low = mid;
      else high = mid - 1;
    }
    return [id, low];
  }));
}
