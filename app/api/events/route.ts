import { NextResponse } from "next/server";
import { readSessionFromCookie } from "@/lib/auth";
import { createEvent, EventInputError } from "@/lib/eventQueries";
import { revalidateEvents } from "@/lib/revalidateCatalog";

export async function POST(request: Request) {
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const id = await createEvent(body);
    revalidateEvents();
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (err instanceof EventInputError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("POST /api/events error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Error" },
      { status: 500 },
    );
  }
}
