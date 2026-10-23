"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, ExternalLink, Loader2, X } from "lucide-react";
import type { OdooProduct, OdooProductDetails } from "@/types";

// Same instance as ODOO_BASE_URL, which is server-only.
const ODOO_WEB_URL = "https://suvanza.odoo.com";

const label = (p: OdooProduct) => `${p.name} — ID ${p.id} — ${p.companyName}`;

type Status = "none" | "loading" | "error" | "ready" | "blocked";

const STATUS: Record<Status, { dot: string; text: string; tone: string }> = {
  none: { dot: "border border-gray-400", text: "Sin vínculo", tone: "text-gray-500" },
  loading: { dot: "bg-gray-300", text: "Consultando Odoo…", tone: "text-gray-500" },
  error: { dot: "bg-red-500", text: "No se pudo consultar", tone: "text-red-700" },
  ready: { dot: "bg-green-600", text: "Listo para exportar", tone: "text-green-700" },
  blocked: { dot: "bg-amber-500", text: "No se puede exportar", tone: "text-amber-700" },
};

export default function OdooProductSelector({ value, onChange, disabled = false }: {
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}) {
  const uid = useId();
  const input = useRef<HTMLInputElement>(null);
  const sequence = useRef(0);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<OdooProduct[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<OdooProductDetails | null>(null);
  const [detailsError, setDetailsError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [searching, setSearching] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setDetails(null);
    setDetailsError("");
    if (value === null) return;
    const controller = new AbortController();
    let current = true;
    async function load() {
      try {
        const res = await fetch(`/api/odoo/products?id=${value}`, { signal: controller.signal, cache: "no-store" });
        const data = await res.json();
        if (!current) return;
        if (!res.ok) { setDetailsError(data.message ?? "No se pudo consultar el producto vinculado."); return; }
        setDetails(data.details);
      } catch {
        if (current) setDetailsError("No se pudo consultar el producto vinculado.");
      }
    }
    void load();
    return () => { current = false; controller.abort(); };
  }, [value, retry]);

  useEffect(() => {
    const version = ++sequence.current;
    const controller = new AbortController();
    setResults([]);
    setError("");
    setHighlight(0);
    const text = query.trim();
    if (!open || text.length < 2) { setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/odoo/products?q=${encodeURIComponent(text)}`, { signal: controller.signal, cache: "no-store" });
        const data = await res.json();
        if (version !== sequence.current) return;
        if (!res.ok) { setError(data.message ?? "No se pudo buscar en Odoo. Intentá nuevamente."); return; }
        setResults(data.products);
      } catch {
        if (version === sequence.current) setError("No se pudo buscar en Odoo. Intentá nuevamente.");
      } finally {
        if (version === sequence.current) setLoading(false);
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); sequence.current++; };
  }, [query, open, retry]);

  useEffect(() => {
    if (open) document.getElementById(`${uid}-option-${highlight}`)?.scrollIntoView({ block: "nearest" });
  }, [highlight, open, uid]);

  useEffect(() => {
    if (searching) input.current?.focus();
  }, [searching]);

  function closeSearch() {
    sequence.current++;
    setQuery("");
    setResults([]);
    setOpen(false);
    setSearching(false);
  }

  function choose(product: OdooProduct) {
    onChange(product.id);
    closeSearch();
    setExpanded(true);
  }

  const shown = details?.id === value ? details : null;
  const status: Status = value === null ? "none" : detailsError ? "error" : !shown ? "loading" : shown.exportable ? "ready" : "blocked";
  const meta = STATUS[status];
  const failed = shown?.checks.filter((check) => !check.ok) ?? [];

  return (
    <div className="flex flex-col gap-2 text-sm">
      {value === null ? (
        !searching && (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
            <span className="text-gray-500">Sin vínculo con Odoo</span>
            <button type="button" disabled={disabled} className="ml-auto font-medium underline disabled:opacity-40" onClick={() => setSearching(true)}>
              Vincular
            </button>
          </div>
        )
      ) : (
        <div className="rounded-md border border-gray-200">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={`${uid}-details`}
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
          >
            {status === "loading"
              ? <Loader2 size={12} className="shrink-0 animate-spin text-gray-400" aria-hidden />
              : <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden />}
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium">{shown?.name ?? (shown && !shown.found ? "Producto no encontrado" : "Producto vinculado")}</span>
              <span className="text-gray-500"> · ID {value}{shown?.found ? ` · ${shown.companyName ?? "Visible para todos"}` : ""}</span>
            </span>
            <span className={`hidden shrink-0 text-xs font-medium sm:inline ${meta.tone}`}>{meta.text}</span>
            <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
          </button>

          {expanded && (
            <div id={`${uid}-details`} className="space-y-3 border-t border-gray-200 px-3 py-3">
              <p className={`text-xs font-medium sm:hidden ${meta.tone}`}>{meta.text}</p>
              {detailsError && <p className="text-red-700">{detailsError} El ID se conserva; podés guardar otros cambios.</p>}

              {shown?.found && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <dt className="text-gray-500">Variante</dt>
                  <dd>
                    <a href={`${ODOO_WEB_URL}/web#id=${shown.id}&model=product.product&view_type=form`} target="_blank" rel="noopener noreferrer"
                      title="Abrir la variante en Odoo"
                      className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:text-sky-700">
                      ID {shown.id}<ExternalLink size={12} aria-hidden />
                    </a>
                  </dd>
                  <dt className="text-gray-500">Plantilla</dt>
                  <dd>{shown.templateId ? `ID ${shown.templateId}` : "—"}</dd>
                  <dt className="text-gray-500">Referencia interna</dt>
                  <dd>{shown.defaultCode ?? "—"}</dd>
                  <dt className="text-gray-500">Código de barras</dt>
                  <dd>{shown.barcode ?? "—"}</dd>
                  <dt className="text-gray-500">Unidad de medida</dt>
                  <dd>{shown.uomName ?? "—"}</dd>
                  <dt className="text-gray-500">Empresa</dt>
                  <dd>{shown.companyName ?? "Visible para todos"}</dd>
                </dl>
              )}

              {shown && (
                <div>
                  <p className="mb-1.5 font-medium text-gray-700">Requisitos para exportar</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {shown.checks.map((check) => (
                      <li key={check.key}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${check.ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
                        {check.ok ? <Check size={12} aria-hidden /> : <X size={12} aria-hidden />}
                        {check.label}
                        <span className="sr-only">{check.ok ? ": cumple" : ": no cumple"}</span>
                      </li>
                    ))}
                  </ul>
                  {failed.length > 0 && (
                    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-amber-800">
                      {failed.map((check) => <li key={check.key}>{check.hint}</li>)}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    Son los requisitos que el catálogo verifica antes de exportar y aplican a pedidos nuevos: un pedido con la
                    exportación ya iniciada conserva el ID con el que se creó. Odoo puede rechazar el presupuesto por reglas propias.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-2">
                <button type="button" disabled={disabled} className="underline disabled:opacity-40" onClick={() => setSearching(true)}>Cambiar producto</button>
                <button type="button" disabled={disabled} className="text-red-600 underline disabled:opacity-40"
                  onClick={() => { onChange(null); closeSearch(); setExpanded(false); }}>Quitar vínculo</button>
                {(detailsError || status === "ready" || status === "blocked") && (
                  <button type="button" disabled={disabled} className="underline disabled:opacity-40" onClick={() => setRetry((n) => n + 1)}>
                    {detailsError ? "Reintentar" : "Volver a consultar"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {searching && (
        <div className="relative" onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) { setOpen(false); sequence.current++; }
        }}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label htmlFor={`${uid}-search`} className="text-gray-600">{value === null ? "Buscar producto en Odoo" : "Buscar otro producto en Odoo"}</label>
            <button type="button" className="text-xs text-gray-500 underline" onClick={closeSearch}>Cancelar</button>
          </div>
          <input
            id={`${uid}-search`} ref={input} role="combobox" aria-autocomplete="list"
            aria-expanded={open} aria-controls={open ? `${uid}-list` : undefined}
            aria-activedescendant={open && results[highlight] ? `${uid}-option-${highlight}` : undefined}
            aria-describedby={open ? `${uid}-status` : undefined} autoComplete="off" maxLength={120}
            disabled={disabled} value={query} placeholder="Escribí al menos 2 caracteres…"
            className="w-full rounded border border-gray-300 px-3 py-2"
            onFocus={() => setOpen(true)}
            onChange={(event) => { sequence.current++; setResults([]); setError(""); setQuery(event.target.value); setOpen(true); }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault(); setOpen(true);
                setHighlight((n) => Math.max(0, Math.min(results.length - 1, n + (event.key === "ArrowDown" ? 1 : -1))));
              } else if (event.key === "Enter") {
                event.preventDefault();
                if (open && results[highlight]) choose(results[highlight]);
              } else if (event.key === "Escape") { event.preventDefault(); closeSearch(); }
            }}
          />
          <p className="mt-1 text-xs text-gray-500">El vínculo se guarda al guardar el formulario. No modifica los datos del catálogo.</p>
          {open && (
            <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
              <p id={`${uid}-status`} role="status" className="px-3 py-2 text-xs text-gray-500">
                {query.trim().length < 2 ? "Escribí al menos 2 caracteres." : loading ? "Buscando en Odoo…" : error || (results.length ? `${results.length} resultados` : "Sin resultados en Odoo.")}
              </p>
              {error && <button type="button" disabled={disabled} className="px-3 py-2 underline" onClick={() => setRetry((n) => n + 1)}>Reintentar búsqueda</button>}
              <ul id={`${uid}-list`} role="listbox" aria-label="Productos de Odoo" className="max-h-64 overflow-y-auto py-1">
                {results.map((product, index) => (
                  <li key={product.id} id={`${uid}-option-${index}`} role="option" aria-selected={product.id === value}
                    onMouseEnter={() => setHighlight(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => { if (!disabled) choose(product); }}
                    className={`cursor-pointer px-3 py-2 ${highlight === index ? "bg-gray-100" : ""}`}>
                    {label(product)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
