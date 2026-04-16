// src/components/ConfirmationModal.tsx
"use client";

import { useUIStore } from "@/store/uiStore";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function ConfirmationModal() {
  const {
    isConfirmationModalOpen,
    confirmationModalProps,
    closeConfirmationModal,
  } = useUIStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isConfirmationModalOpen) {
      document.body.style.overflow = "hidden"; // Prevent background scrolling
      gsap.to(backdropRef.current, { opacity: 1, duration: 0.3 });
      gsap.fromTo(
        modalRef.current,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, ease: "power3.out" }
      );
    } else {
      document.body.style.overflow = ""; // Restore scrolling on close
    }
  }, [isConfirmationModalOpen]);

  const handleClose = () => {
    gsap.to([modalRef.current, backdropRef.current], {
      opacity: 0,
      duration: 0.2,
      onComplete: () => {
        closeConfirmationModal();
      },
    });
  };

  const handleConfirm = () => {
    if (confirmationModalProps?.onConfirm) {
      confirmationModalProps.onConfirm();
    }
    handleClose();
  };

  if (!isConfirmationModalOpen || !confirmationModalProps) return null;

  return (
    <div
      ref={backdropRef}
      className="z-[100] fixed inset-0 flex justify-center items-center bg-black/80 opacity-0"
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        className="bg-background shadow-xl m-4 rounded-lg w-full max-w-md"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-xl">
              {confirmationModalProps.title}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-800"
            >
              <X size={24} />
            </button>
          </div>
          <div className="text-text-secondary">
            {confirmationModalProps.message}
          </div>
        </div>
        <div className="flex justify-end gap-3 bg-gray-50 p-4 rounded-b-lg">
          <button
            onClick={handleClose}
            className="bg-white hover:bg-gray-100 px-6 py-2 border rounded-md transition-colors"
          >
            No
          </button>
          <button
            onClick={handleConfirm}
            className="bg-brand hover:bg-brand-hover px-6 py-2 rounded-md text-white transition-colors"
          >
            Sí
          </button>
        </div>
      </div>
    </div>
  );
}
