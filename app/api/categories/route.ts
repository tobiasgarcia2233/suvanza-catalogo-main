import { NextResponse } from "next/server";
import { getCachedCategories } from "@/lib/catalogCache";

export async function GET() {
  const categories = await getCachedCategories();
  return NextResponse.json({ categories });
}
