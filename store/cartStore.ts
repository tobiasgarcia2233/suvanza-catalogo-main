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
import { getProducts, getPromotions, useProductsStore } from "@/store/productsStore";
import {
  getAvailableCombos, preserveComboAdjustments,
  allocateComboSelection, selectionLimits, isAutomaticBundle,
  type ComboCandidate,
} from "@/lib/comboSelection";

export interface ComboOption {
  id: string;
  promotion: CrossPromotion;
  selectedQuantity: number;
  maxQuantity: number;
}

interface ComboSelection {
  revision: number;
  inputKey: string;
  options: ComboOption[];
  availableItems: CartItem[];
  originalItems: CartItem[];
  candidates: ComboCandidate[];
  quantities: Record<string, number>;
  previewItems: CartItem[];
  total: number;
  applyLimitation: string | null;
}

let selectionRevision = 0;

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
    if (product.brand?.toLowerCase() === lowerItemName) {
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
  editSellerSlug: string | null; // Set when a seller edits their own order via their personal link, so the PATCH request can be authorized without an admin session.
  items: CartItem[];
  subtotal: number;
  total: number;
  discountDetails: DiscountDetail[];
  loadOrderForEdit: (order: Order, sellerSlug?: string) => void;
  getOrderForEdit: () => Order | null; // Added getter to the interface
  addMultipleToCart: (
    parentProduct: Product,
    quantities: Map<string, number>
  ) => void;
  addCrossPromotionToCart: (
    promotion: CrossPromotion,
    quantity?: number,
    replaceLooseItems?: boolean
  ) => void;
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
  evaluateCombos: () => void;
  removeCombos: () => void;
  comboNotice: string | null;
  comboSelection: ComboSelection | null;
  updateComboSelectionQuantity: (id: string, quantity: number, revision: number) => void;
  applyComboSelection: (revision: number) => void;
  cancelComboSelection: () => void;
}

export function priceCart(
  items: CartItem[],
  keepCombos: boolean
): Pick<CartState, "items" | "subtotal" | "total" | "discountDetails"> {
  let finalTotal = 0;
  let finalSubtotal = 0;
  const finalDiscountDetails: DiscountDetail[] = [];
  let processedItems = [...items];

  if (!keepCombos) {
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
      const promoDefinition = getPromotions().find((p) => p.id === (item.promoId ?? item.id));
      const basePromoPrice = promoDefinition
        ? promoDefinition.totalPrice
        : item.customTotal ?? 0;

      let effectivePromoPrice = basePromoPrice;
      if (
        item.manualPricePerUnit !== null &&
        item.manualPricePerUnit !== undefined
      ) {
        effectivePromoPrice = item.manualPricePerUnit;
      } else if (item.manualPercentage > 0) {
        effectivePromoPrice = basePromoPrice * (1 - item.manualPercentage / 100);
      }

      const promoTotal = effectivePromoPrice * item.quantity;
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
      const promoDefinition = getPromotions().find((p) => p.id === (item.promoId ?? item.id));
      const basePromoPrice = promoDefinition
        ? promoDefinition.totalPrice
        : item.customTotal ?? 0;

      let effectivePromoPrice = basePromoPrice;
      if (
        item.manualPricePerUnit !== null &&
        item.manualPricePerUnit !== undefined
      ) {
        effectivePromoPrice = item.manualPricePerUnit;
      } else if (item.manualPercentage > 0) {
        effectivePromoPrice = basePromoPrice * (1 - item.manualPercentage / 100);
      }

      const subtotalForItem =
        item.includedItems!.reduce((sum, i) => {
          const variantData = getProducts()
            .flatMap((p) => p.variants || [p])
            .find((v) => v.id === i.id);
          const basePrice = variantData?.priceTiers?.[0]?.pricePerUnit || 0;
          return sum + basePrice * i.quantity;
        }, 0) * item.quantity;
      const totalForItem = effectivePromoPrice * item.quantity;
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
    items: finalCartItems.map((item, index) => ({
      ...item,
      // Distinct manual adjustments may leave two lines for the same variant.
      // Keep its product ID intact, but let the UI edit each line separately.
      cartLineKey: finalCartItems.some((other, otherIndex) => otherIndex !== index && other.id === item.id)
        ? `line:${item.id}:${index}` : undefined,
    })),
    subtotal: finalSubtotal,
    total: finalTotal,
    discountDetails: finalDiscountDetails,
  };
}

