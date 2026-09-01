import Link from "next/link";
import {
  Tags,
  ClipboardList,
  ArrowRightLeft,
  ArrowRight,
} from "lucide-react";
import LoginForm from "@/components/LoginForm";
import { readSessionFromCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

const links = [
  {
    href: "/admin/products",
    label: "Administración",
    description: "Gestiona productos, variantes y promociones.",
    icon: Tags,
  },
  {
    href: "/orders",
    label: "Pedidos",
    description: "Revisa y confirma los pedidos recibidos.",
    icon: ClipboardList,
  },
  {
    href: "/odoo",
    label: "Pasar a Odoo",
    description: "Exporta los pedidos confirmados al ERP.",
    icon: ArrowRightLeft,
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const session = await readSessionFromCookie();

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background text-text-primary">
      <div className="mx-auto grid max-w-5xl gap-16 px-6 py-16 sm:py-24 lg:grid-cols-[1fr_20rem]">
        <section className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            Suvanza
          </p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            Catálogo de productos
          </h1>
          <p className="mt-5 text-lg text-text-secondary">
            Esta aplicación es el catálogo digital de Suvanza. Reúne en un solo
            lugar los productos, sus precios y promociones, y permite que cada
            vendedor arme y envíe sus pedidos de forma simple. El equipo interno
            administra el catálogo y traspasa los pedidos a Odoo.
          </p>
        </section>

        <section className="lg:pt-9">
          {session ? (
            <>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
                Accesos
              </h2>
              <div className="mt-4 divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
                {links.map(({ href, label, description, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-4 p-5 transition-colors hover:bg-background"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-brand" aria-hidden />
                    <span className="min-w-0">
                      <span className="block font-medium">{label}</span>
                      <span className="block text-sm text-text-secondary">
                        {description}
                      </span>
                    </span>
                    <ArrowRight
                      className="ml-auto h-4 w-4 shrink-0 text-text-secondary"
                      aria-hidden
                    />
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-card border border-border bg-surface p-6">
              <h2 className="text-lg font-bold">Iniciar sesión</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Ingresa para acceder al catálogo y la administración.
              </p>
              <div className="mt-5">
                <LoginForm next={next} />
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
