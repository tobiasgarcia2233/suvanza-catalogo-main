import { NextRequest, NextResponse } from "next/server";
import { readSessionFromCookie } from "@/lib/auth";
import { deleteCategory, renameCategory } from "@/lib/categoryQueries";
import { revalidateCatalog } from "@/lib/revalidateCatalog";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await readSessionFromCookie();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const { name } = await request.json();
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { message: "El nombre es requerido." },
        { status: 400 },
      );
    }
    const category = await renameCategory(id, name);
    revalidateCatalog();
    return NextResponse.json({ category });
  } catch (error) {
    console.error("PATCH /api/categories/[id] error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "No se pudo renombrar." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await readSessionFromCookie();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  await deleteCategory(id);
  revalidateCatalog();
  return NextResponse.json({ message: "Deleted" });
}
