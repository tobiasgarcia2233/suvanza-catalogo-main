"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Error");
        return;
      }
      router.push(next && next.startsWith("/admin") ? next : "/admin/products");
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700">Usuario</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
          className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-gray-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700">Contraseña</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-gray-900"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-white font-semibold disabled:opacity-50"
      >
        {busy && <Loader2 size={14} className="animate-spin" />}
        {busy ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
