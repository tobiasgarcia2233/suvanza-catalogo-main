"use client";

import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PromoToggle } from "./PromoToggle";

export function CartFooter() {
  const router = useRouter();
  // MODIFICATION: Destructure originalOrder instead of originalOrderId
  const {
    subtotal,
    total,
    discountDetails,
    mode,
    originalOrder,
    items,
    autoApplyPromos,
  } = useCartStore();
  const { openOrderInfoModal, closeCart } = useUIStore();
  const totalDiscount = subtotal - total;

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleUpdateOrder = async () => {
    if (!originalOrder) return;
    const orderIdToUpdate = originalOrder.id;

    setIsSaving(true);
    setError("");
    const updatedOrderData = { items, subtotal, total, autoApplyPromos };

    try {
      const response = await fetch(`/api/orders/${orderIdToUpdate}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedOrderData),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to save changes.");
      }

      closeCart();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-auto pt-6 border-t border-border">
      <div className="mb-4">
        <PromoToggle />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-lg">
          <span>Subtotal</span>
          <span className="font-medium">
            ${subtotal.toLocaleString("es-CL")}
          </span>
        </div>

        {discountDetails.length > 0 && (
          <div className="space-y-1 pt-2 text-red-600 text-sm">
            {discountDetails.map((discount) => (
              <div key={discount.id} className="flex justify-between">
                <span>{discount.label}</span>
                <span>-${discount.amount.toLocaleString("es-CL")}</span>
              </div>
            ))}
          </div>
        )}

        {totalDiscount > 0 && (
          <div className="flex justify-between pt-2 border-t border-dashed text-lg">
            <span>Descuentos Totales</span>
            <span className="text-red-600">
              -${totalDiscount.toLocaleString("es-CL")}
            </span>
          </div>
        )}

        <div className="flex justify-between pt-2 border-t font-bold text-2xl">
          <span>Total</span>
          <span>${total.toLocaleString("es-CL")}</span>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-red-600 text-sm text-center">{error}</p>
      )}

      <button
        onClick={openOrderInfoModal}
        disabled={total < 0 || (mode === "creating" && total === 0)}
        className={`mt-6 py-3 rounded-button w-full font-semibold text-white transition
          ${
            mode === "editing"
              ? "bg-blue-500 hover:bg-blue-600"
              : "bg-brand hover:bg-brand-hover"
          }
          disabled:bg-gray-300
        `}
      >
        {mode === "editing" ? "Actualizar Pedido" : "Completar Orden"}
      </button>
    </div>
  );
}
