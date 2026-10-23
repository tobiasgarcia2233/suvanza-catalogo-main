import { calculateCheckout, CheckoutPricingError } from "@/lib/serverCheckoutPricing";
import { getAllProducts, getAllPromotions } from "@/lib/productQueries";
import { NextResponse } from "next/server";
import { createOrder, fetchOrdersBySeller } from "@/lib/orderQueries";
import { getSellerByName, getSellerBySlug } from "@/lib/sellerQueries";
import {
  assertSellerEventOrder,
  EventOrderError,
  INDIVIDUAL_EVENT_SLUG,
} from "@/lib/eventQueries";

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
    return NextResponse.json({ message: "Link de ventas no encontrado." }, { status: 404 });
  }

  // ?event=individual → orders outside any event; ?event=<id> → that event.
  const event = searchParams.get("event");
  const eventId =
    event === null ? undefined : event === INDIVIDUAL_EVENT_SLUG ? null : event;

  const orders = await fetchOrdersBySeller(seller.name, eventId);
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
        { message: "Este link no tiene acceso para cargar ventas." },
        { status: 403 },
      );
    }

    const eventId: string | null =
      typeof body.eventId === "string" && body.eventId ? body.eventId : null;
    const [products, promotions] = await Promise.all([getAllProducts(), getAllPromotions()]);
    const priced = calculateCheckout(body.checkoutCart, products, promotions, body.total);
    if (eventId) {
      await assertSellerEventOrder({
        eventId,
        sellerId: seller.id,
        itemIds: priced.items.map((item) => String(item.id)),
        promotionIds: Array.isArray(priced.promos)
          ? priced.promos.map((p: { id: string }) => String(p.id))
          : [],
      });
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
      total: priced.total,
      discounted_amount: priced.discounted_amount,
      items: priced.items,
      buyer_details: {
        name: body.buyerName,
        dni: body.buyerDni,
        phone: body.buyerPhone,
      },
      seller_name: seller.name,
      autoApplyPromos: priced.promos.length > 0,
      promos_sold: priced.promos,
      event_id: eventId,
    });

    return NextResponse.json({ message: "Order created", id }, { status: 201 });
  } catch (error) {
    if (error instanceof EventOrderError || error instanceof CheckoutPricingError) {
      return NextResponse.json({ message: error.message }, { status: error instanceof CheckoutPricingError ? 400 : error.status });
    }
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
