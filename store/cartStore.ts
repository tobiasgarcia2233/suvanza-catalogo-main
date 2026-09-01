// @ts-nocheck
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Product,
  PriceTier,
  CartItem,
  CrossPromotion,
  Variant,
  Order,
} from "@/types";
import { getProducts, getPromotions } from "@/store/productsStore";

export interface DiscountDetail {
  id: string;
  label: string;
  amount: number;
}

const findProductForPromoItem = (
  itemName: string
): { parentProduct: Product; variant: Variant } | null => {
  const lowerItemName = itemName.toLowerCase();
  for (const product of getProducts()) {
    if (product.brand.toLowerCase() === lowerItemName) {
      if (product.variants && product.variants.length > 0) {
        return { parentProduct: product, variant: product.variants[0] };
      }
    }
    if (product.variants) {
      for (const variant of product.variants) {
        if (
          product.name.toLowerCase() === lowerItemName ||
          variant.name.toLowerCase() === lowerItemName
        ) {
          return { parentProduct: product, variant: variant };
        }
      }
    }
  }
  console.warn(
    `[CartStore] Could not find a matching product for promo item: "${itemName}"`
  );
  return null;
};

// MODIFICATION: The interface is now corrected to match the implementation.
interface CartState {
  mode: "creating" | "editing";
  originalOrder: Order | null; // Changed from originalOrderId
  items: CartItem[];
  subtotal: number;
  total: number;
  discountDetails: DiscountDetail[];
  loadOrderForEdit: (order: Order) => void;
  getOrderForEdit: () => Order | null; // Added getter to the interface
  addMultipleToCart: (
    parentProduct: Product,
    quantities: Map<string, number>
  ) => void;
  addCrossPromotionToCart: (promotion: CrossPromotion) => void;
  removeFromCart: (itemId: string | number) => void;
  updateQuantity: (itemId: string | number, quantity: number) => void;
  setItemManualDiscountPercentage: (
    itemId: string | number,
    percentage: number | null
  ) => void;
  setItemManualTotal: (itemId: string | number, total: number | null) => void;
  clearCart: () => void;
  setItemManualPricePerUnit: (
    itemId: string | number,
    price: number | null
  ) => void;
  autoApplyPromos: boolean;
  toggleAutoApplyPromos: () => void;
}