function selectionInputKey(items: CartItem[]): string {
  const purchase = (item: CartItem): unknown => ({
    id: item.id, quantity: item.quantity, name: item.name, brand: item.brand,
    priceTiers: item.priceTiers, isPromo: item.isPromo, promoId: item.promoId,
    comboSource: item.comboSource, comboChoiceKey: item.comboChoiceKey,
    manualPercentage: item.manualPercentage, manualPricePerUnit: item.manualPricePerUnit,
    manualTotal: item.manualTotal, includedItems: item.includedItems?.map(purchase),
  });
  return JSON.stringify([items.map(purchase), getProducts(), getPromotions()]);
}

function updateSelectionPreview(selection: ComboSelection, quantities: Record<string, number>): ComboSelection | null {
  const allocated = allocateComboSelection(selection.availableItems,
    selection.candidates.map((candidate) => candidate.promotion), quantities);
  if (!allocated) return null;
  const limits = selectionLimits(selection.availableItems, selection.candidates, quantities);
  const protectedSelection = preserveComboAdjustments(allocated, selection.originalItems);
  const priced = priceCart(protectedSelection.items, true);
  return {
    ...selection,
    quantities,
    previewItems: priced.items!,
    total: priced.total!,
    applyLimitation: protectedSelection.limitation,
    options: selection.candidates.map(({ promotion }) => ({
      id: promotion.id, promotion,
      selectedQuantity: quantities[promotion.id] ?? 0,
      maxQuantity: limits[promotion.id],
    })),
  };
}

function buildSelection(items: CartItem[], candidates: ComboCandidate[], originalItems: CartItem[]): ComboSelection {
  return updateSelectionPreview({
    revision: ++selectionRevision, inputKey: selectionInputKey(originalItems), availableItems: items, candidates, originalItems,
    quantities: {}, options: [], previewItems: [], total: 0, applyLimitation: null,
  }, {})!;
}

