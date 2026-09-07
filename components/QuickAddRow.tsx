"use client";

import { Variant } from "@/types";
import { NumberStepper } from "./ui/NumberStepper";

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
        <NumberStepper
          value={quantity}
          onCommit={(value) => onQuantityChange(Math.max(0, value ?? 0))}
          min={0}
          step={1}
          inputClassName="w-12"
          aria-label="Cantidad"
        />
      </div>
    </div>
  );
}
