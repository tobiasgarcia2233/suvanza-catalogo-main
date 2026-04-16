"use client";

import { useState, useEffect, FocusEvent } from "react";
import Image from "next/image";
import { useCartStore } from "@/store/cartStore";
import { CartItem as CartItemType } from "@/types";
import { Minus, Plus, X, Package } from "lucide-react"; // Added Package icon

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const {
    updateQuantity,
    removeFromCart,
    setItemManualDiscountPercentage,
    setItemManualTotal,
    setItemManualPricePerUnit,
  } = useCartStore();

  // Local state for what the USER IS TYPING in each input.
  const [localPercentageInput, setLocalPercentageInput] = useState("");
  const [localPriceInput, setLocalPriceInput] = useState("");
  const [localQuantity, setLocalQuantity] = useState(String(item.quantity));

  useEffect(() => {
    setLocalQuantity(String(item.quantity));

    // Calculate and set the effective price per unit for the input
    const effectivePricePerUnit =
      item.quantity > 0 ? (item.customTotal ?? 0) / item.quantity : 0;
    setLocalPriceInput(effectivePricePerUnit.toFixed(0));

    if (item.isPromo) {
      setLocalPercentageInput("");
    } else {
      setLocalPercentageInput(
        item.discountPercentage > 0 ? item.discountPercentage.toFixed(2) : ""
      );
    }
  }, [item]);

  const handleQuantityUpdate = () => {
    const newQuantity = parseInt(localQuantity, 10);
    if (!isNaN(newQuantity) && newQuantity !== item.quantity) {
      updateQuantity(item.id, newQuantity);
    } else {
      setLocalQuantity(String(item.quantity));
    }
  };

  const handleInputFocus = (e: FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  // NEW: Handler for the price input
  const handlePriceBlur = () => {
    const newPrice =
      localPriceInput === "" ? null : parseFloat(localPriceInput);
    const currentPrice =
      item.quantity > 0 ? (item.customTotal ?? 0) / item.quantity : 0;

    // Only update if the price has actually changed to avoid unnecessary re-renders
    if (newPrice?.toFixed(0) !== currentPrice.toFixed(0)) {
      setItemManualPricePerUnit(item.id, newPrice);
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
          <div className="flex items-center gap-2 p-1.5 border rounded-md">
            <button
              onClick={() => {
                updateQuantity(item.id, item.quantity - 1);
              }}
              className="hover:bg-gray-100 p-1 rounded-sm transition"
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              value={localQuantity}
              onChange={(e) => setLocalQuantity(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleQuantityUpdate}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleQuantityUpdate();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="bg-transparent border-none focus:outline-none focus:ring-0 w-12 font-medium text-center"
            />
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="hover:bg-gray-100 p-1 rounded-sm transition"
            >
              <Plus size={16} />
            </button>
          </div>

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
    // ========== RENDER VIEW FOR REGULAR PRODUCTS (UPDATED) ==========
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
            {/* Percentage Input (no changes) */}
            <div className="flex items-center gap-2">
              {/* <label
                htmlFor={`discount-${item.id}`}
                className="text-text-secondary text-sm"
              >
                Descuento
              </label> */}
              <div className="flex items-center">
                <input
                  id={`discount-${item.id}`}
                  type="number"
                  value={localPercentageInput}
                  onChange={(e) => setLocalPercentageInput(e.target.value)}
                  onBlur={() =>
                    setItemManualDiscountPercentage(
                      item.id,
                      localPercentageInput === ""
                        ? null
                        : parseFloat(localPercentageInput)
                    )
                  }
                  onFocus={handleInputFocus}
                  placeholder="0"
                  className="shadow-sm p-1 border-gray-300 focus:border-brand rounded-md focus:ring-brand w-16 sm:text-sm text-right"
                />
                <span className="ml-1 text-text-secondary">%</span>
              </div>
            </div>

            {/* ================= UPDATED: Price Per Unit Input ================= */}
            <div className="flex items-center gap-2">
              {/* <label htmlFor={`price-${item.id}`} className="font-bold text-sm">
                Precio unitario
              </label> */}
              <div className="flex items-center">
                <span className="text-text-secondary">$</span>
                <input
                  id={`price-${item.id}`}
                  type="number"
                  value={localPriceInput}
                  onChange={(e) => setLocalPriceInput(e.target.value)}
                  onBlur={handlePriceBlur} // Use the new handler
                  onFocus={handleInputFocus}
                  className="shadow-sm p-1 border-gray-300 focus:border-brand rounded-md focus:ring-brand w-28 font-bold text-brand text-right"
                />
              </div>
            </div>
            {/* ================================================================= */}
          </div>

          {/* Quantity Controls (no changes) */}
          <div className="flex items-center gap-2 p-1.5 border rounded-md">
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="hover:bg-gray-100 p-1 rounded-sm transition"
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              value={localQuantity}
              onChange={(e) => setLocalQuantity(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleQuantityUpdate}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleQuantityUpdate();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="bg-transparent border-none focus:outline-none focus:ring-0 w-12 font-medium text-center"
            />
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="hover:bg-gray-100 p-1 rounded-sm transition"
            >
              <Plus size={16} />
            </button>
          </div>
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
