"use client";

import { useEffect, useState } from "react";
import { Loader2, X, Plus, Trash2, Wand2 } from "lucide-react";
import { PAYMENT_METHODS, type OrderPayment } from "@/types";
import { usePauseRefresh } from "@/store/refreshGuardStore";

type Row = { method: string; amount: string; percent: string };

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function amountToPercent(amount: string, total: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || total <= 0) return "";
  return String(round2((n / total) * 100));
}

function percentToAmount(percent: string, total: number): string {
  const p = Number(percent);
  if (!Number.isFinite(p) || total <= 0) return "";
  return String(round2((p / 100) * total));
}

function rowsFromPayments(
  payments: OrderPayment[] | null,
  total: number,
): Row[] {
  if (!payments || payments.length === 0) return [];
  return payments.map((p) => {
    const amount = p.amount ?? 0;
    return {
      method: p.method,
      amount: String(amount),
      percent: amountToPercent(String(amount), total),
    };
  });
}

export default function PaymentMethodModal({
  open,
  onClose,
  orderId,
  orderTotal,
  buyerName,
  initialPayments,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderTotal: number;
  buyerName: string;
  initialPayments: OrderPayment[] | null;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePauseRefresh(open);

  useEffect(() => {
    if (!open) return;
    setRows(rowsFromPayments(initialPayments, orderTotal));
    setError(null);
    // Only re-seed when the modal transitions to open — ignore prop changes
    // from background router.refresh() so user input is preserved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const sum = rows.reduce((acc, r) => {
    const n = Number(r.amount);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
  const diff = orderTotal - sum;
  const balanced = Math.abs(diff) < 0.005;

  function addRow() {
    setRows((r) => [
      ...r,
      { method: PAYMENT_METHODS[0], amount: "", percent: "" },
    ]);
  }

  function updateMethod(i: number, method: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, method } : row)));
  }

  function updateAmount(i: number, amount: string) {
    const percent = amountToPercent(amount, orderTotal);
    setRows((r) =>
      r.map((row, idx) => (idx === i ? { ...row, amount, percent } : row)),
    );
  }

  function updatePercent(i: number, percent: string) {
    const amount = percentToAmount(percent, orderTotal);
    setRows((r) =>
      r.map((row, idx) => (idx === i ? { ...row, percent, amount } : row)),
    );
  }

  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  function fillRemaining(i: number) {
    const others = rows.reduce((acc, row, idx) => {
      if (idx === i) return acc;
      const n = Number(row.amount);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
    const remaining = Math.max(0, orderTotal - others);
    updateAmount(i, String(round2(remaining)));
  }

  async function save(nextPayments: OrderPayment[] | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payments: nextPayments }),
      });
      if (!res.ok) throw new Error();
      onSaved();
      onClose();
    } catch {
      setError("No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  function onSaveClick() {
    const cleaned: OrderPayment[] = rows
      .map((r) => ({
        method: r.method.trim(),
        amount: Number(r.amount),
      }))
      .filter((p) => p.method && Number.isFinite(p.amount) && p.amount > 0);
    save(cleaned.length > 0 ? cleaned : null);
  }

  function onClearClick() {
    save(null);
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 p-1 text-gray-400 hover:text-gray-700"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
        <h2 className="text-lg font-bold">Medios de pago</h2>
        <p className="text-sm text-gray-500 mb-1">
          Comprador: <span className="font-medium">{buyerName}</span>
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Total del pedido:{" "}
          <span className="font-semibold text-gray-900">
            ${orderTotal.toLocaleString("es-AR")}
          </span>
        </p>

        {rows.length === 0 && (
          <p className="text-sm text-gray-500 mb-3">
            Sin pagos cargados. Agregá uno con el botón de abajo.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={row.method}
                onChange={(e) => updateMethod(i, e.target.value)}
                className="rounded border border-gray-300 px-2 py-2 text-sm bg-white flex-1 min-w-0"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                {!PAYMENT_METHODS.includes(
                  row.method as (typeof PAYMENT_METHODS)[number],
                ) &&
                  row.method && <option value={row.method}>{row.method}</option>}
              </select>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={row.amount}
                onChange={(e) => updateAmount(i, e.target.value)}
                placeholder="Monto"
                className="rounded border border-gray-300 px-2 py-2 text-sm w-24"
              />
              <div className="relative w-20">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={1000}
                  step="0.01"
                  value={row.percent}
                  onChange={(e) => updatePercent(i, e.target.value)}
                  placeholder="%"
                  disabled={orderTotal <= 0}
                  className="w-full rounded border border-gray-300 pl-2 pr-5 py-2 text-sm disabled:bg-gray-100"
                />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                  %
                </span>
              </div>
              <button
                type="button"
                onClick={() => fillRemaining(i)}
                title="Completar con el monto restante"
                className="p-2 text-gray-500 hover:bg-gray-100 rounded"
              >
                <Wand2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-2 inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900"
        >
          <Plus size={14} /> Agregar pago
        </button>

        {rows.length > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-3 text-sm flex justify-between">
            <span className="text-gray-600">Suma de pagos:</span>
            <span
              className={`font-semibold ${
                balanced
                  ? "text-green-700"
                  : diff > 0
                    ? "text-amber-700"
                    : "text-red-700"
              }`}
            >
              ${sum.toLocaleString("es-AR")}{" "}
              {!balanced && (
                <span className="text-xs font-normal">
                  ({diff > 0 ? "falta" : "excede"} $
                  {Math.abs(diff).toLocaleString("es-AR")})
                </span>
              )}
            </span>
          </div>
        )}

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={onClearClick}
            disabled={busy || (!initialPayments && rows.length === 0)}
            className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-40"
          >
            Borrar todos los pagos
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
              onClick={onSaveClick}
              disabled={busy}
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
