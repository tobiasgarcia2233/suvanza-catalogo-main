import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cloudinary does the optimizing — see lib/cloudinaryImageLoader.ts.
    // With a custom loader the Next optimizer (and remotePatterns) is bypassed.
    loader: "custom",
    loaderFile: "./lib/cloudinaryImageLoader.ts",
    // The biggest image on screen is the product-detail hero (~672px CSS,
    // ~1344px @2x), so the huge 2048/3840 candidates were dead weight.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
};

export default nextConfig;
