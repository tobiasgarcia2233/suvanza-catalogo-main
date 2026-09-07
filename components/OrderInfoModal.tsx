// @ts-nocheck
"use client";

import { useEffect, useRef, useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { gsap } from "gsap";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { getProducts } from "@/store/productsStore";
import { CartItem } from "@/types"; // <-- ADD THIS IMPORT IF NOT PRESENT

interface OrderInfoModalProps {
  sellerName: string;
  onOrderSuccess: () => void;
}

export function OrderInfoModal({
  sellerName,
  onOrderSuccess,
}: OrderInfoModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { isOrderInfoModalOpen, closeOrderInfoModal, closeCart } = useUIStore();
  const { items, subtotal, total, clearCart, mode, originalOrder } =
    useCartStore();

  const [buyerName, setBuyerName] = useState("");
  const [buyerDni, setBuyerDni] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { autoApplyPromos } = useCartStore.getState();

  useEffect(() => {
    if (isOrderInfoModalOpen) {
      if (mode === "editing" && originalOrder) {
        setBuyerName(originalOrder.buyer_details.name);
        setBuyerDni(originalOrder.buyer_details.dni);
        setBuyerPhone(originalOrder.buyer_details.phone);
      } else {
        setBuyerName("");
        setBuyerDni("");
        setBuyerPhone("");
      }
      gsap.to(backdropRef.current, {
        opacity: 1,
        pointerEvents: "auto",
        duration: 0.3,
      });
      gsap.to(panelRef.current, {
        opacity: 1,
        scale: 1,
        duration: 0.3,
        ease: "power3.out",
      });
    } else {
      setError("");
      gsap.to(backdropRef.current, {
        opacity: 0,
        pointerEvents: "none",
        duration: 0.3,
      });
      gsap.to(panelRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        ease: "power3.in",
      });
    }
  }, [isOrderInfoModalOpen, mode, originalOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName || !buyerDni || !buyerPhone) {
      setError("Por favor, complete todos los campos.");
      return;
    }
    setIsSubmitting(true);
    setError("");

    // Combos are unrolled into their constituent products below, so capture
    // which ones were actually sold here first.
    const promosSold = items
      .filter((item: CartItem) => item.isPromo)
      .map((item: CartItem) => ({
        id: String(item.promoId ?? item.id),
        title: item.name,
        quantity: item.quantity,
      }));

    // ====================== PAYLOAD BUILDER LOGIC START ======================
    // This logic "unrolls" promos into their constituent items for the backend.
    const flattenedItems = items.reduce((acc: any[], item: CartItem) => {
      // If it's a regular item, just format and add it.
      if (!item.isPromo || !item.includedItems) {
        acc.push({
          id: item.id,
          name: item.name,
          brand: item.brand,
          quantity: item.quantity,
          finalPrice: item.customTotal,
          discountPercentage: item.discountPercentage,
        });
        return acc;
      }

      // If it's a PROMO, unroll its contents.
      const manifest = item.includedItems;
      const bundleQuantity = item.quantity;

      // Calculate the discount ratio to apply to each item within the bundle.
      const bundleSubtotal = manifest.reduce((sum, manifestItem) => {
        const variantData = getProducts()
          .flatMap((p) => p.variants || [p])
          .find((v) => v.id === manifestItem.id);
        const basePrice = variantData?.priceTiers?.[0]?.pricePerUnit || 0;
        return sum + basePrice * manifestItem.quantity;
      }, 0);

      const bundleTotalPrice = (item.customTotal ?? 0) / bundleQuantity;
      const discountRatio =
        bundleSubtotal > 0 ? bundleTotalPrice / bundleSubtotal : 1;

      // Add each item from the manifest to the final list.
      manifest.forEach((manifestItem) => {
        const variantData = getProducts()
          .flatMap((p) => p.variants || [p])
          .find((v) => v.id === manifestItem.id);
        const basePrice = variantData?.priceTiers?.[0]?.pricePerUnit || 0;

        const finalPricePerUnit = basePrice * discountRatio;
        const finalQuantity = manifestItem.quantity * bundleQuantity;
        const finalTotalForLine = finalPricePerUnit * finalQuantity;
        const finalSubtotalForLine = basePrice * finalQuantity;

        acc.push({
          id: manifestItem.id,
          name: manifestItem.name,
          brand: manifestItem.brand,
          quantity: finalQuantity,
          finalPrice: finalTotalForLine,
          discountPercentage:
            finalSubtotalForLine > 0
              ? ((finalSubtotalForLine - finalTotalForLine) /
                  finalSubtotalForLine) *
                100
              : 0,
        });
      });

      return acc;
    }, []);

    // ======================= PAYLOAD BUILDER LOGIC END =======================

    const isEditing = mode === "editing" && originalOrder;
    const endpoint = isEditing
      ? `/api/orders/${originalOrder.id}`
      : "/api/orders";
    const method = isEditing ? "PATCH" : "POST";

    const orderData = {
      sellerName,
      buyerName,
      buyerDni,
      buyerPhone,
      items: flattenedItems, // Use the new flattened items list
      promos: promosSold,
      subtotal,
      total,
      autoApplyPromos,
    };

    console.log("--- FINAL PAYLOAD BEING SENT TO BACKEND ---");
    console.log(JSON.stringify(orderData, null, 2));

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al procesar el pedido.");
      }

      closeOrderInfoModal();
      closeCart();
      clearCart();
      onOrderSuccess();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Un error inesperado ocurrió."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={backdropRef}
      onClick={closeOrderInfoModal}
      className="z-[60] fixed inset-0 flex justify-center items-center bg-background/80 backdrop-blur-sm p-4 pointer-events-none"
      style={{ opacity: 0 }}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-surface shadow-2xl p-8 rounded-xl w-full max-w-md transform"
        style={{ opacity: 0, scale: 0.95 }}
      >
        <button
          onClick={closeOrderInfoModal}
          className="top-4 right-4 z-10 absolute hover:bg-gray-100 p-2 rounded-full text-text-secondary transition"
        >
          <X size={24} />
        </button>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="font-bold text-2xl">Información del Comprador</h2>
          <div>
            <input
              placeholder="Nombre y Apellido"
              id="buyerName"
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="block shadow-sm mt-1 p-2 border-gray-300 focus:border-brand rounded-md focus:ring-brand w-full"
              required
            />
          </div>
          <div>
            <input
              placeholder="DNI"
              id="buyerDni"
              type="text"
              value={buyerDni}
              onChange={(e) => setBuyerDni(e.target.value)}
              className="block shadow-sm mt-1 p-2 border-gray-300 focus:border-brand rounded-md focus:ring-brand w-full"
              required
            />
          </div>
          <div>
            <input
              placeholder="Número de teléfono"
              id="buyerPhone"
              type="tel"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              className="block shadow-sm mt-1 p-2 border-gray-300 focus:border-brand rounded-md focus:ring-brand w-full"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand hover:bg-brand-hover disabled:opacity-50 mt-4 py-3 rounded-button w-full font-semibold text-white transition"
          >
            {isSubmitting
              ? "Procesando..."
              : mode === "editing"
              ? "Confirmar y Actualizar Pedido"
              : "Confirmar y Enviar Pedido"}
          </button>
        </form>
      </div>
    </div>
  );
}
