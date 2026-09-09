"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import NavLinks from "@/components/NavLinks";
import SellerNavLinks from "@/components/SellerNavLinks";
import FullScreenButton from "@/components/FullScreenButton";
import AdminSignOut from "@/app/admin/AdminSignOut";

export default function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);

  // Close whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape or click outside the menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative ml-auto flex h-full items-center lg:hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 -mt-px w-56 rounded-card rounded-t-none border border-border bg-surface p-2 shadow-lg">
          {isAdmin ? (
            <NavLinks orientation="vertical" onNavigate={close} />
          ) : (
            <SellerNavLinks orientation="vertical" onNavigate={close} />
          )}

          <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
            <FullScreenButton withLabel />
            {isAdmin && (
              <AdminSignOut
                iconSize={16}
                className="flex w-full items-center gap-3 rounded-button px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
