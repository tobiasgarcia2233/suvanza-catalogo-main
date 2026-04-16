import { NextResponse } from "next/server";
import { signUpload } from "@/lib/cloudinary";
import { readSessionFromCookie } from "@/lib/auth";

// Returns a signed payload the client can send directly to Cloudinary's upload endpoint.
export async function POST(request: Request) {
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { folder?: string };
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!apiKey || !cloudName) {
    return NextResponse.json(
      { message: "Cloudinary not configured" },
      { status: 500 },
    );
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = body.folder || "suvanza/products";
  const paramsToSign: Record<string, string | number> = { timestamp, folder };
  const signature = signUpload(paramsToSign);

  return NextResponse.json({
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
  });
}
