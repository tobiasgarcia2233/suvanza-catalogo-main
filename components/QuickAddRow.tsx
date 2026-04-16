"use client";

import { Variant } from "@/types";
import { Minus, Plus } from "lucide-react";

interface QuickAddRowProps {
  variant: Variant & { brand: string; parentName: string }; // Combined type for easy access
  quantity: number;
  onQuantityChange: (newQuantity: number) => void;
}

export function QuickAddRow({
  variant,
  quantity,
  onQuantityChange,
}: QuickAddRowProps) {
  const price = variant.priceTiers?.[0]?.pricePerUnit || 0;

  return (
    <div className="items-center gap-4 grid grid-cols-12 py-2 border-gray-100 border-b">
      <div className="col-span-6">
        <p className="font-semibold text-gray-800">{variant.name}</p>
        <p className="text-gray-500 text-xs">
          {variant.brand} - {variant.parentName}
        </p>
      </div>
      <div className="col-span-3 text-right">
        <p className="font-bold text-brand">${price.toLocaleString("es-CL")}</p>
      </div>
      <div className="flex justify-end col-span-3">
        <div className="flex items-center gap-2 p-1.5 border rounded-md">
          <button
            onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
            className="hover:bg-gray-100 p-1 rounded-sm transition"
          >
            <Minus size={16} />
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onQuantityChange(isNaN(val) || val < 0 ? 0 : val);
            }}
            className="bg-transparent border-none focus:outline-none focus:ring-0 w-12 font-medium text-center"
          />
          <button
            onClick={() => onQuantityChange(quantity + 1)}
            className="hover:bg-gray-100 p-1 rounded-sm transition"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
