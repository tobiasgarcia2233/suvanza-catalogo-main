// Custom next/image loader: resizing and format negotiation happen at
// Cloudinary's CDN instead of the Next.js optimizer. Browsers fetch images
// straight from res.cloudinary.com — one hop, edge-delivered — and `f_auto`
// serves AVIF/WebP per client. Non-Cloudinary sources (the local logo, data
// URIs) pass through untouched.

interface CloudinaryLoaderArgs {
  src: string;
  width: number;
}

const UPLOAD_SEGMENT = "/image/upload/";

export default function cloudinaryImageLoader({
  src,
  width,
}: CloudinaryLoaderArgs): string {
  const uploadAt = src.indexOf(UPLOAD_SEGMENT);
  if (!src.includes("res.cloudinary.com") || uploadAt === -1) {
    return src;
  }

  const transforms = [
    "f_auto", // AVIF / WebP depending on the browser
    "q_auto:eco", // aggressive but visually fine for a catalog
    `w_${width}`, // width comes from next/image's srcset / sizes
    "c_limit", // never upscale past the original
  ].join(",");

  const head = src.slice(0, uploadAt + UPLOAD_SEGMENT.length);
  const tail = src.slice(uploadAt + UPLOAD_SEGMENT.length);
  return `${head}${transforms}/${tail}`;
}
