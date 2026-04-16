import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <h1 className="text-xl font-bold text-center mb-1">Suvanza — Admin</h1>
        <p className="text-sm text-center text-gray-500 mb-6">
          Iniciá sesión para gestionar el catálogo.
        </p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
