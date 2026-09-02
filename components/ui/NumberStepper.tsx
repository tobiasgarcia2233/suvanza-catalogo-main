"use client";

import { useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";

type NumberStepperProps = {
  /** Valor comprometido (lo que ve el resto de la app). */
  value: number | string | null | undefined;
  /** Se llama cuando el valor se confirma (blur, Enter o botones +/-). */
  onCommit: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  /**
   * Cantidad fija de decimales a mostrar / aceptar.
   * Si se omite, se muestran los decimales que tenga el número.
   */
  decimals?: number;
  /** Locale para el separador de miles (default `es-AR` → `1.234.567`). */
  locale?: string;
  /** Si es true, un input vacío confirma `null` en vez de revertir. */
  allowEmpty?: boolean;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  /** Selecciona el contenido al enfocar (default: true). */
  selectOnFocus?: boolean;
  /** Clases extra para el contenedor. */
  className?: string;
  /** Clases extra para el `<input>` (útil para el ancho). */
  inputClassName?: string;
  /** Contenido a la izquierda del número (ej. `$`). */
  prefix?: ReactNode;
  /** Contenido a la derecha del número (ej. `%`). */
  suffix?: ReactNode;
  "aria-label"?: string;
};

/**
 * Convierte lo que el usuario escribe a número, tolerando separadores de miles
 * (`1.234.567`) y coma decimal estilo es-AR (`1.234,56`).
 */
function toNumber(raw: string): number | null {
  let s = (raw ?? "").trim().replace(/\s/g, "");
  if (s === "" || s === "-") return null;

  if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.234" / "1.234.567" → los puntos son separador de miles
    s = s.replace(/\./g, "");
  } else if (/^-?\d{1,3}(\.\d{3})*,\d+$/.test(s)) {
    // "1.234,56" → miles con punto, decimal con coma
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(",", ".");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function clamp(n: number, min?: number, max?: number): number {
  let out = n;
  if (min != null) out = Math.max(min, out);
  if (max != null) out = Math.min(max, out);
  return out;
}

function round(n: number, decimals?: number): number {
  const factor = decimals != null ? 10 ** decimals : 1e6;
  return Math.round(n * factor) / factor;
}

export function NumberStepper({
  value,
  onCommit,
  min,
  max,
  step = 1,
  decimals,
  locale = "es-AR",
  allowEmpty = false,
  disabled = false,
  id,
  placeholder,
  selectOnFocus = true,
  className = "",
  inputClassName = "",
  prefix,
  suffix,
  "aria-label": ariaLabel,
}: NumberStepperProps) {
  const committed = toNumber(String(value ?? ""));

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  // Con separador de miles, para lectura (input sin foco).
  const formatGrouped = (n: number) =>
    n.toLocaleString(locale, {
      minimumFractionDigits: decimals ?? 0,
      maximumFractionDigits: decimals ?? 20,
    });

  // Sin formato, para editar cómodo (input con foco).
  const formatPlain = (n: number) =>
    decimals != null ? n.toFixed(decimals) : String(n);

  const inputValue = editing
    ? draft
    : committed == null
      ? ""
      : formatGrouped(committed);

  const commit = (raw: string) => {
    const n = toNumber(raw);
    if (n == null) {
      if (allowEmpty) onCommit(null);
      return; // si no, revierte solo (inputValue vuelve a `committed`)
    }
    onCommit(clamp(round(n, decimals), min, max));
  };

  const stepBy = (dir: 1 | -1) => {
    if (disabled) return;
    const next = clamp(round((committed ?? 0) + dir * step, decimals), min, max);
    onCommit(next);
  };

  return (
    <div
      className={`flex items-center gap-1 rounded-md border border-border px-1.5 py-1 focus-within:border-brand ${
        disabled ? "opacity-60" : ""
      } ${className}`}
    >
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled || (min != null && (committed ?? 0) <= min)}
        onClick={() => stepBy(-1)}
        className="shrink-0 rounded-sm p-1 text-text-secondary transition hover:bg-gray-100 disabled:opacity-30"
        aria-label="Disminuir"
      >
        <Minus size={16} />
      </button>

      {prefix != null && (
        <span className="shrink-0 text-text-secondary">{prefix}</span>
      )}

      <input
        id={id}
        type="text"
        inputMode={decimals === 0 ? "numeric" : "decimal"}
        value={inputValue}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          const el = e.currentTarget;
          setEditing(true);
          setDraft(committed == null ? "" : formatPlain(committed));
          if (selectOnFocus) {
            // el valor sin formato se aplica en el próximo render
            requestAnimationFrame(() => el.select());
          }
        }}
        onBlur={() => {
          setEditing(false);
          commit(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
            e.currentTarget.blur();
          }
        }}
        className={`w-full min-w-0 border-none bg-transparent p-0 text-center font-medium focus:outline-none focus:ring-0 ${inputClassName}`}
      />

      {suffix != null && (
        <span className="shrink-0 text-text-secondary">{suffix}</span>
      )}

      <button
        type="button"
        tabIndex={-1}
        disabled={disabled || (max != null && (committed ?? 0) >= max)}
        onClick={() => stepBy(1)}
        className="shrink-0 rounded-sm p-1 text-text-secondary transition hover:bg-gray-100 disabled:opacity-30"
        aria-label="Aumentar"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
