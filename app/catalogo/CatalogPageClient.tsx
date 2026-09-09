"use client";

import { useMemo, useState } from "react";
import { ProductGrid } from "@/components/ProductGrid";
import { CatalogView } from "@/components/CatalogView";
import { ViewModeSwitch, ViewMode } from "@/components/ViewModeSwitch";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { CategoryFilterBar } from "@/components/CategoryFilterBar";
import ProductsHydrator from "@/components/ProductsHydrator";
import type { Product, CrossPromotion, Category } from "@/types";

export default function CatalogPageClient({
  products,
  promotions,
  categories,
}: {
  products: Product[];
  promotions: CrossPromotion[];
  categories: Category[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredProducts = useMemo(
    () =>
      selectedCategory
        ? products.filter((p) => p.categoryIds?.includes(selectedCategory))
        : products,
    [products, selectedCategory],
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <ProductsHydrator products={products} promotions={promotions} />

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-screen-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-bold text-2xl">Catálogo</h1>
            <p className="text-sm text-gray-500">
              Vista de referencia del catálogo tal como lo ven las vendedoras.
            </p>
          </div>
          <ViewModeSwitch viewMode={viewMode} setViewMode={setViewMode} />
        </div>

        <CategoryFilterBar
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <main className="w-full">
          {viewMode === "grid" ? (
            <ProductGrid products={filteredProducts} />
          ) : (
            <CatalogView products={filteredProducts} />
          )}
        </main>
      </div>

      <ProductDetailModal />
    </div>
  );
}
