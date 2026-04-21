import { NextRequest, NextResponse } from "next/server";
import { deleteOrder, updateOrder, getOrder } from "@/lib/orderQueries";

interface CartLine {
  id: string | number;
  brand?: string;
  name: string;
  quantity: number;
  finalPrice: number | null;
  discountPercentage: number;
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
    const body = await request.json();

    // Two shapes are accepted:
    // 1) Full edit from cart: { items, total, subtotal, buyerName, buyerDni, buyerPhone, autoApplyPromos? }
    // 2) Partial status update: { status? , transferred_to_odoo? }
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
    }

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
  _request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await context.params;
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
