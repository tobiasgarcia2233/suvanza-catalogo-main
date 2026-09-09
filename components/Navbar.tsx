import Link from "next/link";
import Image from "next/image";
import FullScreenButton from "@/components/FullScreenButton";
import NavLinks from "@/components/NavLinks";
import SellerNavLinks from "@/components/SellerNavLinks";
import MobileNav from "@/components/MobileNav";
import AdminSignOut from "@/app/admin/AdminSignOut";
import { readSessionFromCookie } from "@/lib/auth";

export default async function Navbar() {
  const session = await readSessionFromCookie();

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
          {session ? <NavLinks /> : <SellerNavLinks />}

          <div className="ml-auto flex items-center gap-3">
            <FullScreenButton />
            {session && <AdminSignOut />}
          </div>
        </div>

        <MobileNav session={!!session} />
      </nav>
    </header>
  );
}
