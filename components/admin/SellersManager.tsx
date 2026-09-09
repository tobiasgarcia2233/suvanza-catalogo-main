"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import type { Seller } from "@/lib/sellerQueries";

type SellerWithStats = Seller & { productsSold: number; cartsBuilt: number };

export default function SellersManager({
  initialSellers,
}: {
  initialSellers: SellerWithStats[];
}) {
  const router = useRouter();
  const { openConfirmationModal } = useUIStore();
  const [sellers, setSellers] = useState<SellerWithStats[]>(initialSellers);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo crear.");
      setSellers((prev) => [
        { ...data.seller, productsSold: 0, cartsBuilt: 0 },
        ...prev,
      ]);
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (seller: Seller) => {
    openConfirmationModal({
      title: "Quitar acceso",
      message: `¿Quitar el acceso de "${seller.name}"? El link dejará de funcionar.`,
      onConfirm: async () => {
        setDeletingId(seller.id);
        try {
          const res = await fetch(`/api/sellers/${seller.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error();
          setSellers((prev) => prev.filter((s) => s.id !== seller.id));
          router.refresh();
        } catch {
          alert("No se pudo eliminar el vendedor.");
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const urlFor = (slug: string) => {
    if (typeof window === "undefined") return `/${slug}`;
    return `${window.location.origin}/${slug}`;
  };

  const handleCopy = async (seller: Seller) => {
    try {
      await navigator.clipboard.writeText(urlFor(seller.slug));
      setCopiedId(seller.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleCreate}
        className="flex items-end gap-3 bg-white border border-gray-200 rounded-lg p-4"
      >
        <div className="flex-1">
          <label htmlFor="sellerName" className="block text-xs font-medium text-gray-500 mb-1">
            Nombre del vendedor
          </label>
          <input
            id="sellerName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Juan Pérez"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-white text-sm font-semibold disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Crear acceso
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="text-left py-2 px-4">Nombre</th>
              <th className="text-left py-2 px-4">Link de acceso</th>
              <th className="text-right py-2 px-4">Carros armados</th>
              <th className="text-right py-2 px-4">Productos vendidos</th>
              <th className="text-right py-2 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((seller) => (
              <tr key={seller.id} className="border-b border-gray-100 last:border-0">
                <td className="py-2 px-4 font-medium">{seller.name}</td>
                <td className="py-2 px-4">
                  <code className="text-xs text-gray-600">/{seller.slug}</code>
                </td>
                <td className="py-2 px-4 text-right tabular-nums">
                  {seller.cartsBuilt}
                </td>
                <td className="py-2 px-4 text-right tabular-nums">
                  {seller.productsSold}
                </td>
                <td className="py-2 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleCopy(seller)}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      {copiedId === seller.id ? (
                        <>
                          <Check size={12} /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copiar link
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(seller)}
                      disabled={deletingId === seller.id}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label={`Eliminar ${seller.name}`}
                    >
                      {deletingId === seller.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sellers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 px-4 text-center text-gray-400">
                  Todavía no hay vendedores con acceso.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
