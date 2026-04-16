// src/components/GalleryModal.tsx
"use client";

import { useUIStore } from "@/store/uiStore";
import { ImageCarousel } from "./ImageCarousel";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Determines if a URL is for a video or an image based on its extension.
 * @param url The URL of the media file.
 * @returns 'video', 'image', or 'image' as a fallback.
 */
const getMediaType = (url: string): "video" | "image" => {
  const videoExtensions = [".mp4", ".webm", ".mov"];
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const lowercasedUrl = url.toLowerCase();

  if (videoExtensions.some((ext) => lowercasedUrl.endsWith(ext))) {
    return "video";
  }
  // No need to check for image extensions, it's the fallback
  return "image";
};

export function GalleryModal() {
  const { isGalleryModalOpen, galleryModalContent, closeGalleryModal } =
    useUIStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isGalleryModalOpen) {
      document.body.style.overflow = "hidden";
      gsap.to(backdropRef.current, { opacity: 1, duration: 0.3 });
      gsap.fromTo(
        modalRef.current,
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: "power3.out" }
      );
    } else {
      document.body.style.overflow = "";
    }
  }, [isGalleryModalOpen]);

  const handleClose = () => {
    gsap.to([modalRef.current, backdropRef.current], {
      opacity: 0,
      duration: 0.2,
      onComplete: () => {
        closeGalleryModal();
      },
    });
  };

  if (!isGalleryModalOpen || !galleryModalContent) return null;

  // Adapt the string array to the richer format that ImageCarousel now expects
  const mediaForCarousel = galleryModalContent.images.map((url) => ({
    src: url,
    alt: galleryModalContent.title,
    type: getMediaType(url), // Determine the media type for each URL
  }));

  return (
    <div
      ref={backdropRef}
      className="z-[100] fixed inset-0 flex justify-center items-center bg-black bg-opacity-70 opacity-0 p-4"
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        className="relative opacity-0 w-full h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="top-2 right-2 z-10 absolute flex items-center gap-4">
          <h3 className="bg-black bg-opacity-50 px-3 py-1 rounded-md font-bold text-white">
            {galleryModalContent.title}
          </h3>
          <button
            onClick={handleClose}
            className="bg-black bg-opacity-50 hover:bg-opacity-75 p-2 rounded-full text-white transition"
          >
            <X size={24} />
          </button>
        </div>
        <ImageCarousel images={mediaForCarousel} />
      </div>
    </div>
  );
}
