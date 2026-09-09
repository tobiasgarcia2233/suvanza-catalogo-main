import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { isSellerPagePath } from "@/lib/sellerRoutes";

const SESSION_COOKIE = "suvanza_session";

// Order endpoints a seller's page calls directly with their own slug; the
// route handlers themselves verify the order belongs to that seller before
// doing anything, so these can stay open without an admin session.
function isPublicOrdersApi(pathname: string, method: string) {
  if (pathname === "/api/orders") {
    return method === "GET" || method === "POST";
  }
  if (/^\/api\/orders\/[^/]+$/.test(pathname)) {
    return method === "PATCH" || method === "DELETE";
  }
  return false;
}

// Paths that must stay reachable without a session.
function isPublic(pathname: string, method: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/favicon.ico" ||
    isPublicOrdersApi(pathname, method) ||
    isSellerPagePath(pathname)
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname, req.method)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;

  let valid = false;
  if (token && secret) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (valid) return NextResponse.next();

  // Unauthenticated API calls get a clean 401 instead of an HTML redirect.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const url = new URL("/", req.url);
  url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|images/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$).*)"],
};
