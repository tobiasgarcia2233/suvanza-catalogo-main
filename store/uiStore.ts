// src/store/uiStore.ts
import { create } from "zustand";
import { Product } from "@/types";
import React from "react";

export interface ConfirmationModalProps {
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
}

// 1. Add new interface for the gallery content
export interface GalleryModalContent {
  images: string[];
  title: string;
}

interface UIState {
  isDetailModalOpen: boolean;
  isCartOpen: boolean;
  isOrderInfoModalOpen: boolean;
  isModalOpen: boolean;
  selectedProduct: Product | null;
  isConfirmationModalOpen: boolean;
  confirmationModalProps: ConfirmationModalProps | null;

  // Seller "Mis ventas" panel — its open state lives here (rather than as
  // local state on the panel itself) so the navbar link can toggle it too.
  isSellerOrdersOpen: boolean;
  openSellerOrders: () => void;
  closeSellerOrders: () => void;

  // 2. Add new state for the gallery modal
  isGalleryModalOpen: boolean;
  galleryModalContent: GalleryModalContent | null;

  openProductDetail: (product: Product) => void;
  closeProductDetail: () => void;
  openCart: () => void;
  closeCart: () => void;
  openOrderInfoModal: () => void;
  closeOrderInfoModal: () => void;
  openConfirmationModal: (props: ConfirmationModalProps) => void;
  closeConfirmationModal: () => void;

  // 3. Add new actions for the gallery modal
  openGalleryModal: (content: GalleryModalContent) => void;
  closeGalleryModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isDetailModalOpen: false,
  isCartOpen: false,
  isOrderInfoModalOpen: false,
  isModalOpen: false,
  selectedProduct: null,
  isConfirmationModalOpen: false,
  confirmationModalProps: null,
  isGalleryModalOpen: false, // 4. Initialize new state
  galleryModalContent: null, // 4. Initialize new state
  isSellerOrdersOpen: false,

  openSellerOrders: () => set({ isSellerOrdersOpen: true }),
  closeSellerOrders: () => set({ isSellerOrdersOpen: false }),

  openProductDetail: (product) =>
    set({
      selectedProduct: product,
      isDetailModalOpen: true,
      isModalOpen: true,
    }),

  closeProductDetail: () =>
    set((state) => ({
      isDetailModalOpen: false,
      isModalOpen:
        state.isCartOpen ||
        state.isOrderInfoModalOpen ||
        state.isConfirmationModalOpen ||
        state.isGalleryModalOpen, // 5. Update checker
    })),

  openCart: () => set({ isCartOpen: true, isModalOpen: true }),

  closeCart: () =>
    set((state) => ({
      isCartOpen: false,
      isModalOpen:
        state.isDetailModalOpen ||
        state.isOrderInfoModalOpen ||
        state.isConfirmationModalOpen ||
        state.isGalleryModalOpen, // 5. Update checker
    })),

  openOrderInfoModal: () =>
    set({ isOrderInfoModalOpen: true, isModalOpen: true }),

  closeOrderInfoModal: () =>
    set((state) => ({
      isOrderInfoModalOpen: false,
      isModalOpen:
        state.isDetailModalOpen ||
        state.isCartOpen ||
        state.isConfirmationModalOpen ||
        state.isGalleryModalOpen, // 5. Update checker
    })),

  openConfirmationModal: (props) =>
    set({
      confirmationModalProps: props,
      isConfirmationModalOpen: true,
      isModalOpen: true,
    }),

  closeConfirmationModal: () =>
    set((state) => ({
      isConfirmationModalOpen: false,
      confirmationModalProps: null,
      isModalOpen:
        state.isDetailModalOpen ||
        state.isCartOpen ||
        state.isOrderInfoModalOpen ||
        state.isGalleryModalOpen, // 5. Update checker
    })),

  // 6. Implement new actions
  openGalleryModal: (content) =>
    set({
      galleryModalContent: content,
      isGalleryModalOpen: true,
      isModalOpen: true,
    }),

  closeGalleryModal: () =>
    set((state) => ({
      isGalleryModalOpen: false,
      galleryModalContent: null,
      isModalOpen:
        state.isDetailModalOpen ||
        state.isCartOpen ||
        state.isOrderInfoModalOpen ||
        state.isConfirmationModalOpen,
    })),
}));
