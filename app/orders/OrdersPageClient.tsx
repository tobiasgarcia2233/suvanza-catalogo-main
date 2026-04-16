"use client";

import { useState } from "react";
import type { Order, Product, CrossPromotion } from "@/types";
import { SearchableOrderList } from "@/components/SearchableOrderList";
import { QuickAddModal } from "@/components/QuickAddModal";
import { CartModal } from "@/components/CartModal";
import { OrderInfoModal } from "@/components/OrderInfoModal";
import ProductsHydrator from "@/components/ProductsHydrator";
import { Plus, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";

interface OrdersPageClientProps {
  initialOrders: Order[];
  products: Product[];
  promotions: CrossPromotion[];
}

export function OrdersPageClient({
  initialOrders,
  products,
  promotions,
}: OrdersPageClientProps) {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const { openCart } = useUIStore();
  const { items } = useCartStore();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="mx-auto p-8 max-w-7xl">
      <ProductsHydrator products={products} promotions={promotions} />

      <div className="mb-8">
        <h1 className="font-bold text-text-primary text-3xl">
          Dashboard de Pedidos
        </h1>
        <p className="mt-1 text-text-secondary">
          Cobros y gestión de pedidos.
        </p>
      </div>

      <SearchableOrderList initialOrders={initialOrders} />

      <button
        onClick={() => setIsQuickAddOpen(true)}
        className="bottom-8 left-8 fixed bg-brand hover:bg-brand-dark shadow-lg p-4 rounded-full text-white hover:scale-110 transition-transform"
        aria-label="Crear Nuevo Pedido"
      >
        <Plus size={28} />
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
