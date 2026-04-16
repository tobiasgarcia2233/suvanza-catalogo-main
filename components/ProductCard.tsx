// src/components/ProductCard.tsx
"use client";

import { Product } from "@/types";
import Image from "next/image";
import { useUIStore } from "@/store/uiStore";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { openProductDetail } = useUIStore();

  // NEW LOGIC: Find the lowest price among all variants or tiers
  const getLowestPrice = () => {
    if (product.variants && product.variants.length > 0) {
      // Find the minimum price across all variants' price tiers
      return Math.min(
        ...product.variants
          .flatMap((v) => v.priceTiers || [])
          .map((t) => t.pricePerUnit)
      );
    }
    // For products with shared pricing or simple products
    if (product.priceTiers.length > 0) {
      return product.priceTiers[0].pricePerUnit;
    }
    return 0;
  };

  const priceToDisplay = getLowestPrice();

  return (
    <div
      onClick={() => openProductDetail(product)}
      className="group relative flex flex-col bg-surface hover:shadow-xl p-4 border border-border rounded-card overflow-hidden text-left transition-shadow duration-300 cursor-pointer"
    >
      <div className="relative w-full h-48">
        <Image
          src={product.imageUrls[0]}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="rounded-md object-center object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div className="flex flex-col flex-1 mt-4">
        <p className="font-bold text-text-secondary text-xs uppercase tracking-wider">
          {product.brand}
        </p>
        <h3 className="font-semibold text-text-primary">{product.name}</h3>
        <div className="flex items-baseline gap-2 mt-auto pt-2">
          <span className="text-text-secondary text-sm">Desde</span>
          <p className="font-bold text-brand text-lg">
            ${priceToDisplay.toLocaleString("es-CL")}
          </p>
        </div>
      </div>
      {/* "Add to Cart" button has been removed */}
    </div>
  );
}
