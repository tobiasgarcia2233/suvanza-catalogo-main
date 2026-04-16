"use client";

import { useCartStore } from "@/store/cartStore";

export function PromoToggle() {
  const { autoApplyPromos, toggleAutoApplyPromos } = useCartStore();

  return (
    <div className="flex justify-between items-center bg-[#FBF4EF] p-3 border border-[#EFD2BE] rounded-lg">
      <label htmlFor="promo-toggle" className="font-semibold text-[#442710]">
        Combos
      </label>
      <button
        id="promo-toggle"
        role="switch"
        aria-checked={autoApplyPromos}
        onClick={toggleAutoApplyPromos}
        className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${
          autoApplyPromos ? "bg-[#442710]" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
            autoApplyPromos ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
