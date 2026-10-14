import { NextRequest, NextResponse } from "next/server";
import { readSessionFromCookie } from "@/lib/auth";
import {
  deleteEvent,
  EventInputError,
  getEvent,
  setEventStatus,
  updateEvent,
} from "@/lib/eventQueries";
import { revalidateEvents } from "@/lib/revalidateCatalog";

function errorResponse(err: unknown, label: string) {
  if (err instanceof EventInputError) {
    return NextResponse.json({ message: err.message }, { status: 400 });
  }
  console.error(`${label} error:`, err);
  return NextResponse.json(
    { message: err instanceof Error ? err.message : "Error" },
    { status: 500 },
  );
}

// Two shapes are accepted:
// 1) { status: "active" | "closed" } — close / reopen the event.
// 2) Full edit: { name, slug, starts_at, ends_at, sellerIds, productIds, promotionIds }.
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    if (!(await getEvent(id))) {
      return NextResponse.json({ message: "Evento no encontrado." }, { status: 404 });
    }
    const body = await request.json();

    if (body.status !== undefined && body.name === undefined) {
      if (body.status !== "active" && body.status !== "closed") {
        return NextResponse.json({ message: "Estado inválido." }, { status: 400 });
      }
      await setEventStatus(id, body.status);
    } else {
      await updateEvent(id, body);
    }
    revalidateEvents();
    return NextResponse.json({ message: "updated" });
  } catch (err) {
    return errorResponse(err, "PATCH /api/events/[id]");
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    await deleteEvent(id);
    revalidateEvents();
    return NextResponse.json({ message: "deleted" });
  } catch (err) {
    return errorResponse(err, "DELETE /api/events/[id]");
  }
}
