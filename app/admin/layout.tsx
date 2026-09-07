import { redirect } from "next/navigation";
import { readSessionFromCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSessionFromCookie();
  if (!session) redirect("/?next=/admin");

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gray-50 text-gray-900">
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
