// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { Product } from "@/types";
import { useCartStore } from "@/store/cartStore";
import { useProductsStore } from "@/store/productsStore";
// MODIFICATION: No longer need useUIStore here
import { QuickAddRow } from "./QuickAddRow";
import { NumberStepper } from "./ui/NumberStepper";
import { X, Search } from "lucide-react";

type QuickAddTab = "products" | "promos";

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
  const { addMultipleToCart, addCrossPromotionToCart } = useCartStore();
  const promotions = useProductsStore((s) => s.promotions);
  // MODIFICATION: Removed openCart from here
  const [activeTab, setActiveTab] = useState<QuickAddTab>("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());
  const [promoQuantities, setPromoQuantities] = useState<Map<string, number>>(
    new Map()
  );

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

  const filteredPromos = useMemo(() => {
    if (!searchQuery) return promotions;
    const lowercasedQuery = searchQuery.toLowerCase();
    return promotions.filter(
      (promo) =>
        promo.title.toLowerCase().includes(lowercasedQuery) ||
        promo.items.some((item) =>
          item.name.toLowerCase().includes(lowercasedQuery)
        )
    );
  }, [searchQuery, promotions]);

  const handleQuantityChange = (variantId: string, newQuantity: number) => {
    setQuantities(new Map(quantities).set(variantId, newQuantity));
  };

  const handlePromoQuantityChange = (promoId: string, newQuantity: number) => {
    setPromoQuantities(new Map(promoQuantities).set(promoId, newQuantity));
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

    promoQuantities.forEach((quantity, promoId) => {
      if (quantity > 0) {
        const promo = promotions.find((p) => p.id === promoId);
        if (promo) {
          itemsWereAdded = true;
          // Keep any individually-added products; the promo is additive here.
          addCrossPromotionToCart(promo, quantity, false);
        }
      }
    });

    if (itemsWereAdded) {
      onClose(); // Just close this modal
      // Do NOT open the cart, as it's already open behind this modal.
      setQuantities(new Map());
      setPromoQuantities(new Map());
    }
  };

  const totalItems = Array.from(quantities.values()).reduce(
    (sum, qty) => sum + qty,
    0
  );

  const totalPromos = Array.from(promoQuantities.values()).reduce(
    (sum, qty) => sum + qty,
    0
  );

  const totalToAdd = totalItems + totalPromos;

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

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("products")}
            className={`flex-1 py-3 font-semibold text-sm transition-colors ${
              activeTab === "products"
                ? "border-b-2 border-brand text-brand"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Productos individuales
          </button>
          <button
            onClick={() => setActiveTab("promos")}
            className={`flex-1 py-3 font-semibold text-sm transition-colors ${
              activeTab === "promos"
                ? "border-b-2 border-brand text-brand"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Promos
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
              placeholder={
                activeTab === "products"
                  ? "Buscar por producto, marca o modelo..."
                  : "Buscar promo por nombre o producto..."
              }
              className="bg-gray-50 py-2 pr-4 pl-10 border border-gray-200 rounded-lg w-full"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow px-4 overflow-y-auto">
          {activeTab === "products"
            ? filteredVariants.map((variant) => (
                <QuickAddRow
                  key={variant.id}
                  variant={variant}
                  quantity={quantities.get(variant.id) || 0}
                  onQuantityChange={(newQty) =>
                    handleQuantityChange(variant.id, newQty)
                  }
                />
              ))
            : filteredPromos.length === 0 ? (
                <p className="py-8 text-gray-500 text-center">
                  No hay promos disponibles.
                </p>
              ) : (
                filteredPromos.map((promo) => (
                  <div
                    key={promo.id}
                    className="items-center gap-4 grid grid-cols-12 py-2 border-gray-100 border-b"
                  >
                    <div className="col-span-6">
                      <p className="font-semibold text-gray-800">
                        {promo.title}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {promo.items
                          .map((item) => `${item.quantity}x ${item.name}`)
                          .join(" + ")}
                      </p>
                    </div>
                    <div className="col-span-3 text-right">
                      <p className="font-bold text-brand">
                        ${promo.totalPrice.toLocaleString("es-CL")}
                      </p>
                    </div>
                    <div className="flex justify-end col-span-3">
                      <NumberStepper
                        value={promoQuantities.get(promo.id) || 0}
                        onCommit={(value) =>
                          handlePromoQuantityChange(
                            promo.id,
                            Math.max(0, value ?? 0)
                          )
                        }
                        min={0}
                        step={1}
                        inputClassName="w-12"
                        aria-label="Cantidad"
                      />
                    </div>
                  </div>
                ))
              )}
        </div>

        {/* Footer */}
        <div className="mt-auto p-4 border-t">
          <button
            onClick={handleAddToCart}
            disabled={totalToAdd === 0}
            className="bg-brand hover:bg-brand-dark disabled:bg-gray-300 py-3 rounded-lg w-full font-bold text-white transition-colors"
          >
            Añadir{" "}
            {totalToAdd > 0
              ? `${totalToAdd} ${totalToAdd === 1 ? "ítem" : "ítems"}`
              : ""}{" "}
            al Carrito
          </button>
        </div>
      </div>
    </div>
  );
}
