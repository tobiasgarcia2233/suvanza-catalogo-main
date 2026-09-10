"use client";

import { useState, useEffect, useMemo } from "react";
import { ProductGrid } from "@/components/ProductGrid";
import { CatalogView } from "@/components/CatalogView";
import { ViewModeSwitch, ViewMode } from "@/components/ViewModeSwitch";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { CategoryFilterBar } from "@/components/CategoryFilterBar";
import { CartFab } from "@/components/CartFab";
import { SellerOrdersPanel } from "@/components/SellerOrdersPanel";
import ProductsHydrator from "@/components/ProductsHydrator";
import type { Product, CrossPromotion, Category } from "@/types";
import { useUIStore } from "@/store/uiStore";
import { CheckCircle } from "lucide-react";
import Image from "next/image";

export default function SellerPageClient({
  sellerName,
  sellerSlug,
  products,
  promotions,
  categories,
}: {
  sellerName: string;
  sellerSlug: string;
  products: Product[];
  promotions: CrossPromotion[];
  categories: Category[];
}) {
  const { isModalOpen } = useUIStore();
  const [showSuccess, setShowSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredProducts = useMemo(
    () =>
      selectedCategory
        ? products.filter((p) => p.categoryIds?.includes(selectedCategory))
        : products,
    [products, selectedCategory],
  );

  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
  }, [isModalOpen]);

  const triggerSuccessAnimation = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1200);
  };

  return (
    <div className="bg-[url(/images/Suvanza-back.png)] bg-contain bg-repeat bg-center h-full min-h-[100dvh]">
      <ProductsHydrator products={products} promotions={promotions} />
      {showSuccess && (
        <div className="z-[100] fixed inset-0 flex justify-center items-center bg-success/80 backdrop-blur-sm animate-flash-success pointer-events-none">
          <CheckCircle className="text-white" size={128} strokeWidth={1.5} />
        </div>
      )}

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-screen-2xl">
        <div className="flex justify-between items-center mb-8">
          <Image
            src={"/images/logo.png"}
            alt="suvanza"
            width={220}
            height={64}
            priority
            className="h-16 w-auto shrink-0 object-contain"
          />
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
      <CartFab sellerName={sellerName} onOrderSuccess={triggerSuccessAnimation} />
      <SellerOrdersPanel sellerSlug={sellerSlug} />
    </div>
  );
}
