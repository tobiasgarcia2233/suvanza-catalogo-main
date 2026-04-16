import { NextResponse } from "next/server";
import { getAllPromotions } from "@/lib/productQueries";
import { createPromotion } from "@/lib/productMutations";
import { readSessionFromCookie } from "@/lib/auth";

export async function GET() {
  const promotions = await getAllPromotions();
  return NextResponse.json({ promotions });
}

export async function POST(request: Request) {
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.title || typeof body.totalPrice !== "number") {
      return NextResponse.json(
        { message: "title and totalPrice required" },
        { status: 400 },
      );
    }
    const id = await createPromotion(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Error" },
      { status: 500 },
    );
  }
}
