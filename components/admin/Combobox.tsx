"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
}

interface ComboboxProps<T extends ComboboxOption> {
  value: string;
  onChange: (value: string, option?: T) => void;
  options: T[];
  placeholder?: string;
  allowCustom?: boolean;
  className?: string;
}

export default function Combobox<T extends ComboboxOption>({
  value,
  onChange,
  options,
  placeholder = "Buscar...",
  allowCustom = true,
  className = "",
}: ComboboxProps<T>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selectedLabel = useMemo(() => {
    const match = options.find((o) => o.value === value);
    return match?.label ?? value ?? "";
  }, [value, options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        o.hint?.toLowerCase().includes(q),
    );
  }, [query, options]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (highlight >= filtered.length) {
      setHighlight(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, highlight]);

  function selectOption(opt: T) {
    onChange(opt.value, opt);
    setOpen(false);
  }

  function commitCustom() {
    if (!allowCustom) return;
    const trimmed = query.trim();
    if (trimmed) {
      onChange(trimmed);
      setOpen(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlight]) selectOption(filtered[highlight]);
      else commitCustom();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className="flex items-center justify-between w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white hover:border-gray-400"
      >
        <span className={`truncate text-left ${value ? "" : "text-gray-400"}`}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`ml-2 shrink-0 text-gray-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {value && !open && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
          }}
          className="absolute top-1/2 right-7 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Limpiar"
        >
          <X size={12} />
        </button>
      )}

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 px-2 py-1.5">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Buscar o escribir ID manual..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-gray-500">
                {allowCustom && query.trim() ? (
                  <button
                    type="button"
                    onClick={commitCustom}
                    className="text-left w-full hover:text-gray-900"
                  >
                    Usar &quot;<span className="font-medium">{query}</span>&quot; como ID manual
                  </button>
                ) : (
                  "Sin resultados."
                )}
              </li>
            )}
            {filtered.map((opt, i) => {
              const isHighlighted = i === highlight;
              const isSelected = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => selectOption(opt)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm ${
                      isHighlighted ? "bg-gray-100" : ""
                    } ${isSelected ? "text-gray-900 font-medium" : "text-gray-700"}`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {opt.hint && (
                      <span className="shrink-0 text-[10px] text-gray-400">
                        {opt.hint}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {allowCustom &&
              query.trim() &&
              filtered.length > 0 &&
              !filtered.some((o) => o.value === query.trim()) && (
                <li className="border-t border-gray-100">
                  <button
                    type="button"
                    onClick={commitCustom}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-500 hover:text-gray-900"
                  >
                    Usar &quot;<span className="font-medium">{query}</span>&quot; como ID manual
                  </button>
                </li>
              )}
          </ul>
        </div>
      )}
    </div>
  );
}
