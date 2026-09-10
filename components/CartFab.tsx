"use client";

import { ShoppingCart } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { CartModal } from "@/components/CartModal";
import { OrderInfoModal } from "@/components/OrderInfoModal";

// Orders created from admin-only screens (/orders, /catalogo) aren't tied to a
// seller, so they're attributed to the store admin.
export const ADMIN_ORDER_NAME = "Nico Angelucci";

// The floating cart trigger plus the two modals it drives (cart drawer + buyer
// info). Shared by the seller catalog, the admin catalog and the orders
// dashboard so the checkout flow stays identical everywhere.
export function CartFab({
  sellerName = ADMIN_ORDER_NAME,
  variant = "brand",
  onOrderSuccess,
}: {
  sellerName?: string;
  variant?: "brand" | "dark";
  onOrderSuccess?: () => void;
}) {
  const openCart = useUIStore((s) => s.openCart);
  const items = useCartStore((s) => s.items);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <button
        onClick={openCart}
        aria-label="Abrir carrito"
        className={`right-8 bottom-8 z-50 fixed shadow-lg p-4 rounded-full text-white hover:scale-110 transition-transform duration-200 ${
          variant === "dark" ? "bg-gray-800" : "bg-brand"
        }`}
      >
        <ShoppingCart size={28} />
        {totalItems > 0 && (
          <span className="-top-2 -right-2 absolute flex justify-center items-center bg-red-500 rounded-full w-7 h-7 font-semibold text-sm">
            {totalItems}
          </span>
        )}
      </button>

      <CartModal />
      <OrderInfoModal
        sellerName={sellerName}
        onOrderSuccess={onOrderSuccess ?? (() => {})}
      />
    </>
  );
}
