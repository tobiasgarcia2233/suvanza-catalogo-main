"use client";

import { useMemo } from "react";
import { useCartStore } from "@/store/cartStore";
import { useProductsStore } from "@/store/productsStore";
import { getAvailableCombos } from "@/lib/comboSelection";

export function ComboActions() {
  const { items, evaluateCombos, removeCombos, comboNotice } = useCartStore();
  const { promotions, hydrated } = useProductsStore();
  // Read-only availability updates labels; it never opens a dialog or applies.
  const availability = useMemo(() => getAvailableCombos(items, hydrated ? promotions : []), [items, promotions, hydrated]);
  const count = availability.candidates.length;
  const appliedCount = items.reduce((sum, item) => sum + (item.isPromo ? item.quantity : 0), 0);
  const notice = comboNotice ?? availability.limitation;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={evaluateCombos} disabled={!hydrated || count === 0}
          className="min-h-12 flex-1 basis-64 rounded-lg bg-brand px-4 py-3 text-xl font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">
          {count === 1 ? "Aplicar combo disponible" : "Ver combos disponibles"}
        </button>
        {appliedCount > 0 && (
          <button type="button" onClick={removeCombos}
            className="min-h-12 flex-1 basis-44 rounded-lg border-2 border-brand px-4 py-3 text-xl font-bold text-brand">
            {appliedCount === 1 ? "Quitar combo" : "Quitar combos"}
          </button>
        )}
      </div>
      {notice && <p role="status" className="text-lg leading-snug text-amber-800">{notice}</p>}
    </div>
  );
}
