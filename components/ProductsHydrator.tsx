"use client";

import { useEffect } from "react";
import type { Product, CrossPromotion } from "@/types";
import { useProductsStore } from "@/store/productsStore";

export default function ProductsHydrator({
  products,
  promotions,
}: {
  products: Product[];
  promotions: CrossPromotion[];
}) {
  useEffect(() => {
    useProductsStore.getState().hydrate(products, promotions);
  }, [products, promotions]);
  return null;
}
