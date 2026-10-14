"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { parseSellerPath } from "@/lib/sellerRoutes";
import { useUIStore } from "@/store/uiStore";

export default function SellerNavLinks({
  orientation = "horizontal",
  onNavigate,
}: {
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { isSellerOrdersOpen, openSellerOrders, closeSellerOrders } =
    useUIStore();

  const path = parseSellerPath(pathname);
  if (!path) return null;
  const { sellerSlug, contextSlug } = path;

  const vertical = orientation === "vertical";

  const itemClass = (active: boolean) =>
    `rounded-button px-3 py-1.5 text-sm transition-colors ${
      vertical ? "block w-full text-left" : ""
    } ${
      active
        ? "bg-brand text-white"
        : "text-text-secondary hover:bg-background hover:text-text-primary"
    }`;

  return (
    <ul
      className={
        vertical ? "flex flex-col gap-1" : "flex items-center gap-1"
      }
    >
      <li>
        <Link
          href={`/${sellerSlug}`}
          onClick={() => {
            closeSellerOrders();
            onNavigate?.();
          }}
          className={itemClass(!contextSlug)}
        >
          Mis eventos
        </Link>
      </li>
      {/* Catalog and sales belong to a context (an event or "Individual"). */}
      {contextSlug && (
        <>
          <li>
            <Link
              href={`/${sellerSlug}/${contextSlug}`}
              onClick={() => {
                closeSellerOrders();
                onNavigate?.();
              }}
              className={itemClass(!isSellerOrdersOpen)}
            >
              Catálogo
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                openSellerOrders();
                onNavigate?.();
              }}
              className={itemClass(isSellerOrdersOpen)}
            >
              Mis ventas
            </button>
          </li>
        </>
      )}
    </ul>
  );
}
