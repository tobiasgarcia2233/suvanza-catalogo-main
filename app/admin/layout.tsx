import Link from "next/link";
import { cookies } from "next/headers";
import AdminSignOut from "./AdminSignOut";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const hasSession = !!store.get("suvanza_session")?.value;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {hasSession && (
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl flex items-center gap-6 px-6 h-14">
            <Link href="/admin/products" className="font-bold">
              Suvanza Admin
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin/products" className="hover:text-gray-900 text-gray-600">
                Productos
              </Link>
              <Link href="/admin/promotions" className="hover:text-gray-900 text-gray-600">
                Promociones
              </Link>
              <Link href="/orders" className="hover:text-gray-900 text-gray-600">
                Pedidos
              </Link>
              <Link href="/odoo" className="hover:text-gray-900 text-gray-600">
                Pasar a Odoo
              </Link>
            </nav>
            <div className="ml-auto">
              <AdminSignOut />
            </div>
          </div>
        </header>
      )}
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
