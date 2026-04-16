"use client";

import type { PriceTier } from "@/types";
import { Plus, Trash2 } from "lucide-react";

export default function PriceTiersEditor({
  value,
  onChange,
}: {
  value: PriceTier[];
  onChange: (tiers: PriceTier[]) => void;
}) {
  function update(i: number, patch: Partial<PriceTier>) {
    onChange(value.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([
      ...value,
      {
        minQuantity: (value[value.length - 1]?.minQuantity ?? 0) + 1,
        pricePerUnit: 0,
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-2">
      {value.map((tier, i) => (
        <div key={i} className="flex gap-2 items-center">
          <label className="flex flex-col text-xs flex-1">
            <span className="text-gray-600">Desde (cant.)</span>
            <input
              type="number"
              min={1}
              value={tier.minQuantity}
              onChange={(e) => update(i, { minQuantity: Number(e.target.value) })}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs flex-1">
            <span className="text-gray-600">Precio unitario</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={tier.pricePerUnit}
              onChange={(e) =>
                update(i, { pricePerUnit: Number(e.target.value) })
              }
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => remove(i)}
            className="p-2 text-red-600 hover:bg-red-50 rounded self-end mb-0.5"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 self-start"
      >
        <Plus size={14} /> Agregar nivel de precio
      </button>
    </div>
  );
}
