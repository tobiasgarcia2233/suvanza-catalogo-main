"use client";

import { useState, useMemo, useEffect } from "react";
import { CartItem, Product } from "@/types";
import { useCartStore } from "@/store/cartStore";
import { useProductsStore } from "@/store/productsStore";
import { promotionId } from "@/lib/comboRows";
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
  const [activeTab, setActiveTab] = useState<QuickAddTab>("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());
  const [promoQuantities, setPromoQuantities] = useState<Map<string, number>>(
    new Map()
  );

  useEffect(() => {
    if (!isOpen) return;
    const ordinary = new Map<string, number>();
    const applied = new Map<string, number>();
    useCartStore.getState().items.forEach((item) => {
      const target = item.isPromo ? applied : ordinary;
      const id = item.isPromo ? promotionId(item) : String(item.id);
      target.set(id, (target.get(id) ?? 0) + item.quantity);
    });
    setQuantities(ordinary);
    setPromoQuantities(applied);
  }, [isOpen]);

  const allVariants = useMemo(() => {
    return products.flatMap(
      (product) =>
        (product.variants?.length ? product.variants : [product]).map((variant) => ({
          ...variant,
          id: String(variant.id),
          brand: product.brand ?? "",
          parentName: product.name,
          parentId: product.id,
        }))
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
    setQuantities(new Map(quantities).set(String(variantId), newQuantity));
  };

  const handlePromoQuantityChange = (promoId: string, newQuantity: number) => {
    setPromoQuantities(new Map(promoQuantities).set(String(promoId), newQuantity));
  };

  const handleAddToCart = () => {
    // Resize existing lines without rebuilding their variants or adjustments.
    // When several adjusted lines share an ID, remove from the last line first.
    const resizeExisting = (matches: (item: CartItem) => boolean, desired: number) => {
      const lines = () => useCartStore.getState().items.filter(matches);
      const current = lines().reduce((sum, item) => sum + item.quantity, 0);
      if (!current) return false;
      let difference = desired - current;
      while (difference !== 0) {
        const row = lines().at(-1);
        if (!row) break;
        const change = difference > 0 ? difference : -Math.min(row.quantity, -difference);
        useCartStore.getState().updateQuantity(row.cartLineKey ?? row.id, row.quantity + change);
        difference -= change;
      }
      return true;
    };

    quantities.forEach((quantity, variantId) => {
      if (!Number.isSafeInteger(quantity) || quantity < 0) return;
      if (resizeExisting((item) => !item.isPromo && String(item.id) === variantId, quantity) || quantity === 0) return;
      const variantInfo = allVariants.find((variant) => String(variant.id) === variantId);
      const parentProduct = products.find((product) => product.id === variantInfo?.parentId);
      if (parentProduct && variantInfo) {
        addMultipleToCart(parentProduct, new Map([[variantInfo.id, quantity]]));
      }
    });

    promoQuantities.forEach((quantity, promoId) => {
      if (!Number.isSafeInteger(quantity) || quantity < 0) return;
      if (resizeExisting((item) => !!item.isPromo && promotionId(item) === promoId, quantity) || quantity === 0) return;
      const promo = promotions.find((promotion) => String(promotion.id) === promoId);
      if (promo) addCrossPromotionToCart(promo, quantity, false);
    });
    onClose();
  };

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
                  quantity={quantities.get(String(variant.id)) || 0}
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
                        value={promoQuantities.get(String(promo.id)) || 0}
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
            className="bg-brand hover:bg-brand-dark disabled:bg-gray-300 py-3 rounded-lg w-full font-bold text-white transition-colors"
          >
            Confirmar cantidades
          </button>
        </div>
      </div>
    </div>
  );
}
