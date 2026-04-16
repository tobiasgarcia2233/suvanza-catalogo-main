// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { Product } from "@/types";
import { useCartStore } from "@/store/cartStore";
// MODIFICATION: No longer need useUIStore here
import { QuickAddRow } from "./QuickAddRow";
import { X, Search } from "lucide-react";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export function QuickAddModal({
  isOpen,
  onClose,
  products,
}: QuickAddModalProps) {
  const { addMultipleToCart } = useCartStore();
  // MODIFICATION: Removed openCart from here
  const [searchQuery, setSearchQuery] = useState("");
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());

  const allVariants = useMemo(() => {
    return products.flatMap(
      (product) =>
        product.variants?.map((variant) => ({
          ...variant,
          brand: product.brand,
          parentName: product.name,
          parentId: product.id,
        })) || []
    );
  }, [products]);

  const filteredVariants = useMemo(() => {
    if (!searchQuery) return allVariants;
    const lowercasedQuery = searchQuery.toLowerCase();
    return allVariants.filter(
      (variant) =>
        variant.name.toLowerCase().includes(lowercasedQuery) ||
        variant.brand.toLowerCase().includes(lowercasedQuery) ||
        variant.parentName.toLowerCase().includes(lowercasedQuery)
    );
  }, [searchQuery, allVariants]);

  const handleQuantityChange = (variantId: string, newQuantity: number) => {
    setQuantities(new Map(quantities).set(variantId, newQuantity));
  };

  const handleAddToCart = () => {
    let itemsWereAdded = false;
    const parentProductQuantities = new Map<
      string | number,
      { product: Product; quantities: Map<string, number> }
    >();

    quantities.forEach((quantity, variantId) => {
      if (quantity > 0) {
        itemsWereAdded = true;
        const variantInfo = allVariants.find((v) => v.id === variantId);
        if (variantInfo && variantInfo.parentId) {
          const parentProduct = products.find(
            (p) => p.id === variantInfo.parentId
          );
          if (parentProduct) {
            if (!parentProductQuantities.has(parentProduct.id)) {
              parentProductQuantities.set(parentProduct.id, {
                product: parentProduct,
                quantities: new Map(),
              });
            }
            parentProductQuantities
              .get(parentProduct.id)!
              .quantities.set(variantId, quantity);
          }
        }
      }
    });

    parentProductQuantities.forEach(({ product, quantities }) => {
      addMultipleToCart(product, quantities);
    });

    if (itemsWereAdded) {
      onClose(); // Just close this modal
      // Do NOT open the cart, as it's already open behind this modal.
      setQuantities(new Map());
    }
  };

  const totalItems = Array.from(quantities.values()).reduce(
    (sum, qty) => sum + qty,
    0
  );

  if (!isOpen) return null;

  return (
    <div className="z-[60] fixed inset-0 flex justify-center items-center bg-black/60 p-4 animate-fade-in">
      <div className="flex flex-col bg-white shadow-2xl rounded-lg w-full max-w-4xl h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-bold text-xl">Añadir Productos</h2>
          <button
            onClick={onClose}
            className="hover:bg-gray-100 p-2 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search
              className="top-1/2 left-3 absolute text-gray-400 -translate-y-1/2"
              size={20}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por producto, marca o modelo..."
              className="bg-gray-50 py-2 pr-4 pl-10 border border-gray-200 rounded-lg w-full"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow px-4 overflow-y-auto">
          {filteredVariants.map((variant) => (
            <QuickAddRow
              key={variant.id}
              variant={variant}
              quantity={quantities.get(variant.id) || 0}
              onQuantityChange={(newQty) =>
                handleQuantityChange(variant.id, newQty)
              }
            />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto p-4 border-t">
          <button
            onClick={handleAddToCart}
            disabled={totalItems === 0}
            className="bg-brand hover:bg-brand-dark disabled:bg-gray-300 py-3 rounded-lg w-full font-bold text-white transition-colors"
          >
            Añadir{" "}
            {totalItems > 0
              ? `${totalItems} ${totalItems === 1 ? "producto" : "productos"}`
              : ""}{" "}
            al Carrito
          </button>
        </div>
      </div>
    </div>
  );
}
