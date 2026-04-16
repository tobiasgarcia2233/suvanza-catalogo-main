"use client";

import { Product } from "@/types";
import Image from "next/image";
import { useUIStore } from "@/store/uiStore";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

interface ProductCardProps {
  product: Product;
}

export function CatalogProductCard({ product }: ProductCardProps) {
  const { openProductDetail } = useUIStore();

  // --- MODIFICATION START ---
  // 1. Get all unique image URLs from all variants
  const allVariantImages = Array.from(
    new Set(
      product.variants?.flatMap((variant) => variant.imageUrls || []) || []
    )
  );

  // 2. Use variant images if they exist, otherwise fall back to the main product images
  const imagesToShow =
    allVariantImages.length > 0 ? allVariantImages : product.imageUrls;
  // --- MODIFICATION END ---

  const getLowestPrice = () => {
    if (product.variants && product.variants.length > 0) {
      return Math.min(
        ...product.variants
          .flatMap((v) => v.priceTiers || [])
          .map((t) => t.pricePerUnit)
      );
    }
    if (product.priceTiers.length > 0) {
      return product.priceTiers[0].pricePerUnit;
    }
    return 0;
  };

  const priceToDisplay = getLowestPrice();

  return (
    <div
      onClick={() => openProductDetail(product)}
      className="group relative flex flex-col bg-white shadow-md hover:shadow-xl rounded-xl h-screen overflow-hidden transition-shadow cursor-pointer"
    >
      {/* Image Slider Section - Top */}
      <div className="relative flex-shrink-0 w-full h-2/3">
        <Swiper
          spaceBetween={10}
          centeredSlides={true}
          autoplay={{
            delay: 3500,
            disableOnInteraction: false,
          }}
          navigation={false}
          loop={imagesToShow.length > 1} // Only loop if there is more than one image
          modules={[Autoplay, Pagination, Navigation]}
          className="w-full h-full mySwiper"
        >
          {imagesToShow.map((imageUrl, index) => (
            <SwiperSlide key={index}>
              <Image
                src={imageUrl}
                alt={`${product.name} - ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Product Details Section - Bottom */}
      <div className="flex flex-col flex-grow p-6 text-left">
        <h2 className="mb-1 font-bold text-text-primary text-3xl">
          {product.name}
        </h2>
        <p className="mb-3 text-text-secondary text-xl">{product.brand}</p>

        <p className="mb-4 overflow-hidden text-text-secondary text-sm text-ellipsis line-clamp-3">
          {product.description}
        </p>

        {/* Spacer to push price to the bottom */}
        <div className="flex-grow" />

        <p className="mt-2 font-extrabold text-brand text-2xl">
          Desde ${priceToDisplay.toLocaleString("es-CL")}
        </p>
      </div>
    </div>
  );
}
