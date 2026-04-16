// src/components/ui/CatalogSectionCard.tsx
"use client";

import { Product } from "@/types";
import Image from "next/image";
import { useUIStore } from "@/store/uiStore";

interface CatalogSectionCardProps {
  product: Product;
}

export function CatalogSectionCard({ product }: CatalogSectionCardProps) {
  const { openProductDetail } = useUIStore();
  const price = product.variants?.[0]?.priceTiers?.[0]?.pricePerUnit || 0;

  return (
    <div
      onClick={() => openProductDetail(product)}
      className="group flex flex-col items-center bg-gray-50 hover:shadow-lg p-6 rounded-2xl text-center transition-shadow cursor-pointer"
    >
      <div className="relative mb-4 w-full h-48">
        <Image
          src={product.imageUrls[0]}
          alt={product.name}
          fill
          className="object-contain group-hover:scale-105 transition-transform"
        />
      </div>
      <h3 className="font-bold text-text-primary text-lg">{product.name}</h3>
      {product.brand && (
        <p className="text-text-secondary text-sm">{product.brand}</p>
      )}
      <p className="mt-2 font-extrabold text-brand text-xl">
        ${price.toLocaleString("es-CL")}
      </p>
    </div>
  );
}
