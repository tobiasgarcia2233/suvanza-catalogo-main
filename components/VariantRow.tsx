// src/components/VariantRow.tsx
"use client";

import Image from "next/image";
import { Variant } from "@/types";
import { Camera } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { NumberStepper } from "./ui/NumberStepper";

interface VariantRowProps {
  variant: Variant;
  quantity: string;
  onQuantityChange: (newQuantity: string) => void;
}

/** Precio por unidad segun la cantidad elegida (aplica el tramo por volumen). */
function unitPriceForQty(variant: Variant, qty: number): number {
  const tiers = [...(variant.priceTiers ?? [])].sort(
    (a, b) => a.minQuantity - b.minQuantity,
  );
  let price = tiers[0]?.pricePerUnit ?? 0;
  for (const tier of tiers) {
    if (qty >= tier.minQuantity) price = tier.pricePerUnit;
  }
  return price;
}

export function VariantRow({
  variant,
  quantity,
  onQuantityChange,
}: VariantRowProps) {
  const { openGalleryModal } = useUIStore();

  const qty = Math.max(0, parseInt(quantity, 10) || 0);
  const basePrice = variant.priceTiers?.[0]?.pricePerUnit ?? 0;
  const unitPrice = unitPriceForQty(variant, qty);
  const lineTotal = unitPrice * qty;
  const hasVolumeBreak = qty > 0 && unitPrice < basePrice;

  const hasImages = !!variant.imageUrls && variant.imageUrls.length > 0;
  const thumbnailSrc = variant.imageUrls?.[0];

  const handleThumbnailClick = () => {
    if (hasImages) {
      openGalleryModal({ images: variant.imageUrls!, title: variant.name });
    }
  };

  return (
    <div
      className={`rounded-2xl border p-3 transition-colors sm:p-4 ${
        qty > 0
          ? "border-brand/40 bg-brand/5"
          : "border-border bg-surface"
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={handleThumbnailClick}
          disabled={!hasImages}
          className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 disabled:cursor-default sm:h-20 sm:w-20"
        >
          {thumbnailSrc ? (
            <Image
              src={thumbnailSrc}
              alt={variant.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              <Camera size={26} />
            </div>
          )}
          {hasImages && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/50">
              <Camera
                size={22}
                className="text-white opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-base font-semibold leading-snug text-text-primary sm:text-lg">
            {variant.name}
          </p>
          <p className="mt-0.5 text-sm text-text-secondary">
            ${basePrice.toLocaleString("es-AR")}{" "}
            <span className="text-text-secondary/70">c/u</span>
          </p>
        </div>

        <div className="w-28 shrink-0">
          <NumberStepper
            value={quantity}
            onCommit={(value) =>
              onQuantityChange(String(Math.max(0, value ?? 0)))
            }
            min={0}
            step={1}
            className="w-full"
            inputClassName="text-lg font-bold text-brand"
            aria-label={`Cantidad de ${variant.name}`}
          />
        </div>
      </div>

      {qty > 0 && (
        <div className="mt-3 flex items-baseline justify-between border-t border-brand/20 pt-2 text-sm">
          <span className="text-text-secondary">
            {hasVolumeBreak ? (
              <>
                {qty} × ${unitPrice.toLocaleString("es-AR")}{" "}
                <span className="font-semibold text-success">por volumen</span>
              </>
            ) : (
              <>
                {qty} {qty === 1 ? "unidad" : "unidades"}
              </>
            )}
          </span>
          <span className="text-base font-bold text-brand">
            ${lineTotal.toLocaleString("es-AR")}
          </span>
        </div>
      )}
    </div>
  );
}
