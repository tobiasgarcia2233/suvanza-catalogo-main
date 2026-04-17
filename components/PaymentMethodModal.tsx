"use client";

import { useEffect, useState } from "react";
import { Loader2, X, Check } from "lucide-react";
import { PAYMENT_METHODS } from "@/types";

export default function PaymentMethodModal({
  open,
  onClose,
  orderId,
  initialMethod,
  buyerName,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  initialMethod: string | null;
  buyerName: string;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(initialMethod);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelected(initialMethod);
      setError(null);
    }
  }, [open, initialMethod]);

  if (!open) return null;

  async function save(next: string | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_method: next }),
      });
      if (!res.ok) throw new Error();
      onSaved();
      onClose();
    } catch {
      setError("No se pudo actualizar el medio de pago.");
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
        <h2 className="text-lg font-bold">Medio de pago</h2>
        <p className="text-sm text-gray-500 mb-4">
          Comprador: <span className="font-medium">{buyerName}</span>
        </p>

        <div className="flex flex-col gap-2">
          {PAYMENT_METHODS.map((method) => {
            const active = selected === method;
            return (
              <button
                key={method}
                onClick={() => setSelected(method)}
                disabled={busy}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition ${
                  active
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 hover:border-gray-500"
                }`}
              >
                <span>{method}</span>
                {active && <Check size={14} />}
              </button>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={() => save(null)}
            disabled={busy || !initialMethod}
            className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-40"
          >
            Quitar medio de pago
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={busy}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => selected && save(selected)}
              disabled={busy || !selected || selected === initialMethod}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
