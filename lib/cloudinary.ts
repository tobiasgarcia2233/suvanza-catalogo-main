import "server-only";
import { v2 as cloudinary } from "cloudinary";

const cloud_name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const api_key = process.env.CLOUDINARY_API_KEY;
const api_secret = process.env.CLOUDINARY_API_SECRET;

if (cloud_name && api_key && api_secret) {
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
}

export { cloudinary };

export function signUpload(paramsToSign: Record<string, string | number>) {
  const api_secret = process.env.CLOUDINARY_API_SECRET!;
  return cloudinary.utils.api_sign_request(paramsToSign, api_secret);
}
