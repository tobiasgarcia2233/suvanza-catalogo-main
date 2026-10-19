"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import type { EventOption } from "@/lib/eventQueries";

type Item = { value: string; label: string; group: string | null };

/**
 * Searchable sales-context filter: every order, "Individual" (outside
 * events), or one event. Value: "" | "individual" | event id.
 */
export function EventCombobox({
  events,
  value,
  onChange,
}: {
  events: EventOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(
    () => [
      { value: "", label: "Todos los eventos", group: null },
      { value: "individual", label: "Venta individual", group: null },
      ...events
        .filter((e) => e.status === "active")
        .map((e) => ({ value: e.id, label: e.name, group: "Abiertos" })),
      ...events
        .filter((e) => e.status !== "active")
        .map((e) => ({ value: e.id, label: e.name, group: "Cerrados" })),
    ],
    [events],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const current = items.find((i) => i.value === value);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlight(0);
    inputRef.current?.focus();
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const select = (v: string) => {
    setOpen(false);
    if (v !== value) onChange(v);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && filtered[highlight]) {
      e.preventDefault();
      select(filtered[highlight].value);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filtrar por evento"
        className="flex items-center justify-between gap-2 bg-surface px-3 py-2.5 border border-border hover:border-gray-300 rounded-lg w-full sm:w-56 text-sm text-left"
      >
        <span className="truncate text-text-primary">{current?.label ?? "Evento eliminado"}</span>
        <ChevronDown size={16} className="shrink-0 text-text-secondary" />
      </button>

      {open && (
        <div
          className="z-30 absolute bg-surface shadow-lg mt-1 border border-border rounded-lg w-full sm:w-72 overflow-hidden"
          onKeyDown={onKeyDown}
        >
          <div className="relative border-border border-b">
            <Search size={16} className="top-1/2 left-3 absolute text-text-secondary -translate-y-1/2" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              placeholder="Buscar evento..."
              className="py-2.5 pr-3 pl-9 outline-none w-full text-sm"
            />
          </div>
          <ul role="listbox" className="py-1 max-h-72 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-text-secondary">Sin resultados</li>
            )}
            {filtered.map((item, i) => {
              const showGroup = item.group && filtered[i - 1]?.group !== item.group;
              return (
                <li key={item.value || "all"}>
                  {showGroup && (
                    <p className="px-3 pt-2 pb-1 font-semibold text-[10px] text-text-secondary uppercase tracking-wide">
                      {item.group}
                    </p>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={item.value === value}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => select(item.value)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 w-full text-sm text-left ${
                      i === highlight ? "bg-gray-100" : ""
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.value === value && <Check size={14} className="shrink-0 text-brand" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
