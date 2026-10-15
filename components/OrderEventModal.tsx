"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { usePauseRefresh } from "@/store/refreshGuardStore";
import type { EventOption } from "@/lib/eventQueries";

/** Moves an order to another event (or to "Venta individual"); the seller stays. */
export default function OrderEventModal({
  open,
  onClose,
  orderId,
  buyerName,
  sellerName,
  currentEventId,
  events,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  buyerName: string;
  sellerName: string;
  currentEventId: string | null;
  events: EventOption[];
  onSaved: () => void;
}) {
  // "" = Venta individual (event_id NULL).
  const [value, setValue] = useState(currentEventId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePauseRefresh(open);

  useEffect(() => {
    if (open) {
      setValue(currentEventId ?? "");
      setError(null);
    }
    // Only re-seed when the modal opens, like NotesModal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const unchanged = value === (currentEventId ?? "");

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: value || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "No se pudo cambiar el evento.");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el evento.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4"
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
        <h2 className="text-lg font-bold">Cambiar evento</h2>
        <p className="text-sm text-gray-500 mb-4">
          Comprador: <span className="font-medium">{buyerName}</span> · Atendió:{" "}
          <span className="font-medium">{sellerName}</span>
        </p>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Evento de la venta</span>
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
          >
            <option value="">Venta individual</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {e.status === "closed" ? " (cerrado)" : ""}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-gray-500">
          Solo cambia a qué evento se suma la venta en las métricas. Quien atendió, los productos, el pago y Odoo no
          cambian.
        </p>
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
            disabled={busy || unchanged}
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
