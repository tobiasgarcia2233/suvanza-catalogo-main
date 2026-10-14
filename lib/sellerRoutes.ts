// Shared between the edge middleware (proxy.ts) and client nav components, so
// both agree on which paths belong to a seller's personal link vs. a reserved,
// session-gated section of the app.
//
//   /[seller]            → the seller's profile (events + "Individual")
//   /[seller]/[context]  → a sales context: "individual" or an event slug
export const RESERVED_TOP_SEGMENTS = new Set([
  "admin",
  "orders",
  "odoo",
  "api",
  "catalogo",
]);

export interface SellerPath {
  sellerSlug: string;
  /** "individual", an event slug, or null on the profile page. */
  contextSlug: string | null;
}

export function parseSellerPath(pathname: string): SellerPath | null {
  const segments = pathname.split("/").filter(Boolean);
  if (
    segments.length < 1 ||
    segments.length > 2 ||
    RESERVED_TOP_SEGMENTS.has(segments[0])
  ) {
    return null;
  }
  return { sellerSlug: segments[0], contextSlug: segments[1] ?? null };
}

export function sellerSlugFromPath(pathname: string): string | null {
  return parseSellerPath(pathname)?.sellerSlug ?? null;
}

export function isSellerPagePath(pathname: string): boolean {
  return parseSellerPath(pathname) !== null;
}
