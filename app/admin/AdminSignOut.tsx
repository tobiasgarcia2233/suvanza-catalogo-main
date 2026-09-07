"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function AdminSignOut() {
  const router = useRouter();
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button
      onClick={signOut}
      className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
    >
      <LogOut size={14} /> Salir
    </button>
  );
}
