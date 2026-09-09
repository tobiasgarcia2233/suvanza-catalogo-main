"use client";

import { useEffect, useState } from "react";
import type { Order, Product, CrossPromotion } from "@/types";
import { SearchableOrderList } from "@/components/SearchableOrderList";
import { QuickAddModal } from "@/components/QuickAddModal";
import { CartModal } from "@/components/CartModal";
import { OrderInfoModal } from "@/components/OrderInfoModal";
import ProductsHydrator from "@/components/ProductsHydrator";
import { Loader2, Plus, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";

interface OrdersPageClientProps {
  initialOrders: Order[];
}

export function OrdersPageClient({ initialOrders }: OrdersPageClientProps) {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<CrossPromotion[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const { openCart } = useUIStore();
  const { items } = useCartStore();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // The catalog only feeds "Nuevo pedido" / order editing — load it once here
  // rather than on the server, so it isn't refetched on every router.refresh().
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pRes, promoRes] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/promotions", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        const pData = pRes.ok ? await pRes.json() : { products: [] };
        const promoData = promoRes.ok ? await promoRes.json() : { promotions: [] };
        if (cancelled) return;
        setProducts(pData.products ?? []);
        setPromotions(promoData.promotions ?? []);
        setCatalogReady(true);
      } catch {
        /* leave catalog empty; the button stays disabled */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto p-8 max-w-7xl">
      <ProductsHydrator products={products} promotions={promotions} />

      <div className="mb-8">
        <h1 className="font-bold text-text-primary text-3xl">
          Dashboard de Pedidos
        </h1>
        <p className="mt-1 text-text-secondary">Cobros y gestión de pedidos.</p>
      </div>

      <SearchableOrderList initialOrders={initialOrders} />

      <button
        onClick={() => setIsQuickAddOpen(true)}
        disabled={!catalogReady}
        className="bottom-8 left-8 fixed bg-brand hover:bg-brand-dark disabled:opacity-60 disabled:cursor-wait shadow-lg p-4 rounded-full text-white hover:scale-110 disabled:hover:scale-100 transition-transform"
        aria-label="Crear Nuevo Pedido"
      >
        {catalogReady ? (
          <Plus size={28} />
        ) : (
          <Loader2 size={28} className="animate-spin" />
        )}
      </button>
      <button
        onClick={openCart}
        className="right-8 bottom-8 fixed bg-gray-800 shadow-lg p-4 rounded-full text-white hover:scale-110 transition-transform duration-200"
      >
        <ShoppingCart size={28} />
        {totalItems > 0 && (
          <span className="-top-2 -right-2 absolute flex justify-center items-center bg-red-500 rounded-full w-7 h-7 font-semibold text-sm">
            {totalItems}
          </span>
        )}
      </button>

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        products={products}
      />
      <CartModal />
      <OrderInfoModal sellerName={"Nico Angelucci"} onOrderSuccess={() => {}} />
    </div>
  );
}
