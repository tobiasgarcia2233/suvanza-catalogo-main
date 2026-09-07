"use client";

import { useState, useEffect } from "react";
import { ProductGrid } from "@/components/ProductGrid";
import { CatalogView } from "@/components/CatalogView";
import { ViewModeSwitch, ViewMode } from "@/components/ViewModeSwitch";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { CartModal } from "@/components/CartModal";
import { OrderInfoModal } from "@/components/OrderInfoModal";
import { SellerOrdersPanel } from "@/components/SellerOrdersPanel";
import ProductsHydrator from "@/components/ProductsHydrator";
import type { Product, CrossPromotion } from "@/types";
import { useUIStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { ShoppingCart, CheckCircle } from "lucide-react";
import Image from "next/image";

export default function SellerPageClient({
  sellerName,
  sellerSlug,
  products,
  promotions,
}: {
  sellerName: string;
  sellerSlug: string;
  products: Product[];
  promotions: CrossPromotion[];
}) {
  const { openCart, isModalOpen } = useUIStore();
  const { items } = useCartStore();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

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

      <button
        onClick={openCart}
        className="right-8 bottom-8 z-50 fixed bg-brand shadow-lg p-4 rounded-full text-white hover:scale-110 transition-transform duration-200"
      >
        <ShoppingCart size={28} />
        {totalItems > 0 && (
          <span className="-top-2 -right-2 absolute flex justify-center items-center bg-red-500 rounded-full w-7 h-7 font-semibold text-sm">
            {totalItems}
          </span>
        )}
      </button>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-screen-2xl">
        <div className="flex justify-between items-center mb-8">
          <Image
            src={"/images/logo.png"}
            alt="suvanza"
            width={200}
            height={200}
          />
          <ViewModeSwitch viewMode={viewMode} setViewMode={setViewMode} />
        </div>

        <main className="w-full">
          {viewMode === "grid" ? (
            <ProductGrid products={products} />
          ) : (
            <CatalogView products={products} />
          )}
        </main>
      </div>

      <ProductDetailModal />
      <CartModal />
      <OrderInfoModal
        sellerName={sellerName}
        onOrderSuccess={triggerSuccessAnimation}
      />
      <SellerOrdersPanel sellerSlug={sellerSlug} />
    </div>
  );
}
