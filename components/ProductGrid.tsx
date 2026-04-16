// src/components/ProductGrid.tsx
import { Product } from "@/types";
import { ProductCard } from "./ProductCard";

// FIX: The interface no longer requires a 'viewMode' prop
interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  // FIX: The component now only renders the grid view, no conditional logic needed.
  return (
    <div className="gap-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
