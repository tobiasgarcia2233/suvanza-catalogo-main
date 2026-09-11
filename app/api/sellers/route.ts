import { NextResponse } from "next/server";
import { readSessionFromCookie } from "@/lib/auth";
import { createSeller, getAllSellers } from "@/lib/sellerQueries";
import { revalidateSellers } from "@/lib/revalidateCatalog";

export async function GET() {
  const session = await readSessionFromCookie();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const sellers = await getAllSellers();
  return NextResponse.json({ sellers });
}

export async function POST(request: Request) {
  const session = await readSessionFromCookie();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await request.json();
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { message: "El nombre es requerido." },
        { status: 400 },
      );
    }

    const seller = await createSeller(name);
    revalidateSellers();
    return NextResponse.json({ seller }, { status: 201 });
  } catch (error) {
    console.error("POST /api/sellers error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
