// src/components/VariantRow.tsx
"use client";

import Image from "next/image";
import { Variant } from "@/types";
import { Minus, Plus, Camera } from "lucide-react"; // Import the Camera icon
import { useUIStore } from "@/store/uiStore"; // Import the UI store

interface VariantRowProps {
  variant: Variant;
  quantity: string;
  onQuantityChange: (newQuantity: string) => void;
}

export function VariantRow({
  variant,
  quantity,
  onQuantityChange,
}: VariantRowProps) {
  const { openGalleryModal } = useUIStore();
  // FIXED: Correctly get the price using 'pricePerUnit'
  const price = variant.priceTiers?.[0]?.pricePerUnit || 0;

  // Determine if the variant has images and get the thumbnail source
  const hasImages = variant.imageUrls && variant.imageUrls.length > 0;
  const thumbnailSrc = variant.imageUrls?.[0];

  const handleThumbnailClick = () => {
    if (hasImages) {
      openGalleryModal({
        images: variant.imageUrls!,
        title: variant.name,
      });
    }
  };

  return (
    <div className="flex justify-between items-center gap-4 bg-surface p-3 border rounded-lg">
      <div className="flex items-center gap-4">
        {/* The image container is now a clickable button */}
        <button
          onClick={handleThumbnailClick}
          disabled={!hasImages}
          className="group relative flex-shrink-0 bg-gray-100 rounded-md w-16 h-16 disabled:cursor-default"
        >
          {thumbnailSrc ? (
            <Image
              src={thumbnailSrc}
              alt={variant.name}
              fill
              className="rounded-md object-cover"
            />
          ) : (
            <div className="flex justify-center items-center h-full text-gray-400">
              <Camera size={24} />
            </div>
          )}
          {/* FIXED: Hover effect overlay styling corrected to be transparent by default */}
          {hasImages && (
            <div className="absolute inset-0 flex justify-center items-center bg-transparent group-hover:bg-black/50 rounded-md transition-colors">
              <Camera
                size={24}
                className="opacity-0 group-hover:opacity-100 text-white transition-opacity"
              />
            </div>
          )}
        </button>
        <div>
          <p className="font-semibold text-text-primary">{variant.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-medium text-text-secondary">
            ${price.toLocaleString("es-CL")}
          </p>
        </div>
        <div className="flex justify-end items-center gap-2 p-1 border rounded-md">
          <button
            onClick={() =>
              onQuantityChange(
                String(Math.max(0, (parseInt(quantity, 10) || 0) - 1))
              )
            }
            className="hover:bg-gray-100 p-1 rounded-sm transition"
          >
            <Minus size={16} />
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={(e) => {
              const qty = parseInt(e.target.value, 10);
              if (isNaN(qty) || qty < 0) onQuantityChange("0");
            }}
            className="bg-transparent border-none focus:outline-none focus:ring-0 w-10 font-medium text-brand text-center"
          />
          <button
            onClick={() =>
              onQuantityChange(String((parseInt(quantity, 10) || 0) + 1))
            }
            className="hover:bg-gray-100 p-1 rounded-sm transition"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
