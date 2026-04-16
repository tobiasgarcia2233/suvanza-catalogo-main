"use client";

import { create } from "zustand";
import type { Product, CrossPromotion } from "@/types";

interface ProductsState {
  products: Product[];
  promotions: CrossPromotion[];
  hydrated: boolean;
  hydrate: (products: Product[], promotions: CrossPromotion[]) => void;
}

export const useProductsStore = create<ProductsState>((set) => ({
  products: [],
  promotions: [],
  hydrated: false,
  hydrate: (products, promotions) =>
    set({ products, promotions, hydrated: true }),
}));

export const getProducts = () => useProductsStore.getState().products;
export const getPromotions = () => useProductsStore.getState().promotions;
