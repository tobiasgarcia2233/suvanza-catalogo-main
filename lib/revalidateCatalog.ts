import "server-only";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG, SELLERS_TAG } from "./catalogCache";

// Next 16 wants a cache-life profile as the second arg when called outside a
// Server Action (route handlers, here). "max" purges the tag immediately.

/** Call after any product / promotion / category mutation. */
export function revalidateCatalog() {
  revalidateTag(CATALOG_TAG, "max");
}

/** Call after any seller mutation (create / delete / rename). */
export function revalidateSellers() {
  revalidateTag(SELLERS_TAG, "max");
}
