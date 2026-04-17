"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

export default function NotesModal({
  open,
  onClose,
  orderId,
  initialNotes,
  buyerName,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  initialNotes: string;
  buyerName: string;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(initialNotes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(initialNotes);
      setError(null);
    }
  }, [open, initialNotes]);

  if (!open) return null;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value.trim() || null }),
      });
      if (!res.ok) throw new Error();
      onSaved();
      onClose();
    } catch {
      setError("No se pudo guardar la nota.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 p-1 text-gray-400 hover:text-gray-700"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
        <h2 className="text-lg font-bold">Nota del pedido</h2>
        <p className="text-sm text-gray-500 mb-4">
          Comprador: <span className="font-medium">{buyerName}</span>
        </p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          placeholder="Escribí acá la nota de este pedido..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
        />
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
