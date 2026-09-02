"use client";

import Image from "next/image";
import { useCartStore } from "@/store/cartStore";
import { CartItem as CartItemType } from "@/types";
import { X, Package } from "lucide-react";
import { NumberStepper } from "./ui/NumberStepper";

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const {
    updateQuantity,
    removeFromCart,
    setItemManualDiscountPercentage,
    setItemManualPricePerUnit,
  } = useCartStore();

  const effectivePricePerUnit =
    item.quantity > 0 ? (item.customTotal ?? 0) / item.quantity : 0;

  const discountValue =
    item.isPromo || item.discountPercentage <= 0
      ? null
      : item.discountPercentage;

  const handleQuantityCommit = (value: number | null) => {
    const newQuantity = value ?? item.quantity;
    if (newQuantity !== item.quantity) {
      updateQuantity(item.id, newQuantity);
    }
  };

  const handlePriceCommit = (value: number | null) => {
    if (value?.toFixed(0) !== effectivePricePerUnit.toFixed(0)) {
      setItemManualPricePerUnit(item.id, value);
    }
  };

  // --- RENDER LOGIC ---

  if (item.isPromo) {
    // ========== RENDER VIEW FOR PROMO BUNDLES ==========
    return (
      <div className="flex flex-col gap-4 bg-slate-50 p-4 py-4 border-b border-border rounded-lg w-full">
        <div className="flex items-center gap-4 w-full">
          <div className="relative flex flex-shrink-0 justify-center items-center bg-slate-200 rounded-md w-16 h-16">
            <Package size={32} className="text-slate-500" />
          </div>
          <div className="flex-grow">
            <p className="font-bold text-text-secondary text-xs uppercase">
              {item.brand}
            </p>
            <h3 className="font-semibold text-lg whitespace-nowrap">
              {item.name}
            </h3>
            {/* Display the items included in the promo */}
            <div className="mt-1 text-gray-500 text-sm">
              {item.includedItems?.map((included) => (
                <div key={included.id}>
                  {included.quantity}x {included.name}
                </div>
              ))}
            </div>
          </div>

          {/* Quantity Controls for the Promo Bundle */}
          <NumberStepper
            value={item.quantity}
            onCommit={handleQuantityCommit}
            min={0}
            step={1}
            inputClassName="w-12"
            aria-label="Cantidad"
          />

          {/* Total Price for the Promo Bundle */}
          <div className="flex flex-col items-end w-32">
            <span className="text-text-secondary text-sm">Total</span>
            <span className="font-bold text-brand text-xl">
              ${(item.customTotal ?? 0).toLocaleString("es-CL")}
            </span>
          </div>

          {/* Remove Button */}
          <button
            onClick={() => removeFromCart(item.id)}
            className="text-text-secondary hover:text-red-500"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    );
  } else {
    // ========== RENDER VIEW FOR REGULAR PRODUCTS ==========
    return (
      <div className="flex flex-col gap-4 py-4 border-b border-border w-full">
        <div className="flex items-center gap-4 w-full">
          <div className="relative flex-shrink-0 w-16 h-16">
            <Image
              src={item.imageUrls[0]}
              alt={item.name}
              fill
              className="rounded-md object-cover"
            />
          </div>
          <div className="flex-grow">
            <p className="font-bold text-text-secondary text-xs uppercase">
              {item.brand}
            </p>
            <h3 className="font-semibold whitespace-nowrap">{item.name}</h3>
          </div>

          <div className="flex justify-end items-center gap-6 w-full">
            {/* Percentage Input */}
            <NumberStepper
              id={`discount-${item.id}`}
              value={discountValue}
              onCommit={(value) =>
                setItemManualDiscountPercentage(item.id, value)
              }
              min={0}
              max={100}
              step={1}
              decimals={2}
              allowEmpty
              placeholder="0"
              suffix="%"
              inputClassName="w-16 text-right"
            />

            {/* Price Per Unit Input */}
            <NumberStepper
              id={`price-${item.id}`}
              value={effectivePricePerUnit}
              onCommit={handlePriceCommit}
              min={0}
              decimals={0}
              allowEmpty
              showButtons={false}
              prefix="$"
              className="font-bold text-brand"
              inputClassName="w-28 text-right text-brand"
            />
          </div>

          {/* Quantity Controls */}
          <NumberStepper
            value={item.quantity}
            onCommit={handleQuantityCommit}
            min={0}
            step={1}
            inputClassName="w-12"
            aria-label="Cantidad"
          />

          <button
            onClick={() => removeFromCart(item.id)}
            className="text-text-secondary hover:text-red-500"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    );
  }
}
