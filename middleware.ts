import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "suvanza_session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Guard /admin/* and /odoo/* (except /admin/login and auth endpoints)
  const isProtected =
    pathname.startsWith("/admin") || pathname.startsWith("/odoo");
  const isLogin = pathname === "/admin/login";
  if (!isProtected || isLogin) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/admin/:path*", "/odoo/:path*"],
};
