"use client";

import { Product } from "@/types";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

interface CatalogProductCardProps {
  product: Product;
}

export function CatalogProductCard({ product }: CatalogProductCardProps) {
  const { openProductDetail } = useUIStore();

  // Images usually live on the variants, not the product itself — fall back
  // to the product's own images only if none of its variants have any. Every
  // card shows a single representative image so the row stays a fixed,
  // predictable size regardless of how many photos a product has.
  const allVariantImages = Array.from(
    new Set(
      product.variants?.flatMap((variant) => variant.imageUrls || []) || []
    )
  );
  const imageToShow = allVariantImages[0] ?? product.imageUrls[0];

  const variants = product.variants ?? [];
  const hasMultipleVariants = variants.length > 1;

  const getLowestPrice = () => {
    if (variants.length > 0) {
      return Math.min(
        ...variants.flatMap((v) => v.priceTiers || []).map((t) => t.pricePerUnit)
      );
    }
    if (product.priceTiers.length > 0) {
      return product.priceTiers[0].pricePerUnit;
    }
    return 0;
  };

  return (
    <div
      onClick={() => openProductDetail(product)}
      className="flex items-start gap-4 sm:gap-5 bg-white hover:shadow-lg shadow-sm p-4 border border-border rounded-xl transition-shadow cursor-pointer"
    >
      <div className="relative flex flex-shrink-0 justify-center items-center bg-gray-50 rounded-lg w-24 sm:w-32 aspect-square overflow-hidden">
        {imageToShow ? (
          <Image
            src={imageToShow}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 96px, 128px"
            className="object-contain p-2"
          />
        ) : (
          <ImageOff className="text-gray-300" size={28} />
        )}
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <h3 className="font-bold text-text-primary text-base sm:text-lg truncate">
          {product.brand}
        </h3>
        <p className="mb-2 text-text-secondary text-sm truncate">
          {product.name}
        </p>

        {hasMultipleVariants ? (
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <span
                key={variant.id}
                className="bg-gray-100 px-3.5 py-2 rounded-full text-sm whitespace-nowrap"
              >
                {variant.name}{" "}
                <span className="font-bold text-brand">
                  $
                  {(variant.priceTiers?.[0]?.pricePerUnit || 0).toLocaleString(
                    "es-CL"
                  )}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="font-extrabold text-brand text-lg">
            Desde ${getLowestPrice().toLocaleString("es-CL")}
          </p>
        )}
      </div>
    </div>
  );
}
