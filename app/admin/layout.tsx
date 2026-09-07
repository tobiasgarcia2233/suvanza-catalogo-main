export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gray-50 text-gray-900">
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
