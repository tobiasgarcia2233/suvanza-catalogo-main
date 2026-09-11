"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin/products", label: "Productos" },
  { href: "/admin/promotions", label: "Promociones" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/admin/sellers", label: "Vendedores" },
  { href: "/orders", label: "Pedidos" },
  { href: "/odoo", label: "Odoo" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavLinks({
  orientation = "horizontal",
  onNavigate,
}: {
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const vertical = orientation === "vertical";

  return (
    <ul
      className={
        vertical
          ? "flex flex-col gap-1 text-sm"
          : "flex items-center gap-1 text-sm"
      }
    >
      {navItems.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={onNavigate}
            className={`rounded-button px-3 py-1.5 transition-colors ${
              vertical ? "block w-full" : ""
            } ${
              isActive(pathname, item.href)
                ? "bg-brand text-white"
                : "text-text-secondary hover:bg-background hover:text-text-primary"
            }`}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
