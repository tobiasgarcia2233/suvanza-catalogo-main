import { NextRequest, NextResponse } from "next/server";
import { readSessionFromCookie } from "@/lib/auth";
import { deleteSeller } from "@/lib/sellerQueries";
import { revalidateSellers } from "@/lib/revalidateCatalog";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await readSessionFromCookie();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  await deleteSeller(id);
  revalidateSellers();
  return NextResponse.json({ message: "Deleted" });
}
