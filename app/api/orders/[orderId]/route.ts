import { NextRequest, NextResponse } from "next/server";
import { deleteOrder, updateOrder, getOrder } from "@/lib/orderQueries";
import { getSellerBySlug } from "@/lib/sellerQueries";
import { readSessionFromCookie } from "@/lib/auth";
import { isOrderLocked } from "@/types";
import { assertSellerEventOrder, EventOrderError } from "@/lib/eventQueries";

interface CartLine {
  id: string | number;
  brand?: string;
  name: string;
  quantity: number;
  finalPrice: number | null;
  discountPercentage: number;
}

// Statuses the admin may set by hand. Odoo statuses only change through
// setOdooResult (bulk-transfer today, the Odoo integration later).
const ADMIN_SETTABLE_STATUSES = new Set(["PENDING_PAYMENT", "COMPLETED"]);

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;
  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ order });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await context.params;
    const sellerSlug = request.nextUrl.searchParams.get("sellerSlug");

    // Unauthenticated seller editing their own order: verify the slug is
    // whitelisted and the order actually belongs to that seller and hasn't
    // already been processed by an admin (mirrors the DELETE handler below).
    let isSellerEdit = false;
    // Set when a seller edits an order of an event: lines are checked against it.
    let sellerEvent: { eventId: string; sellerId: string } | null = null;
    if (sellerSlug) {
      const seller = await getSellerBySlug(sellerSlug);
      if (!seller) {
        return NextResponse.json({ message: "Vendedor no encontrado." }, { status: 404 });
      }
      const existing = await getOrder(orderId);
      if (!existing || existing.seller_name.toLowerCase() !== seller.name.toLowerCase()) {
        return NextResponse.json({ message: "Pedido no encontrado." }, { status: 404 });
      }
      if (isOrderLocked(existing)) {
        return NextResponse.json(
          { message: "Esta venta ya fue confirmada y no puede editarse." },
          { status: 403 },
        );
      }
      isSellerEdit = true;
      if (existing.event_id) {
        sellerEvent = { eventId: existing.event_id, sellerId: seller.id };
      }
    } else {
      const session = await readSessionFromCookie();
      if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();

    if (sellerEvent) {
      // A closed event blocks any change; new lines must belong to the event.
      await assertSellerEventOrder({
        ...sellerEvent,
        itemIds: Array.isArray(body.items)
          ? body.items.map((it: CartLine) => String(it.id))
          : [],
        promotionIds: Array.isArray(body.promos)
          ? body.promos.map((p: { id: string }) => String(p.id))
          : [],
      });
    }

    // Two shapes are accepted:
    // 1) Full edit from cart: { items, total, subtotal, buyerName, buyerDni, buyerPhone, autoApplyPromos? }
    // 2) Partial status update: { status?, notes?, payments? } — admin only.
    const patch: Parameters<typeof updateOrder>[1] = {};

    if (Array.isArray(body.items) && body.total !== undefined) {
      patch.items = body.items.map((it: CartLine) => ({
        id: String(it.id),
        brand: it.brand ?? "",
        name: it.name,
        quantity: it.quantity,
        finalPrice: it.finalPrice ?? null,
        discountPercentage: it.discountPercentage,
      }));
      patch.total = Number(body.total);
      patch.discounted_amount = Number(body.subtotal) - Number(body.total);
      patch.buyer_details = {
        name: body.buyerName,
        dni: body.buyerDni,
        phone: body.buyerPhone,
      };
      if (body.autoApplyPromos !== undefined) {
        patch.autoApplyPromos = !!body.autoApplyPromos;
      }
      if (Array.isArray(body.promos)) {
        patch.promos_sold = body.promos;
      }
    }

    // Admin-only fields: a seller editing via their personal link may only
    // touch the "full edit from cart" shape handled above.
    if (!isSellerEdit) {
      if (body.status !== undefined) {
        if (!ADMIN_SETTABLE_STATUSES.has(body.status)) {
          return NextResponse.json({ message: "Estado inválido." }, { status: 400 });
        }
        patch.status = body.status;
      }
      if (body.notes !== undefined) {
        patch.notes = body.notes === null ? null : String(body.notes);
      }
      if (body.payment_method !== undefined) {
        patch.payment_method =
          body.payment_method === null ? null : String(body.payment_method);
      }
      if (body.payments !== undefined) {
        if (body.payments === null) {
          patch.payments = null;
        } else if (Array.isArray(body.payments)) {
          const cleaned: { method: string; amount: number }[] = [];
          for (const raw of body.payments) {
            if (
              raw &&
              typeof raw === "object" &&
              typeof (raw as { method?: unknown }).method === "string" &&
              Number.isFinite(Number((raw as { amount?: unknown }).amount))
            ) {
              cleaned.push({
                method: (raw as { method: string }).method,
                amount: Number((raw as { amount: unknown }).amount),
              });
            }
          }
          patch.payments = cleaned;
        }
      }
    }

    await updateOrder(orderId, patch);
    return NextResponse.json({ message: "Order updated" });
  } catch (error) {
    if (error instanceof EventOrderError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("PATCH /api/orders/[orderId] error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await context.params;
    const sellerSlug = request.nextUrl.searchParams.get("sellerSlug");

    if (sellerSlug) {
      // Unauthenticated seller deleting their own order: verify the slug is
      // whitelisted and the order actually belongs to that seller and hasn't
      // already been processed by an admin.
      const seller = await getSellerBySlug(sellerSlug);
      if (!seller) {
        return NextResponse.json({ message: "Vendedor no encontrado." }, { status: 404 });
      }
      const order = await getOrder(orderId);
      if (!order || order.seller_name.toLowerCase() !== seller.name.toLowerCase()) {
        return NextResponse.json({ message: "Pedido no encontrado." }, { status: 404 });
      }
      if (isOrderLocked(order)) {
        return NextResponse.json(
          { message: "Esta venta ya fue confirmada y no puede eliminarse." },
          { status: 403 },
        );
      }
      if (order.event_id) {
        await assertSellerEventOrder({ eventId: order.event_id, sellerId: seller.id });
      }
    } else {
      const session = await readSessionFromCookie();
      if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
    }

    await deleteOrder(orderId);
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    if (error instanceof EventOrderError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("DELETE /api/orders/[orderId] error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
