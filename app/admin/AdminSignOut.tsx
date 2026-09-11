"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function AdminSignOut({
  className = "inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900",
  iconSize = 14,
}: {
  className?: string;
  iconSize?: number;
}) {
  const router = useRouter();
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button onClick={signOut} className={className}>
      <LogOut size={iconSize} /> Salir
    </button>
  );
}
