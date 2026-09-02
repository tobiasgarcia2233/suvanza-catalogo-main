"use client";

import { useEffect, useRef, useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { gsap } from "gsap";
import { ArrowLeft, Plus } from "lucide-react";
import { CartItem } from "./CartItem";
import { CartFooter } from "./CartFooter";
import { QuickAddModal } from "./QuickAddModal";
import { useProductsStore } from "@/store/productsStore";

export function CartModal() {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { isCartOpen, closeCart } = useUIStore();
  // --- 1. Get the mode and clearCart action ---
  const { items, mode, clearCart } = useCartStore();
  const products = useProductsStore((s) => s.products);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  useEffect(() => {
    if (isCartOpen) {
      gsap.to(backdropRef.current, {
        opacity: 1,
        pointerEvents: "auto",
        duration: 0.3,
      });
      gsap.to(panelRef.current, {
        x: "0%",
        duration: 0.3,
        ease: "power2.inOut",
      });
    } else {
      gsap.to(backdropRef.current, {
        opacity: 0,
        pointerEvents: "none",
        duration: 0.3,
      });
      gsap.to(panelRef.current, {
        x: "100%",
        duration: 0.3,
        ease: "power2.inOut",
      });
    }
  }, [isCartOpen]);

  // --- 2. Create the new handler function ---
  const handleCloseAndReset = () => {
    // If we are in editing mode, reset the cart's data state.
    if (mode === "editing") {
      clearCart();
    }
    // Always close the cart's UI.
    closeCart();
  };

  return (
    <>
      <div
        ref={backdropRef}
        onClick={handleCloseAndReset} // Also apply to backdrop click
        className="z-50 fixed inset-0 bg-background/80 backdrop-blur-sm pointer-events-none"
        style={{ opacity: 0 }}
      >
        <div
          ref={panelRef}
          onClick={(e) => e.stopPropagation()}
          className="top-0 right-0 absolute bg-background shadow-2xl w-full h-full transform"
        >
          <div className="flex flex-col p-6 h-full">
            <div className="flex justify-between items-center pb-4 border-b border-border">
              <h2 className="flex items-center gap-3 font-bold text-2xl">
                Carrito
                <span className="flex justify-center items-center bg-brand rounded-full w-7 h-7 text-white text-sm">
                  {items.length}
                </span>
              </h2>
              {/* --- 3. Update the button's onClick event --- */}
              <button
                onClick={handleCloseAndReset}
                className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded-md font-semibold text-sm transition"
              >
                <ArrowLeft size={16} /> Volver
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col flex-grow justify-center items-center gap-4">
                <p className="text-text-secondary">Tu carrito esta vacio.</p>
                <button
                  onClick={() => setIsQuickAddOpen(true)}
                  className="flex items-center gap-2 bg-brand hover:bg-brand-dark px-4 py-3 rounded-lg font-semibold text-white transition-colors"
                >
                  <Plus size={16} />
                  Agregar productos
                </button>
              </div>
            ) : (
              <>
                <div className="flex-grow py-4 overflow-y-auto">
                  {items.map((item) => (
                    <CartItem key={item.id} item={item} />
                  ))}
                  <button
                    onClick={() => setIsQuickAddOpen(true)}
                    className="flex justify-center items-center gap-2 mt-4 p-3 border-2 border-gray-300 hover:border-brand border-dashed rounded-lg w-full text-gray-500 hover:text-brand transition-colors"
                  >
                    <Plus size={16} />
                    Añadir más productos
                  </button>
                </div>
                <CartFooter />
              </>
            )}
          </div>
        </div>
      </div>

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        products={products}
      />
    </>
  );
}
