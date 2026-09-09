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
  const lineId = item.cartLineKey ?? item.id;
  const {
    updateQuantity,
    removeFromCart,
    setItemManualDiscountPercentage,
    setItemManualPricePerUnit,
  } = useCartStore();

  const effectivePricePerUnit =
    item.quantity > 0 ? (item.customTotal ?? 0) / item.quantity : 0;

  const discountValue = item.isPromo
    ? item.manualPercentage > 0
      ? item.manualPercentage
      : null
    : item.discountPercentage > 0
      ? item.discountPercentage
      : null;

  const handleQuantityCommit = (value: number | null) => {
    const newQuantity = value ?? item.quantity;
    if (newQuantity !== item.quantity) {
      updateQuantity(lineId, newQuantity);
    }
  };

  const handlePriceCommit = (value: number | null) => {
    if (value?.toFixed(0) !== effectivePricePerUnit.toFixed(0)) {
      setItemManualPricePerUnit(lineId, value);
    }
  };

  // --- RENDER LOGIC ---

  if (item.isPromo) {
    // ========== PROMO BUNDLE — mismo layout que un producto individual ==========
    return (
      <div className="flex flex-col gap-4 py-4 border-b border-border w-full">
        <div className="flex items-center gap-4 w-full">
          <div className="relative flex-shrink-0 w-16 h-16">
            {item.imageUrls?.[0] ? (
              <Image
                src={item.imageUrls[0]}
                alt={item.name}
                fill
                sizes="64px"
                className="rounded-md object-cover"
              />
            ) : (
              <div className="flex justify-center items-center bg-slate-200 rounded-md w-16 h-16">
                <Package size={32} className="text-slate-500" />
              </div>
            )}
          </div>
          <div className="flex-grow">
            <p className="font-bold text-text-secondary text-xs uppercase">
              {item.brand}
            </p>
            <h3 className="font-semibold whitespace-nowrap">{item.name}</h3>
            {item.comboSource === "automatic" && (item.manualPercentage > 0 || item.manualPricePerUnit != null) && (
              <p className="mt-2 text-lg leading-relaxed text-text-secondary">
                Este combo se conserva mientras tenga un ajuste manual.
              </p>
            )}
            {item.includedItems && item.includedItems.length > 0 && (
              <p className="text-text-secondary text-xs">
                {item.includedItems
                  .map((included) => `${included.quantity}x ${included.name}`)
                  .join(" + ")}
              </p>
            )}
          </div>

          <div className="flex justify-end items-center gap-6 w-full">
            {/* Percentage Input */}
            <NumberStepper
              id={`discount-${lineId}`}
              value={discountValue}
              onCommit={(value) =>
                setItemManualDiscountPercentage(lineId, value)
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

            {/* Price Per Unit Input — bloqueado para promos */}
            <NumberStepper
              id={`price-${lineId}`}
              value={effectivePricePerUnit}
              onCommit={handlePriceCommit}
              min={0}
              decimals={0}
              disabled
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
            onClick={() => removeFromCart(lineId)}
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
              sizes="64px"
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
              id={`discount-${lineId}`}
              value={discountValue}
              onCommit={(value) =>
                setItemManualDiscountPercentage(lineId, value)
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
              id={`price-${lineId}`}
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
            onClick={() => removeFromCart(lineId)}
            className="text-text-secondary hover:text-red-500"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    );
  }
}