function recalculateAndSetState(
  items: CartItem[],
  autoApplyPromos: boolean
): Partial<CartState> {
  let finalTotal = 0;
  let finalSubtotal = 0;
  const finalDiscountDetails: DiscountDetail[] = [];
  let processedItems = [...items];

  if (!autoApplyPromos) {
    const flattenedItems = items.flatMap((item) =>
      item.isPromo && item.includedItems
        ? item.includedItems.map((included) => ({
            ...included,
            quantity: included.quantity * item.quantity,
          }))
        : [item]
    );
    const mergedItems = new Map<string | number, CartItem>();
    flattenedItems.forEach((item) => {
      const existingItem = mergedItems.get(item.id);
      if (existingItem) {
        existingItem.quantity += item.quantity;
      } else {
        mergedItems.set(item.id, { ...item });
      }
    });
    processedItems = Array.from(mergedItems.values());
  }

  if (autoApplyPromos) {
    while (true) {
      let promoSwappedThisIteration = false;
      const looseItems = processedItems.filter((item) => !item.isPromo);
      const brandQuantities = new Map<string, number>();
      const idQuantities = new Map<string | number, number>();
      looseItems.forEach((item) => {
        idQuantities.set(
          item.id,
          (idQuantities.get(item.id) || 0) + item.quantity
        );
        if (item.brand) {
          brandQuantities.set(
            item.brand,
            (brandQuantities.get(item.brand) || 0) + item.quantity
          );
        }
      });
      for (const promo of getPromotions()) {
        const promoAlreadyInCart = processedItems.some(
          (item) => item.id === promo.id
        );
        if (promoAlreadyInCart) {
          continue;
        }
        const canApplyPromo = promo.items.every((promoItem) => {
          if (promoItem.matchBy === "brand") {
            return (
              (brandQuantities.get(promoItem.id) || 0) >= promoItem.quantity
            );
          } else if (promoItem.matchBy === "nameContains") {
            const totalMatchingQuantity = looseItems
              .filter(
                (item) =>
                  item.brand === promoItem.brand &&
                  item.name.includes(promoItem.id as string)
              )
              .reduce((sum, item) => sum + item.quantity, 0);
            return totalMatchingQuantity >= promoItem.quantity;
          } else {
            return (idQuantities.get(promoItem.id) || 0) >= promoItem.quantity;
          }
        });
        if (canApplyPromo) {
          promoSwappedThisIteration = true;
          let tempLooseItems = [...looseItems];
          const consumedVariantsForManifest: CartItem[] = [];
          promo.items.forEach((promoItem) => {
            let quantityToConsume = promoItem.quantity;
            const remainingItems: CartItem[] = [];
            if (promoItem.matchBy === "brand") {
              const itemsOfBrand = tempLooseItems.filter(
                (i) => i.brand === promoItem.id
              );
              const otherItems = tempLooseItems.filter(
                (i) => i.brand !== promoItem.id
              );
              for (const item of itemsOfBrand) {
                if (quantityToConsume <= 0) {
                  remainingItems.push(item);
                  continue;
                }
                const amountToTake = Math.min(item.quantity, quantityToConsume);
                consumedVariantsForManifest.push({
                  ...item,
                  quantity: amountToTake,
                });
                quantityToConsume -= amountToTake;
                if (item.quantity > amountToTake) {
                  remainingItems.push({
                    ...item,
                    quantity: item.quantity - amountToTake,
                  });
                }
              }
              tempLooseItems = [...otherItems, ...remainingItems];
            } else if (promoItem.matchBy === "nameContains") {
              const itemsToProcess = tempLooseItems.filter(
                (item) =>
                  item.brand === promoItem.brand &&
                  item.name.includes(promoItem.id as string)
              );
              const otherItems = tempLooseItems.filter(
                (item) => !itemsToProcess.includes(item)
              );
              for (const item of itemsToProcess) {
                if (quantityToConsume <= 0) {
                  remainingItems.push(item);
                  continue;
                }
                const amountToTake = Math.min(item.quantity, quantityToConsume);
                consumedVariantsForManifest.push({
                  ...item,
                  quantity: amountToTake,
                });
                quantityToConsume -= amountToTake;
                if (item.quantity > amountToTake) {
                  remainingItems.push({
                    ...item,
                    quantity: item.quantity - amountToTake,
                  });
                }
              }
              tempLooseItems = [...otherItems, ...remainingItems];
            } else {
              const itemsToProcess = tempLooseItems.filter(
                (i) => i.id === promoItem.id
              );
              const otherItems = tempLooseItems.filter(
                (i) => i.id !== promoItem.id
              );
              for (const item of itemsToProcess) {
                if (quantityToConsume <= 0) {
                  remainingItems.push(item);
                  continue;
                }
                const amountToTake = Math.min(item.quantity, quantityToConsume);
                consumedVariantsForManifest.push({
                  ...item,
                  quantity: amountToTake,
                });
                quantityToConsume -= amountToTake;
                if (item.quantity > amountToTake) {
                  remainingItems.push({
                    ...item,
                    quantity: item.quantity - amountToTake,
                  });
                }
              }
              tempLooseItems = [...otherItems, ...remainingItems];
            }
          });
          const promoCartItem: CartItem = {
            id: promo.id,
            name: promo.title,
            brand: "Promoción",
            priceTiers: [],
            imageUrls: [],
            quantity: 1,
            isPromo: true,
            customTotal: promo.totalPrice,
            includedItems: consumedVariantsForManifest,
            finalPrice: promo.totalPrice,
            discountPercentage: 0,
            manualTotal: null,
            manualPercentage: 0,
          };
          processedItems = [
            ...processedItems.filter((item) => item.isPromo),
            ...tempLooseItems,
            promoCartItem,
          ];
          break;
        }
      }
      if (!promoSwappedThisIteration) {
        break;
      }
    }
  }

  const brandTotalQuantities = new Map<string, number>();
  processedItems.forEach((item) => {
    if (!item.isPromo && item.brand) {
      const currentTotal = brandTotalQuantities.get(item.brand) || 0;
      brandTotalQuantities.set(item.brand, currentTotal + item.quantity);
    }
  });

  const processedVolumeBrands = new Set<string>(); // To track which brand discounts have been added

  processedItems.forEach((item) => {
    if (item.isPromo) {
      const promoDefinition = getPromotions().find((p) => p.id === item.id);
      const basePromoPrice = promoDefinition ? promoDefinition.totalPrice : 0;
      const promoTotal = basePromoPrice * item.quantity;
      finalTotal += promoTotal;
      const promoSubtotal = item.includedItems!.reduce((sum, includedItem) => {
        const variantData = getProducts()
          .flatMap((p) => p.variants || [p])
          .find((v) => v.id === includedItem.id);
        const basePrice = variantData?.priceTiers?.[0]?.pricePerUnit || 0;
        return sum + basePrice * includedItem.quantity;
      }, 0);
      finalSubtotal += promoSubtotal * item.quantity;
      const discountAmount = promoSubtotal * item.quantity - promoTotal;
      if (discountAmount > 0) {
        finalDiscountDetails.push({
          id: item.id,
          label: item.name,
          amount: discountAmount,
        });
      }
    } else {
      const basePrice = item.priceTiers?.[0]?.pricePerUnit || 0;
      let effectivePrice = basePrice;
      let discountLabel = "";
      let appliedTier: PriceTier | null = null;
      if (
        item.manualPricePerUnit !== null &&
        item.manualPricePerUnit !== undefined
      ) {
        effectivePrice = item.manualPricePerUnit;
        discountLabel = `Precio Manual (${item.name})`;
      } else if (item.manualPercentage > 0) {
        const discount = basePrice * (item.manualPercentage / 100);
        effectivePrice = basePrice - discount;
        discountLabel = `Descuento Manual (${item.manualPercentage}%)`;
      } else {
        const totalQuantityForBrand = brandTotalQuantities.get(item.brand) || 0;
        if (item.priceTiers) {
          for (const tier of item.priceTiers) {
            if (totalQuantityForBrand >= tier.minQuantity) {
              effectivePrice = tier.pricePerUnit;
              appliedTier = tier;
            }
          }
        }
        if (appliedTier) {
          discountLabel = `Promo x${appliedTier.minQuantity} (${item.brand})`;
        }
      }

      const lineSubtotal = basePrice * item.quantity;
      const lineTotal = effectivePrice * item.quantity;
      finalSubtotal += lineSubtotal;
      finalTotal += lineTotal;

      const discountAmount = lineSubtotal - lineTotal;

      // =========================== THE FIX IS HERE ===========================
      // If a volume tier was applied, calculate the TOTAL discount for the BRAND
      // and add it only ONCE.
      if (appliedTier && item.brand && !processedVolumeBrands.has(item.brand)) {
        const itemsOfThisBrand = processedItems.filter(
          (i) => i.brand === item.brand && !i.isPromo
        );
        const totalBrandSubtotal = itemsOfThisBrand.reduce((sum, brandItem) => {
          const brandItemBasePrice =
            brandItem.priceTiers?.[0]?.pricePerUnit || 0;
          return sum + brandItemBasePrice * brandItem.quantity;
        }, 0);
        const totalBrandTotal = itemsOfThisBrand.reduce((sum, brandItem) => {
          return sum + effectivePrice * brandItem.quantity;
        }, 0);
        const totalBrandDiscount = totalBrandSubtotal - totalBrandTotal;

        if (totalBrandDiscount > 0) {
          finalDiscountDetails.push({
            id: `volume-${item.brand}`,
            label: `Promo x${appliedTier.minQuantity} (${item.brand})`,
            amount: totalBrandDiscount,
          });
        }
        processedVolumeBrands.add(item.brand);
      } else if (discountAmount > 0 && !appliedTier) {
        // This handles manual discounts, which are still per-item.
        finalDiscountDetails.push({
          id: `manual-${item.id}`,
          label: discountLabel,
          amount: discountAmount,
        });
      }
      // =======================================================================
    }
  });

  const finalCartItems = processedItems.map((item) => {
    if (item.isPromo) {
      const promoDefinition = getPromotions().find((p) => p.id === item.id);
      const basePromoPrice = promoDefinition ? promoDefinition.totalPrice : 0;
      const subtotalForItem =
        item.includedItems!.reduce((sum, i) => {
          const variantData = getProducts()
            .flatMap((p) => p.variants || [p])
            .find((v) => v.id === i.id);
          const basePrice = variantData?.priceTiers?.[0]?.pricePerUnit || 0;
          return sum + basePrice * i.quantity;
        }, 0) * item.quantity;
      const totalForItem = basePromoPrice * item.quantity;
      const discount = subtotalForItem - totalForItem;
      return {
        ...item,
        customTotal: totalForItem,
        discountPercentage:
          subtotalForItem > 0 ? (discount / subtotalForItem) * 100 : 0,
      };
    }

    const basePrice = item.priceTiers?.[0]?.pricePerUnit || 0;
    let effectivePrice = basePrice;
    if (
      item.manualPricePerUnit !== null &&
      item.manualPricePerUnit !== undefined
    ) {
      effectivePrice = item.manualPricePerUnit;
    } else if (item.manualPercentage > 0) {
      const discount = basePrice * (item.manualPercentage / 100);
      effectivePrice = basePrice - discount;
    } else {
      const totalQuantityForBrand = brandTotalQuantities.get(item.brand) || 0;
      if (item.priceTiers) {
        for (const tier of item.priceTiers) {
          if (totalQuantityForBrand >= tier.minQuantity) {
            effectivePrice = tier.pricePerUnit;
          }
        }
      }
    }
    const lineTotal = effectivePrice * item.quantity;
    const lineSubtotal = basePrice * item.quantity;
    const discount = lineSubtotal - lineTotal;
    return {
      ...item,
      customTotal: lineTotal,
      discountPercentage:
        lineSubtotal > 0 ? (discount / lineSubtotal) * 100 : 0,
    };
  });

  return {
    items: finalCartItems,
    subtotal: finalSubtotal,
    total: finalTotal,
    discountDetails: finalDiscountDetails,
  };
}

