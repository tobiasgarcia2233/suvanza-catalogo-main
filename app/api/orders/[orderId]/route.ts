import { NextRequest, NextResponse } from "next/server";
import { deleteOrder, updateOrder, getOrder } from "@/lib/orderQueries";
import { getSellerBySlug } from "@/lib/sellerQueries";
import { readSessionFromCookie } from "@/lib/auth";

interface CartLine {
  id: string | number;
  brand?: string;
  name: string;
  quantity: number;
  finalPrice: number | null;
  discountPercentage: number;
}

// A sale is final once the shop confirms payment ("COMPLETED") or it's been
// transferred to Odoo — from that point a seller can no longer touch it via
// their personal link.
function isFinalized(order: { status: string; transferred_to_odoo?: boolean }) {
  return order.status === "COMPLETED" || !!order.transferred_to_odoo;
}

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
    if (sellerSlug) {
      const seller = await getSellerBySlug(sellerSlug);
      if (!seller) {
        return NextResponse.json({ message: "Vendedor no encontrado." }, { status: 404 });
      }
      const existing = await getOrder(orderId);
      if (!existing || existing.seller_name.toLowerCase() !== seller.name.toLowerCase()) {
        return NextResponse.json({ message: "Pedido no encontrado." }, { status: 404 });
      }
      if (isFinalized(existing)) {
        return NextResponse.json(
          { message: "Esta venta ya fue confirmada y no puede editarse." },
          { status: 403 },
        );
      }
      isSellerEdit = true;
    } else {
      const session = await readSessionFromCookie();
      if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();

    // Two shapes are accepted:
    // 1) Full edit from cart: { items, total, subtotal, buyerName, buyerDni, buyerPhone, autoApplyPromos? }
    // 2) Partial status update: { status? , transferred_to_odoo? } — admin only.
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
      if (body.status !== undefined) patch.status = body.status;
      if (body.transferred_to_odoo !== undefined) {
        patch.transferred_to_odoo = !!body.transferred_to_odoo;
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
      if (isFinalized(order)) {
        return NextResponse.json(
          { message: "Esta venta ya fue confirmada y no puede eliminarse." },
          { status: 403 },
        );
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
    console.error("DELETE /api/orders/[orderId] error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
