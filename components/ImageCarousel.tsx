// src/components/ImageCarousel.tsx
"use client";

import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";

interface CarouselItem {
  src: string;
  alt: string;
  type: "image" | "video";
}

interface ImageCarouselProps {
  images: CarouselItem[];
}

export function ImageCarousel({ images }: ImageCarouselProps) {
  return (
    <div className="w-full h-full">
      <Swiper
        modules={[Navigation]}
        loop={true}
        navigation={true}
        className="rounded-lg w-full h-full media-carousel"
      >
        {images.map((item, index) => (
          <SwiperSlide
            key={index}
            className="flex justify-center items-center bg-black"
          >
            {item.type === "image" ? (
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="100vw"
                className="rounded-lg object-contain"
              />
            ) : (
              <video
                src={item.src}
                controls
                autoPlay
                muted
                loop
                playsInline
                className="rounded-lg max-w-full max-h-full"
              />
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
