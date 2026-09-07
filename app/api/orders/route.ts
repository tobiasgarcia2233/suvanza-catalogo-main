import { NextResponse } from "next/server";
import { createOrder, fetchOrdersBySeller } from "@/lib/orderQueries";
import { getSellerByName, getSellerBySlug } from "@/lib/sellerQueries";
import type { CartItem } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sellerSlug = searchParams.get("sellerSlug");
  if (!sellerSlug) {
    return NextResponse.json(
      { message: "sellerSlug is required." },
      { status: 400 },
    );
  }

  const seller = await getSellerBySlug(sellerSlug);
  if (!seller) {
    return NextResponse.json({ message: "Vendedor no encontrado." }, { status: 404 });
  }

  const orders = await fetchOrdersBySeller(seller.name);
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      !body.buyerName ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        { message: "Missing or invalid order data." },
        { status: 400 },
      );
    }

    const now = new Date();
    const formattedSellerName = (body.sellerName || "").replace(/_/g, " ");

    const seller = await getSellerByName(formattedSellerName);
    if (!seller) {
      return NextResponse.json(
        { message: "Vendedor no autorizado." },
        { status: 403 },
      );
    }

    const id = await createOrder({
      status: "PENDING_PAYMENT",
      date: {
        day: now.getDate(),
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        hour: now.getHours(),
        minutes: now.getMinutes(),
      },
      total: body.total,
      discounted_amount: body.subtotal - body.total,
      items: body.items.map((item: CartItem) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        quantity: item.quantity,
        finalPrice: item.finalPrice ?? null,
        discountPercentage: item.discountPercentage,
      })),
      buyer_details: {
        name: body.buyerName,
        dni: body.buyerDni,
        phone: body.buyerPhone,
      },
      seller_name: seller.name,
      autoApplyPromos: !!body.autoApplyPromos,
      promos_sold: Array.isArray(body.promos) ? body.promos : null,
    });

    return NextResponse.json({ message: "Order created", id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
