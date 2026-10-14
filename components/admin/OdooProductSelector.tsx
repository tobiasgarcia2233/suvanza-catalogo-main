"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { OdooProduct } from "@/types";

const label = (p: OdooProduct) => `${p.name} — ID ${p.id} — ${p.companyName}`;

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
  const [selected, setSelected] = useState<OdooProduct | null>(null);
  const [linkMessage, setLinkMessage] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (value === null) { setSelected(null); setLinkMessage(""); return; }
    const controller = new AbortController();
    let current = true;
    setSelected(null);
    setLinkMessage("Cargando producto vinculado…");
    async function load() {
      try {
        const res = await fetch(`/api/odoo/products?id=${value}`, { signal: controller.signal, cache: "no-store" });
        const data = await res.json();
        if (!current) return;
        if (!res.ok) {
          setLinkMessage(res.status === 422 ? data.message : "No se pudo cargar el producto vinculado. El ID se conserva; podés guardar otros cambios o reintentar.");
          return;
        }
        setSelected(data.product);
        setLinkMessage("");
      } catch {
        if (current) setLinkMessage("No se pudo cargar el producto vinculado. El ID se conserva; podés guardar otros cambios o reintentar.");
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

  function choose(product: OdooProduct) {
    sequence.current++;
    onChange(product.id);
    setSelected(product);
    setLinkMessage("");
    setQuery("");
    setResults([]);
    setOpen(false);
    input.current?.focus();
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-xs text-gray-500">El vínculo se guarda al guardar el formulario. No modifica los datos del catálogo.</p>
      <label className="flex flex-col gap-1" htmlFor={`${uid}-id`}>
        <span className="text-gray-600">ID del producto en Odoo</span>
        <input id={`${uid}-id`} readOnly value={value ?? ""} placeholder="Sin vínculo" className="rounded border border-gray-300 bg-gray-50 px-3 py-2 sm:max-w-xs" />
      </label>
      <div aria-live="polite">
        {selected?.id === value && <p>{label(selected)}</p>}
        {value !== null && linkMessage && <p className="text-amber-700">{linkMessage}</p>}
      </div>
      {value !== null && (
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={disabled} className="underline" onClick={() => { setOpen(true); input.current?.focus(); }}>Cambiar producto</button>
          <button type="button" disabled={disabled} className="text-red-600 underline" onClick={() => { onChange(null); setSelected(null); setLinkMessage(""); setQuery(""); setOpen(false); sequence.current++; }}>Quitar vínculo</button>
          {linkMessage && <button type="button" disabled={disabled} className="underline" onClick={() => setRetry((n) => n + 1)}>Reintentar carga</button>}
        </div>
      )}
      <div className="relative" onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) { setOpen(false); sequence.current++; }
      }}>
        <label htmlFor={`${uid}-search`} className="text-gray-600">Buscar producto en Odoo</label>
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
            } else if (event.key === "Escape") { event.preventDefault(); setOpen(false); sequence.current++; }
          }}
        />
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
    </div>
  );
}
