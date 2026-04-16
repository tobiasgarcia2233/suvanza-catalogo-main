import { NextRequest, NextResponse } from "next/server";
import { getProduct } from "@/lib/productQueries";
import { deleteProduct, updateProduct } from "@/lib/productMutations";
import { readSessionFromCookie } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const product = await getProduct(id);
  if (!product) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    const body = await request.json();
    await updateProduct(id, body);
    return NextResponse.json({ message: "updated" });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Error" },
      { status: 500 },
    );
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
    await deleteProduct(id);
    return NextResponse.json({ message: "deleted" });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Error" },
      { status: 500 },
    );
  }
}
