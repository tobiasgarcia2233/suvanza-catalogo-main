"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
import { sellerCartStorageKey } from "@/store/cartStore";
import { CheckCircle, ChevronLeft, Lock } from "lucide-react";

/** Where the seller is selling: "Individual" (full catalog) or an event. */
export interface SellerContext {
  /** "individual" or the event id — keys the cart and the sales list. */
  key: string;
  eventId: string | null;
  title: string;
  /** Closed event: sales are visible, nothing can be sold or edited. */
  closed: boolean;
}

export default function SellerPageClient({
  sellerName,
  sellerSlug,
  context,
  products,
  promotions,
  categories,
}: {
  sellerName: string;
  sellerSlug: string;
  context: SellerContext;
  products: Product[];
  promotions: CrossPromotion[];
  categories: Category[];
}) {
  const { isModalOpen, openSellerOrders } = useUIStore();
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
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div>
            <Link
              href={`/${sellerSlug}`}
              className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-sm"
            >
              <ChevronLeft size={14} /> Mis eventos
            </Link>
            <h1 className="mt-1 font-bold text-text-primary text-2xl sm:text-3xl">
              {context.title}
            </h1>
          </div>
          {!context.closed && (
            <ViewModeSwitch viewMode={viewMode} setViewMode={setViewMode} />
          )}
        </div>

        {context.closed ? (
          <div className="flex flex-col items-center gap-4 bg-surface shadow-sm mx-auto p-8 border border-border rounded-xl max-w-lg text-center">
            <Lock size={32} className="text-text-secondary" />
            <div>
              <p className="font-semibold text-lg">Este evento está cerrado</p>
              <p className="text-text-secondary text-sm">
                Ya no se pueden cargar ni modificar ventas. Tus ventas del evento
                siguen disponibles.
              </p>
            </div>
            <button
              type="button"
              onClick={openSellerOrders}
              className="bg-brand hover:bg-brand-hover px-5 py-2 rounded-button font-semibold text-white"
            >
              Ver mis ventas
            </button>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {!context.closed && (
        <>
          <ProductDetailModal />
          <CartFab
            sellerName={sellerName}
            eventId={context.eventId}
            storageKey={sellerCartStorageKey(sellerSlug, context.key)}
            onOrderSuccess={triggerSuccessAnimation}
          />
        </>
      )}
      <SellerOrdersPanel
        sellerSlug={sellerSlug}
        context={context.key}
        readOnly={context.closed}
        // An event is a bounded period: show all of it by default.
        defaultPeriod={context.eventId ? "all" : "today"}
      />
    </div>
  );
}
