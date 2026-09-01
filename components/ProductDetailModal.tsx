"use client";

import { useEffect, useRef, useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { gsap } from "gsap";
import { X } from "lucide-react";
import { VariantRow } from "./VariantRow";
import { CrossPromotion } from "@/types";

export function ProductDetailModal() {
  const modalRef = useRef<HTMLDivElement>(null);
  const {
    isDetailModalOpen,
    selectedProduct,
    closeProductDetail,
    openConfirmationModal,
  } = useUIStore();
  const { addMultipleToCart, addCrossPromotionToCart } = useCartStore();

  const [variantQuantities, setVariantQuantities] = useState<
    Map<string, string>
  >(new Map());

  useEffect(() => {
    if (isDetailModalOpen) {
      gsap.to(modalRef.current, { x: "0%", duration: 0.3, ease: "power3.out" });
      setVariantQuantities(new Map());
    } else {
      gsap.to(modalRef.current, {
        x: "100%",
        duration: 0.3,
        ease: "power3.in",
      });
    }
  }, [isDetailModalOpen]);

  if (!selectedProduct) return null;

  const handleVariantQuantityChange = (variantId: string, value: string) => {
    setVariantQuantities((prevMap) => new Map(prevMap).set(variantId, value));
  };

  const handleAddToCart = () => {
    const quantitiesAsNumbers = new Map<string, number>();
    variantQuantities.forEach((value, id) => {
      const qty = parseInt(value, 10);
      if (!isNaN(qty) && qty > 0) {
        quantitiesAsNumbers.set(id, qty);
      }
    });
    if (quantitiesAsNumbers.size > 0) {
      addMultipleToCart(selectedProduct, quantitiesAsNumbers);
      closeProductDetail();
    }
  };

  const handlePromotionClick = (quantity: number) => {
    const firstVariantId = selectedProduct?.variants?.[0]?.id;
    if (firstVariantId) {
      handleVariantQuantityChange(firstVariantId, quantity.toString());
    }
  };

  const handleCrossPromoClick = (promo: CrossPromotion) => {
    openConfirmationModal({
      title: `Confirmar ${promo.title}`,
      message: (
        <>
          <p>¿Añadir esta promoción al carrito?</p>
          <ul className="mt-2 text-sm list-disc list-inside">
            {promo.items.map((item, index) => (
              <li key={index}>
                {item.quantity}x {item.name}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-gray-500 text-xs">
            Nota: Si ya tienes estos productos en el carrito, serán reemplazados
            para aplicar la promo.
          </p>
        </>
      ),
      onConfirm: () => {
        addCrossPromotionToCart(promo);
        closeProductDetail();
      },
    });
  };

  const representativePromotions =
    selectedProduct.variants?.[0]?.priceTiers || [];
  const crossProductPromotions = selectedProduct.crossProductPromotions || [];

  return (
    <div
      ref={modalRef}
      className="z-50 fixed inset-0 bg-background shadow-2xl transform"
      style={{ transform: "translateX(100%)" }}
    >
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex flex-shrink-0 justify-between items-center p-4 border-b">
          <h2 className="font-bold text-xl">
            {selectedProduct.brand} - {selectedProduct.name}
          </h2>
          <button
            onClick={closeProductDetail}
            className="hover:bg-gray-100 p-2 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-grow overflow-y-auto">
          {/* --- MODIFICATION START: Reordered Content --- */}

          {/* 1. Variations */}
          <div className="space-y-3 p-4">
            {selectedProduct.variants?.map((variant) => (
              <VariantRow
                key={variant.id}
                variant={variant}
                quantity={variantQuantities.get(variant.id) || "0"}
                onQuantityChange={(newValue) =>
                  handleVariantQuantityChange(variant.id, newValue)
                }
              />
            ))}
          </div>

          <div className="p-4 border-t">
            {/* 3. Promotions */}
            {/* Volume Promotions */}
            {representativePromotions.length > 1 && (
              <div className="mb-4">
                <p className="font-bold text-brand text-sm">
                  Promociones por volumen:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {representativePromotions.map(
                    (tier) =>
                      tier.minQuantity > 1 && (
                        <button
                          key={tier.minQuantity}
                          onClick={() => handlePromotionClick(tier.minQuantity)}
                          className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full font-semibold text-brand text-xs transition-colors cursor-pointer"
                        >
                          {`x${
                            tier.minQuantity
                          } a $${tier.pricePerUnit.toLocaleString(
                            "es-CL"
                          )} C/U`}
                        </button>
                      )
                  )}
                </div>
              </div>
            )}

            {/* Cross-Product Promotions */}
            {crossProductPromotions.length > 0 && (
              <div>
                <p className="font-bold text-brand text-sm">
                  Promociones con otros productos:
                </p>
                <div className="space-y-2 mt-2">
                  {crossProductPromotions.map((promo) => (
                    <button
                      key={promo.id}
                      onClick={() => handleCrossPromoClick(promo)}
                      className="bg-gray-100 hover:bg-gray-200 p-3 rounded-md w-full text-left transition-colors cursor-pointer"
                    >
                      <p className="font-bold text-gray-800 text-xs">
                        {promo.title}: $
                        {promo.totalPrice.toLocaleString("es-CL")}
                      </p>
                      <ul className="mt-1 pl-2 text-text-secondary text-xs list-disc list-inside">
                        {promo.items.map((item, index) => (
                          <li key={index}>{`${item.quantity}x ${
                            item.name
                          } a $${item.pricePerUnit.toLocaleString(
                            "es-CL"
                          )}`}</li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* --- MODIFICATION END --- */}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 mt-auto p-4 border-t">
          <button
            onClick={handleAddToCart}
            className="bg-brand py-4 rounded-button w-full font-semibold text-white"
          >
            Añadir al Carrito
          </button>
        </div>
      </div>
    </div>
  );
}
