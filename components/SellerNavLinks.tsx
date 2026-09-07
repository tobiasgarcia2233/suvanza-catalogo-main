"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sellerSlugFromPath } from "@/lib/sellerRoutes";
import { useUIStore } from "@/store/uiStore";

export default function SellerNavLinks() {
  const pathname = usePathname();
  const { isSellerOrdersOpen, openSellerOrders, closeSellerOrders } =
    useUIStore();

  const sellerSlug = sellerSlugFromPath(pathname);
  if (!sellerSlug) return null;

  const itemClass = (active: boolean) =>
    `rounded-button px-3 py-1.5 text-sm transition-colors ${
      active
        ? "bg-brand text-white"
        : "text-text-secondary hover:bg-background hover:text-text-primary"
    }`;

  return (
    <ul className="flex items-center gap-1">
      <li>
        <Link
          href={`/${sellerSlug}`}
          onClick={closeSellerOrders}
          className={itemClass(!isSellerOrdersOpen)}
        >
          Catálogo
        </Link>
      </li>
      <li>
        <button
          type="button"
          onClick={openSellerOrders}
          className={itemClass(isSellerOrdersOpen)}
        >
          Mis ventas
        </button>
      </li>
    </ul>
  );
}
