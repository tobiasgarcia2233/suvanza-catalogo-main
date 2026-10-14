import { NextResponse } from "next/server";
import { OdooError } from "@/lib/odooClient";
import { createProduct } from "@/lib/productMutations";
import { readSessionFromCookie } from "@/lib/auth";
import { getCachedProducts } from "@/lib/catalogCache";
import { revalidateCatalog } from "@/lib/revalidateCatalog";

export async function GET() {
  const products = await getCachedProducts();
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const session = await readSessionFromCookie();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ message: "name required" }, { status: 400 });
    }
    const id = await createProduct(body);
    revalidateCatalog();
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (err instanceof OdooError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("POST /api/products", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Error" },
      { status: 500 },
    );
  }
}
