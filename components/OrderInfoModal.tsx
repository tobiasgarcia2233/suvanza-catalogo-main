// @ts-nocheck
"use client";

import { useEffect, useRef, useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { gsap } from "gsap";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { CartItem } from "@/types"; // <-- ADD THIS IMPORT IF NOT PRESENT
import { checkoutItems } from "@/lib/checkoutPricing";

interface OrderInfoModalProps {
  sellerName: string;
  /** Event a new order belongs to; null = "Individual". Edits keep theirs. */
  eventId?: string | null;
  onOrderSuccess: () => void;
}

export function OrderInfoModal({
  sellerName,
  eventId = null,
  onOrderSuccess,
}: OrderInfoModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { isOrderInfoModalOpen, closeOrderInfoModal, closeCart } = useUIStore();
  const { items, subtotal, total, clearCart, mode, originalOrder, editSellerSlug } =
    useCartStore();

  const [buyerName, setBuyerName] = useState("");
  const [buyerDni, setBuyerDni] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Legacy order metadata describes the purchase, never an evaluation mode.
  const autoApplyPromos = items.some((item) => item.isPromo);

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
    if (useCartStore.getState().comboSelection) return;
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
      }))
      .reduce((promos, promo) => {
        const existing = promos.find((entry) => entry.id === promo.id);
        if (existing) existing.quantity += promo.quantity;
        else promos.push(promo);
        return promos;
      }, []);

    let flattenedItems;
    try {
      flattenedItems = checkoutItems(items, total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Precios inválidos.");
      setIsSubmitting(false);
      return;
    }

    const isEditing = mode === "editing" && originalOrder;
    const endpoint = isEditing
      ? editSellerSlug
        ? `/api/orders/${originalOrder.id}?sellerSlug=${encodeURIComponent(editSellerSlug)}`
        : `/api/orders/${originalOrder.id}`
      : "/api/orders";
    const method = isEditing ? "PATCH" : "POST";

    const orderData = {
      sellerName,
      eventId,
      buyerName,
      buyerDni,
      buyerPhone,
      checkoutCart: items,
      items: flattenedItems, // Use the new flattened items list
      promos: promosSold,
      subtotal,
      total,
      autoApplyPromos,
    };


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
