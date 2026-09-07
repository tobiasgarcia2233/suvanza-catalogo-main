// Shared between the edge middleware (proxy.ts) and client nav components, so
// both agree on which single-segment paths are a seller's personal
// `/[seller_name]` link vs. a reserved, session-gated section of the app.
export const RESERVED_TOP_SEGMENTS = new Set([
  "admin",
  "orders",
  "odoo",
  "api",
  "catalogo",
]);

export function sellerSlugFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 1 || RESERVED_TOP_SEGMENTS.has(segments[0])) {
    return null;
  }
  return segments[0];
}

export function isSellerPagePath(pathname: string): boolean {
  return sellerSlugFromPath(pathname) !== null;
}