// Only a changed purchase invalidates the preview; committing an unchanged
// input (for example on blur) must not dismiss the dialog.
// Combo discovery and application are exclusively explicit vendor actions.
function recalculateAndSetState(items: CartItem[]): Partial<CartState> {
  const selection = useCartStore.getState().comboSelection;
  return {
    ...priceCart(items, true),
    comboSelection: selection?.inputKey === selectionInputKey(items) ? selection : null,
    comboNotice: null,
  };
}
export const useCartStore = create(
  persist<CartState, [], [], Omit<CartState, "comboSelection" | "comboNotice">>(
    (set, get) => ({
      items: [],
      subtotal: 0,
      total: 0,
      discountDetails: [],
      mode: "creating",
      originalOrder: null,
      editSellerSlug: null,
      comboSelection: null,
      comboNotice: null,

      evaluateCombos: () => {
        if (!useProductsStore.getState().hydrated) return;
        const state = get();
        const { availableItems, candidates, limitation } = getAvailableCombos(state.items, getPromotions());
        if (!availableItems || !candidates.length) {
          set({ comboSelection: null, comboNotice: limitation });
          return;
        }
        if (candidates.length === 1) {
          const candidate = candidates[0];
          const allocated = allocateComboSelection(availableItems, [candidate.promotion], {
            [candidate.promotion.id]: candidate.repetitions,
          });
          if (allocated) {
            const protectedSelection = preserveComboAdjustments(allocated, state.items);
            if (protectedSelection.limitation) set({ comboNotice: protectedSelection.limitation });
            else set({ ...recalculateAndSetState(protectedSelection.items), comboSelection: null });
          }
          return;
        }
        // Opening previews a complete regrouping without touching the purchase.
        set({ comboSelection: buildSelection(availableItems, candidates, state.items), comboNotice: null });
      },

      removeCombos: () => {
        const items = get().items;
        if (!items.some((item) => item.isPromo)) return;
        const { limitation } = getAvailableCombos(items, []);
        if (limitation) {
          set({ comboNotice: limitation });
          return;
        }
        // Reuse the old toggle-off pricing, including variant merging and the
        // existing removal of bundle-level (not constituent) manual adjustments.
        set({ ...priceCart(items, false), comboSelection: null, comboNotice: null });
      },

      cancelComboSelection: () => {
        set({ comboSelection: null });
      },

      updateComboSelectionQuantity: (id, quantity, revision) => {
        const state = get();
        const selection = state.comboSelection;
        if (!selection || selection.revision !== revision) return;
        if (selection.inputKey !== selectionInputKey(state.items)) {
          set({ comboSelection: null });
          return;
        }
        const option = selection.options.find((option) => option.id === id);
        if (!option || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > option.maxQuantity) return;
        const updated = updateSelectionPreview(selection, { ...selection.quantities, [id]: quantity });
        if (updated) set({ comboSelection: updated });
      },

      applyComboSelection: (revision) => {
        const state = get();
        const selection = state.comboSelection;
        if (!selection || selection.revision !== revision) return;
        if (selection.inputKey !== selectionInputKey(state.items)) {
          set({ comboSelection: null });
          return;
        }
        if (!Object.values(selection.quantities).some((quantity) => quantity > 0)) return;
        const updated = updateSelectionPreview(selection, selection.quantities);
        if (!updated || updated.applyLimitation) return;
        // Commit exactly the confirmed allocation; never discover more combos.
        set({ ...recalculateAndSetState(updated.previewItems), comboSelection: null });
      },

      getOrderForEdit: () => {
        const { mode, originalOrder } = get();
        if (mode === "editing") {
          return originalOrder;
        }
        return null;
      },

      loadOrderForEdit: (order, sellerSlug) => {
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
          editSellerSlug: sellerSlug ?? null,
        });
        set(recalculateAndSetState(loadedItems));
      },

      addMultipleToCart: (parentProduct, quantities) => {
        // ======================= ADD THIS DEBUG LOG =======================
        console.log("--- DEBUG: addMultipleToCart called ---");
        console.log("Parent Product:", parentProduct.name);
        // Convert the Map to an object for easier viewing in the console
        const quantitiesObject = Object.fromEntries(quantities.entries());
        console.log("Quantities to add:", quantitiesObject);
        // ================================================================

        let updatedItems = get().items.map((item) => ({ ...item }));
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
        set(recalculateAndSetState(updatedItems));
      },

      setItemManualPricePerUnit: (itemId, price) => {
        const updatedItems = get().items.map((item) =>
          (item.cartLineKey ?? item.id) === itemId
            ? {
                // When a manual price is set, clear other manual overrides
                ...item,
                manualPricePerUnit: price,
                manualTotal: null,
                manualPercentage: 0,
              }
            : item
        );
        set(recalculateAndSetState(updatedItems));
      },

      addCrossPromotionToCart: (
        promotion,
        quantity = 1,
        replaceLooseItems = true
      ) => {
        const qty = Math.max(1, Math.floor(quantity || 1));
        let currentItems = [...get().items];

        const includedItems: CartItem[] = [];
        const promoVariantIds = new Set<string>();

        promotion.items.forEach((promoItem) => {
          const result = findProductForPromoItem(promoItem.name);
          if (!result) return;
          const { parentProduct, variant } = result;
          promoVariantIds.add(variant.id as string);
          includedItems.push({
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
          });
        });

        // Optionally drop loose items that this promo covers (used when the promo
        // is meant to replace items already in the cart). When false, the loose
        // items the user explicitly added are kept alongside the promo bundle.
        if (replaceLooseItems) {
          currentItems = currentItems.filter(
            (item) => !promoVariantIds.has(item.id as string)
          );
        }

        const existingIndex = currentItems.findIndex(
          (item) => item.isPromo && !isAutomaticBundle(item) &&
            (item.promoId ?? item.id) === promotion.id &&
            JSON.stringify(item.includedItems?.map((included) => [included.id, included.quantity])) ===
              JSON.stringify(includedItems.map((included) => [included.id, included.quantity]))
        );

        if (existingIndex > -1) {
          currentItems[existingIndex] = {
            ...currentItems[existingIndex],
            quantity: currentItems[existingIndex].quantity + qty,
            comboSource: "explicit",
          };
        } else {
          let bundleId = promotion.id;
          while (currentItems.some((item) => item.id === bundleId)) bundleId += ":explicit";
          currentItems.push({
            id: bundleId,
            promoId: promotion.id,
            name: promotion.title,
            brand: "Promoción",
            priceTiers: [],
            imageUrls: [],
            quantity: qty,
            isPromo: true,
            comboSource: "explicit",
            customTotal: promotion.totalPrice,
            includedItems,
            finalPrice: promotion.totalPrice,
            discountPercentage: 0,
            manualTotal: null,
            manualPercentage: 0,
          });
        }

        set(recalculateAndSetState(currentItems));
      },

      updateQuantity: (itemId, quantity) => {
        const updatedItems = get()
          .items.map((item) =>
            (item.cartLineKey ?? item.id) === itemId ? { ...item, quantity } : item
          )
          .filter((item) => item.quantity > 0);
        set(recalculateAndSetState(updatedItems));
      },

      removeFromCart: (itemId) => {
        const updatedItems = get().items.filter((item) => (item.cartLineKey ?? item.id) !== itemId);
        set(recalculateAndSetState(updatedItems));
      },

      setItemManualDiscountPercentage: (itemId, percentage) => {
        const updatedItems = get().items.map((item) =>
          (item.cartLineKey ?? item.id) === itemId
            ? { ...item, manualPercentage: percentage ?? 0, manualTotal: null }
            : item
        );
        set(recalculateAndSetState(updatedItems));
      },

      setItemManualTotal: (itemId, total) => {
        const updatedItems = get().items.map((item) =>
          (item.cartLineKey ?? item.id) === itemId
            ? { ...item, manualTotal: total, manualPercentage: 0 }
            : item
        );
        set(recalculateAndSetState(updatedItems));
      },

      clearCart: () => {
        set({
          items: [],
          subtotal: 0,
          total: 0,
          discountDetails: [],
          mode: "creating",
          originalOrder: null,
          editSellerSlug: null,
          comboSelection: null,
          comboNotice: null,
        });
      },
    }),
    {
      name: "suvanza-cart-storage",
      storage: createJSONStorage(() => localStorage),
      // A dialog is temporary. Keep the existing cart persistence format and
      // never save unconfirmed choices or snapshots of the catalog.
      partialize: ({ comboSelection, comboNotice, ...state }) => state,
      merge: (persisted, current) => {
        // Ignore legacy toggle/confirmation flags and never restore a dialog.
        const { autoApplyPromos, comboConfirmedKey, comboInputKey, comboSelection, comboNotice, ...purchase } = persisted ?? {};
        return { ...current, ...purchase, comboSelection: null, comboNotice: null };
      },
    }
  )
);

useProductsStore.subscribe((catalog, previous) => {
  if (!catalog.hydrated || (catalog.products === previous.products && catalog.promotions === previous.promotions)) return;
  // RSC refreshes / repeated hydration can supply new arrays with identical
  // contents. Reference changes alone must not reprice or dismiss a selection.
  if (JSON.stringify([catalog.products, catalog.promotions]) ===
    JSON.stringify([previous.products, previous.promotions])) return;
  const cart = useCartStore.getState();
  if (!cart.items.length) return;
  const priced = priceCart(cart.items, true);
  let selection = cart.comboSelection;
  if (selection) {
    const { availableItems, candidates } = getAvailableCombos(priced.items, catalog.promotions);
    // Refresh an already-open preview in place, retaining its revision and
    // chosen counts. Close only if those counts can no longer be allocated.
    selection = availableItems && candidates.length ? updateSelectionPreview({
      ...selection, availableItems, candidates, originalItems: priced.items,
      inputKey: selectionInputKey(priced.items),
    }, selection.quantities) : null;
  }
  useCartStore.setState({ ...priced, comboSelection: selection, comboNotice: null });
});
