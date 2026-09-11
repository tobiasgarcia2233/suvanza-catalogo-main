"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import FullScreenButton from "@/components/FullScreenButton";
import NavLinks from "@/components/NavLinks";
import SellerNavLinks from "@/components/SellerNavLinks";
import MobileNav from "@/components/MobileNav";
import AdminSignOut from "@/app/admin/AdminSignOut";
import { useSessionStore } from "@/store/sessionStore";

// Session-gated areas. The navbar only picks which links to show — access is
// enforced by the middleware (proxy.ts) and each page, so this never needs to
// read the auth cookie. Keeping cookies() out of the root layout is what lets
// the seller catalog (/[seller_name]) be statically cached.
const ADMIN_PREFIXES = ["/admin", "/orders", "/odoo", "/catalogo"];

function isAdminPath(pathname: string) {
  return ADMIN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  // Admin routes are self-evident from the path. "/" is the exception: it serves
  // both the login screen and the logged-in landing, so fall back to the session
  // flag that the page pushes into the store (see <SessionSync>).
  const admin = isAdminPath(pathname) || (pathname === "/" && isAuthenticated);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-border bg-surface">
      <nav className="mx-auto flex h-full max-w-screen-2xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center"
          aria-label="Suvanza — Inicio"
        >
          <Image
            src="/images/logo.png"
            alt="Suvanza"
            width={120}
            height={32}
            priority
            className="h-8 w-auto shrink-0 object-contain"
          />
        </Link>

        <div className="hidden lg:contents">
          {admin ? <NavLinks /> : <SellerNavLinks />}

          <div className="ml-auto flex items-center gap-3">
            <FullScreenButton />
            {admin && <AdminSignOut />}
          </div>
        </div>

        <MobileNav isAdmin={admin} />
      </nav>
    </header>
  );
}