export const useCartStore = create(
  persist<CartState>(
    (set, get) => ({
      items: [],
      subtotal: 0,
      total: 0,
      discountDetails: [],
      mode: "creating",
      originalOrder: null,
      autoApplyPromos: true,

      toggleAutoApplyPromos: () => {
        const newStatus = !get().autoApplyPromos;
        set({ autoApplyPromos: newStatus });
        set(recalculateAndSetState(get().items, newStatus));
      },

      getOrderForEdit: () => {
        const { mode, originalOrder } = get();
        if (mode === "editing") {
          return originalOrder;
        }
        return null;
      },

      loadOrderForEdit: (order) => {
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
          const parentId = parentDetails?.id;

          return {
            ...orderItem,
            priceTiers: baseDetails?.priceTiers || [],
            parentId: parentId,
            imageUrls:
              baseDetails?.imageUrls ||
              parentDetails?.imageUrls ||
              (baseDetails as Product)?.imageUrls ||
              [],
            manualTotal: orderItem.finalPrice,
            manualPercentage: orderItem.discountPercentage,
            customTotal: orderItem.finalPrice,
          };
        });

        set({
          items: loadedItems,
          originalOrder: order,
          mode: "editing",
          autoApplyPromos: order.autoApplyPromos ?? true,
        });
        set(recalculateAndSetState(loadedItems, get().autoApplyPromos));
      },

      addMultipleToCart: (parentProduct, quantities) => {
        // ======================= ADD THIS DEBUG LOG =======================
        console.log("--- DEBUG: addMultipleToCart called ---");
        console.log("Parent Product:", parentProduct.name);
        // Convert the Map to an object for easier viewing in the console
        const quantitiesObject = Object.fromEntries(quantities.entries());
        console.log("Quantities to add:", quantitiesObject);
        // ================================================================

        let updatedItems = [...get().items];
        quantities.forEach((quantity, variantId) => {
          if (quantity > 0) {
            const variant = parentProduct.variants?.find(
              (v) => v.id === variantId
            );
            if (!variant) return;

            const parentId =
              parentProduct.variants && parentProduct.variants.length > 1
                ? parentProduct.id
                : undefined;

            const itemToAdd: CartItem = {
              ...parentProduct,
              id: variant.id,
              name: variant.name,
              priceTiers: variant.priceTiers || [],
              imageUrls: variant.imageUrls || parentProduct.imageUrls,
              parentId,
              variants: [],
              quantity,
              customTotal: null,
              discountPercentage: 0,
              manualTotal: null,
              manualPercentage: 0,
            };

            const existingItemIndex = updatedItems.findIndex(
              (item) => item.id === variantId
            );
            if (existingItemIndex > -1) {
              updatedItems[existingItemIndex].quantity += quantity;
            } else {
              updatedItems.push(itemToAdd);
            }
          }
        });
        set(recalculateAndSetState(updatedItems, get().autoApplyPromos));
      },

      setItemManualPricePerUnit: (itemId, price) => {
        const updatedItems = get().items.map((item) =>
          item.id === itemId
            ? {
                // When a manual price is set, clear other manual overrides
                ...item,
                manualPricePerUnit: price,
                manualTotal: null,
                manualPercentage: 0,
              }
            : item
        );
        set(recalculateAndSetState(updatedItems, get().autoApplyPromos));
      },

      addCrossPromotionToCart: (promotion) => {
        let currentItems = [...get().items];
        const newPromoItems: CartItem[] = [];
        const promoVariantIds = new Set<string>();

        promotion.items.forEach((promoItem) => {
          const result = findProductForPromoItem(promoItem.name);
          if (result) promoVariantIds.add(result.variant.id);
        });

        currentItems = currentItems.filter(
          (item) => !promoVariantIds.has(item.id as string)
        );

        promotion.items.forEach((promoItem) => {
          const result = findProductForPromoItem(promoItem.name);
          if (!result) return;
          const { parentProduct, variant } = result;
          const itemToAdd: CartItem = {
            ...parentProduct,
            id: variant.id,
            name: variant.name,
            priceTiers: variant.priceTiers || [],
            imageUrls: variant.imageUrls || parentProduct.imageUrls,
            variants: [],
            quantity: promoItem.quantity,
            customTotal: null,
            discountPercentage: 0,
            manualTotal: null,
            manualPercentage: 0,
            promoId: promotion.id,
          };
          newPromoItems.push(itemToAdd);
        });

        set(
          recalculateAndSetState(
            [...currentItems, ...newPromoItems],
            get().autoApplyPromos
          )
        );
      },

      updateQuantity: (itemId, quantity) => {
        const updatedItems = get()
          .items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          )
          .filter((item) => item.quantity > 0);
        set(recalculateAndSetState(updatedItems, get().autoApplyPromos));
      },

      removeFromCart: (itemId) => {
        const updatedItems = get().items.filter((item) => item.id !== itemId);
        set(recalculateAndSetState(updatedItems, get().autoApplyPromos));
      },

      setItemManualDiscountPercentage: (itemId, percentage) => {
        const updatedItems = get().items.map((item) =>
          item.id === itemId
            ? { ...item, manualPercentage: percentage ?? 0, manualTotal: null }
            : item
        );
        set(recalculateAndSetState(updatedItems, get().autoApplyPromos));
      },

      setItemManualTotal: (itemId, total) => {
        const updatedItems = get().items.map((item) =>
          item.id === itemId
            ? { ...item, manualTotal: total, manualPercentage: 0 }
            : item
        );
        set(recalculateAndSetState(updatedItems, get().autoApplyPromos));
      },

      clearCart: () => {
        set({
          items: [],
          subtotal: 0,
          total: 0,
          discountDetails: [],
          mode: "creating",
          originalOrder: null,
        });
      },
    }),
    {
      name: "suvanza-cart-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
