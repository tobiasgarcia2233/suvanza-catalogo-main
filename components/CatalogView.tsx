"use client";

import { Product } from "@/types";
import { CatalogProductCard } from "./CatalogProductCard";

interface CatalogViewProps {
  products: Product[];
}

export function CatalogView({ products }: CatalogViewProps) {
  if (!products || products.length === 0) {
    return <div>Cargando productos...</div>;
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {products.map((product) => (
        <CatalogProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
