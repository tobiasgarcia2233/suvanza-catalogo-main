// @ts-nocheck

"use client";

import { create } from "zustand";
import { Product, PriceTier, CartItem, Order, Variant } from "@/types";
import { getProducts } from "@/store/productsStore";

const getPriceForQuantity = (
  tiers: PriceTier[] | undefined,
  quantity: number
): number => {
  if (!tiers || tiers.length === 0) {
    return 0;
  }
  let applicableTier = tiers[0];
  for (const tier of tiers) {
    if (quantity >= tier.minQuantity) {
      applicableTier = tier;
    } else {
      break;
    }
  }
  return applicableTier.pricePerUnit;
};

const getOriginalLineTotal = (
  item: CartItem,
  allCartItems: CartItem[]
): number => {
  let pricePerUnit = 0;
  if (item.parentId) {
    const parentProduct = getProducts().find((p) => p.id === item.parentId);
    if (parentProduct && parentProduct.priceTiers.length > 0) {
      const totalGroupQty = allCartItems
        .filter((i) => i.parentId === item.parentId)
        .reduce((sum, i) => sum + i.quantity, 0);
      pricePerUnit = getPriceForQuantity(
        parentProduct.priceTiers,
        totalGroupQty
      );
    } else {
      pricePerUnit = getPriceForQuantity(item.priceTiers, item.quantity);
    }
  } else {
    pricePerUnit = getPriceForQuantity(item.priceTiers, item.quantity);
  }
  return pricePerUnit * item.quantity;
};

interface EditCartState {
  originalOrderId: string | null;
  items: CartItem[];
  subtotal: number;
  total: number;
  loadOrder: (order: Order) => void;
  // MODIFICATION: All functions now accept string or number for the ID
  removeFromCart: (productId: string | number) => void;
  updateQuantity: (productId: string | number, quantity: number) => void;
  setItemDiscountPercentage: (
    productId: string | number,
    percentage: number | null
  ) => void;
  setItemCustomTotal: (
    productId: string | number,
    amount: number | null
  ) => void;
  clearCart: () => void;
  recalculateTotals: () => void;
}

export const useEditCartStore = create<EditCartState>((set, get) => ({
  originalOrderId: null,
  items: [],
  subtotal: 0,
  total: 0,

  recalculateTotals: () => {
    const items = get().items;
    const newSubtotal = items.reduce(
      (sum, item) => sum + getOriginalLineTotal(item, items),
      0
    );
    const newTotal = items.reduce((sum, item) => {
      const originalTotal = getOriginalLineTotal(item, items);
      return (
        sum + (item.customTotal !== null ? item.customTotal : originalTotal)
      );
    }, 0);
    set({ subtotal: newSubtotal, total: newTotal, items: [...items] });
  },

  loadOrder: (order) => {
    const loadedItems: CartItem[] = order.items.map((orderItem) => {
      const products = getProducts();
      const parentProduct = products.find((p) =>
        p.variants?.some((v) => v.id === orderItem.id)
      );
      const simpleProduct = products.find((p) => p.id === orderItem.id);

      let baseDetails: Product | Variant | undefined;
      let parentDetails: Product | undefined;

      if (parentProduct) {
        baseDetails = parentProduct.variants!.find(
          (v) => v.id === orderItem.id
        );
        parentDetails = parentProduct;
      } else {
        baseDetails = simpleProduct;
      }

      // Ensure parentId is a number
      let parentId: number | undefined = undefined;
      if (parentDetails && typeof parentDetails.id === "number") {
        parentId = parentDetails.id;
      }

      return {
        id: orderItem.id,
        name: orderItem.name,
        brand: orderItem.brand,
        priceTiers: baseDetails?.priceTiers || [],
        parentId: parentId,
        quantity: orderItem.quantity,
        customTotal: orderItem.finalPrice,
        discountPercentage: orderItem.discountPercentage,
        description:
          parentDetails?.description ||
          (baseDetails as Product)?.description ||
          "",
        imageUrls:
          baseDetails?.imageUrls ||
          parentDetails?.imageUrls ||
          (baseDetails as Product)?.imageUrls ||
          [],
        // Add missing properties to satisfy CartItem type
        manualTotal: null,
        manualPercentage: 0,
      };
    });

    set({
      items: loadedItems,
      originalOrderId: order.id,
    });
    get().recalculateTotals();
  },

  removeFromCart: (productId) => {
    const updatedItems = get().items.filter((item) => item.id !== productId);
    set({ items: updatedItems });
    get().recalculateTotals();
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    const updatedItems = get().items.map((item) =>
      item.id === productId
        ? { ...item, quantity, customTotal: null, discountPercentage: 0 }
        : item
    );
    set({ items: updatedItems });
    get().recalculateTotals();
  },

  setItemDiscountPercentage: (productId, percentage) => {
    const items = get().items;
    const updatedItems = items.map((item) => {
      if (item.id === productId) {
        if (
          percentage === null ||
          isNaN(percentage) ||
          percentage <= 0 ||
          percentage > 100
        ) {
          return { ...item, customTotal: null, discountPercentage: 0 };
        }
        const originalTotal = getOriginalLineTotal(item, items);
        const newTotal = originalTotal * (1 - percentage / 100);
        return {
          ...item,
          customTotal: parseFloat(newTotal.toFixed(2)),
          discountPercentage: percentage,
        };
      }
      return item;
    });
    set({ items: updatedItems });
    get().recalculateTotals();
  },

  setItemCustomTotal: (productId, amount) => {
    const items = get().items;
    const updatedItems = items.map((item) => {
      if (item.id === productId) {
        const originalTotal = getOriginalLineTotal(item, items);
        if (amount === null || isNaN(amount) || amount >= originalTotal) {
          return { ...item, customTotal: null, discountPercentage: 0 };
        }
        const percentage =
          originalTotal > 0
            ? ((originalTotal - amount) / originalTotal) * 100
            : 0;
        return {
          ...item,
          customTotal: amount,
          discountPercentage: parseFloat(percentage.toFixed(2)),
        };
      }
      return item;
    });
    set({ items: updatedItems });
    get().recalculateTotals();
  },

  clearCart: () =>
    set({ items: [], subtotal: 0, total: 0, originalOrderId: null }),
}));
