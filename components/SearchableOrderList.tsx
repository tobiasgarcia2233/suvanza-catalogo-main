"use client";

import { useMemo, useRef, useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isClosedSale, type Order } from "@/types";
import { OrderRow } from "./OrderRow";
import { Loader2, RefreshCw, Search, X } from "lucide-react";
import { isRefreshPaused } from "@/store/refreshGuardStore";
import type { EventOption } from "@/lib/eventQueries";
import { EventCombobox } from "./EventCombobox";
import { DISPLAY_STATUS_META, orderDisplayStatus } from "@/lib/orderDisplayStatus";

interface SearchableOrderListProps {
  initialOrders: Order[];
  /** Paid orders whose Odoo export needs action, of any date (see fetchRecentOrders). */
  attentionOrders: Order[];
  events: EventOption[];
}

// The bulk route accepts up to 20 ids per request.
const RETRY_BATCH = 20;

const needsDecision = (o: Order) =>
  DISPLAY_STATUS_META[orderDisplayStatus(isClosedSale(o.status), o.odoo_export_status)].attention;

type StatusTab = "" | "pending" | "paid" | "attention";
type Period = "default" | "today" | "7d" | "month" | "custom";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "paid", label: "Cobrados" },
  { value: "attention", label: "Requiere atención" },
];

const money = (n: number) => `$${n.toLocaleString("es-AR")}`;

/** YYYY-MM-DD in local time (what <input type="date"> and the URL use). */
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function presetRange(p: Exclude<Period, "default" | "custom">): [string, string] {
  const today = new Date();
  const end = isoDay(today);
  if (p === "today") return [end, end];
  if (p === "7d") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return [isoDay(start), end];
  }
  return [isoDay(new Date(today.getFullYear(), today.getMonth(), 1)), end];
}

function detectPeriod(start: string, end: string): Period {
  if (!start || !end) return "default";
  for (const p of ["today", "7d", "month"] as const) {
    const [s, e] = presetRange(p);
    if (s === start && e === end) return p;
  }
  return "custom";
}

const formatDay = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};

export function SearchableOrderList({ initialOrders, attentionOrders, events }: SearchableOrderListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const urlQuery = searchParams.get("q") || "";
  const urlStart = searchParams.get("startDate") || "";
  const urlEnd = searchParams.get("endDate") || "";
  const eventFilter = searchParams.get("event") || "";
  const statusParam = searchParams.get("status") || "";
  const statusTab: StatusTab = STATUS_TABS.some((t) => t.value === statusParam)
    ? (statusParam as StatusTab)
    : "";

  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [period, setPeriod] = useState<Period>(() => detectPeriod(urlStart, urlEnd));
  const [customStart, setCustomStart] = useState(urlStart);
  const [customEnd, setCustomEnd] = useState(urlEnd);
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<{ tone: "ok" | "warn" | "error"; text: string } | null>(null);

  // Keep the controls in step with the URL (back/forward, chips, "Limpiar").
  // A half-filled custom range has no URL yet, so it isn't reset.
  useEffect(() => {
    if (urlStart && urlEnd) {
      setPeriod(detectPeriod(urlStart, urlEnd));
      setCustomStart(urlStart);
      setCustomEnd(urlEnd);
    } else {
      setPeriod((p) => (p === "custom" ? p : "default"));
    }
  }, [urlStart, urlEnd]);

  const eventNames = useMemo(
    () => new Map(events.map((e) => [e.id, e.name])),
    [events],
  );

  // An event without dates lists all of its orders (see fetchRecentOrders).
  const isWholeEvent = !!eventFilter && eventFilter !== "individual";
  const defaultPeriodLabel = isWholeEvent ? "Todo el evento" : "Últimas 24 hs";

  // Every filter that hits the server goes through here.
  const pushParams = (patch: Record<string, string>, mode: "push" | "replace" = "push") => {
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(patch)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const url = `/orders?${params.toString()}`;
      if (mode === "replace") router.replace(url);
      else router.push(url);
    });
  };

  // The status tab only filters what is already loaded, so it updates the URL
  // without a server round-trip.
  const setStatusTab = (tab: StatusTab) => {
    const params = new URLSearchParams(window.location.search);
    if (tab) params.set("status", tab);
    else params.delete("status");
    window.history.replaceState(null, "", `/orders?${params.toString()}`);
  };

  // Search applies by itself after a short pause in typing.
  useEffect(() => {
    if (searchQuery.trim() === urlQuery) return;
    const t = setTimeout(() => pushParams({ q: searchQuery.trim() }, "replace"), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, urlQuery]);

  const choosePeriod = (p: Period) => {
    setPeriod(p);
    if (p === "default") pushParams({ startDate: "", endDate: "" });
    else if (p !== "custom") {
      const [s, e] = presetRange(p);
      pushParams({ startDate: s, endDate: e });
    }
  };

  const setCustomRange = (start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    if (start && end && start <= end) pushParams({ startDate: start, endDate: end });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setPeriod("default");
    setCustomStart("");
    setCustomEnd("");
    startTransition(() => router.push("/orders"));
  };

  // Instead of blindly re-rendering the whole page every few seconds, poll a
  // tiny endpoint and only refresh when it reports that orders actually
  // changed. Skips work while a modal is open, the tab is hidden, or the user
  // is looking at a fixed date range (history — no need for live updates).
  const lastPulseRef = useRef<string | null>(null);
  const hasDateFilter = !!urlStart || !!urlEnd;
  useEffect(() => {
    if (hasDateFilter) return;

    let cancelled = false;

    const check = async () => {
      if (isRefreshPaused() || document.hidden) return;
      try {
        const res = await fetch("/api/orders/pulse", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const sig = `${data.count}:${data.latest}:${data.paid}`;
        if (lastPulseRef.current === null) {
          lastPulseRef.current = sig;
          return;
        }
        if (sig !== lastPulseRef.current) {
          lastPulseRef.current = sig;
          router.refresh();
        }
      } catch {
        /* transient network error — retry on the next tick */
      }
    };

    check();
    const interval = setInterval(check, 12000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router, hasDateFilter]);

  // Totals and tab counts always cover every loaded order, so they don't
  // change when switching tabs. "Requiere atención" comes from the server
  // without the period limit.
  const { totals, counts, byTab } = useMemo(() => {
    const totals = { grand: 0, paid: 0, pending: 0 };
    const byTab: Record<StatusTab, Order[]> = { "": [], pending: [], paid: [], attention: attentionOrders };
    for (const o of initialOrders) {
      const paid = isClosedSale(o.status);
      totals.grand += o.total;
      byTab[""].push(o);
      if (paid) {
        totals.paid += o.total;
        byTab.paid.push(o);
      } else {
        totals.pending += o.total;
        byTab.pending.push(o);
      }
    }
    const counts = Object.fromEntries(
      Object.entries(byTab).map(([k, v]) => [k, v.length]),
    ) as Record<StatusTab, number>;
    return { totals, counts, byTab };
  }, [initialOrders, attentionOrders]);

  // Red when something needs a decision; yellow when it's only waiting to be sent.
  const attentionHasProblems = useMemo(() => attentionOrders.some(needsDecision), [attentionOrders]);
  // Plain retries only; the server skips anything else as well.
  const retryableIds = useMemo(
    () =>
      attentionOrders
        .filter((o) => o.odoo_export_status === "pending" || o.odoo_export_status === "error")
        .map((o) => o.id),
    [attentionOrders],
  );

  async function retryAll() {
    setRetrying(true);
    setRetryResult(null);
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    try {
      for (let i = 0; i < retryableIds.length; i += RETRY_BATCH) {
        const res = await fetch("/api/orders/bulk-transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: retryableIds.slice(i, i + RETRY_BATCH), transferred: true }),
        });
        const data = await res.json().catch(() => ({}));
        skipped += Array.isArray(data.skipped) ? data.skipped.length : 0;
        if (res.status === 409) continue;
        if (!res.ok) throw new Error(data.message || "No se pudo reintentar.");
        for (const r of data.results ?? []) {
          if (r.export?.status === "exported") sent++;
          else failed++;
        }
      }
      const parts = [`${sent} enviado${sent === 1 ? "" : "s"} a Odoo`];
      if (failed) parts.push(`${failed} siguen con problemas`);
      if (skipped) parts.push(`${skipped} necesitan revisarse uno por uno`);
      setRetryResult({ tone: failed || skipped ? "warn" : "ok", text: `${parts.join(" · ")}.` });
    } catch (e) {
      setRetryResult({ tone: "error", text: e instanceof Error ? e.message : "No se pudo reintentar." });
    } finally {
      setRetrying(false);
      startTransition(() => router.refresh());
    }
  }

  const visibleOrders = byTab[statusTab];
  const avgTicket = initialOrders.length > 0 ? Math.round(totals.grand / initialOrders.length) : 0;

  const periodLabel =
    period === "default" || !urlStart || !urlEnd
      ? defaultPeriodLabel
      : urlStart === urlEnd
        ? formatDay(urlStart)
        : `${formatDay(urlStart)} – ${formatDay(urlEnd)}`;

  const chips: { label: string; onRemove: () => void }[] = [];
  if (eventFilter) {
    chips.push({
      label: `Evento: ${
        eventFilter === "individual"
          ? "Venta individual"
          : eventNames.get(eventFilter) ?? "Evento eliminado"
      }`,
      onRemove: () => pushParams({ event: "" }),
    });
  }
  if (urlStart && urlEnd) {
    chips.push({ label: `Período: ${periodLabel}`, onRemove: () => choosePeriod("default") });
  }
  if (urlQuery) {
    chips.push({
      label: `Búsqueda: “${urlQuery}”`,
      onRemove: () => {
        setSearchQuery("");
        pushParams({ q: "" }, "replace");
      },
    });
  }

  const periodButton = (p: Period, label: string) => (
    <button
      key={p}
      type="button"
      onClick={() => choosePeriod(p)}
      aria-pressed={period === p}
      className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
        period === p
          ? "bg-surface shadow-sm font-semibold text-text-primary"
          : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );

  const kpiCard = (
    label: string,
    value: string,
    tone: string,
    tab?: StatusTab,
  ) => {
    const active = tab !== undefined && statusTab === tab;
    const content = (
      <>
        <p className="text-[11px] uppercase tracking-wide opacity-80">{label}</p>
        <p className="mt-0.5 font-semibold text-xl">{value}</p>
      </>
    );
    const base = `rounded-lg border px-4 py-3 text-left ${tone}`;
    if (tab === undefined) return <div className={base}>{content}</div>;
    return (
      <button
        type="button"
        onClick={() => setStatusTab(active ? "" : tab)}
        aria-pressed={active}
        className={`${base} transition-shadow hover:shadow-md ${active ? "ring-2 ring-offset-1 ring-current" : ""}`}
      >
        {content}
      </button>
    );
  };

  return (
    <div>
      {/* Resumen del período */}
      <div className="gap-3 grid grid-cols-2 lg:grid-cols-4 mb-6">
        {kpiCard(`Total · ${periodLabel}`, money(totals.grand), "border-border bg-surface text-text-primary", "")}
        {kpiCard("Cobrado", money(totals.paid), "border-green-200 bg-green-50 text-green-800", "paid")}
        {kpiCard("Pendiente", money(totals.pending), "border-yellow-200 bg-yellow-50 text-yellow-800", "pending")}
        {kpiCard("Ticket promedio", money(avgTicket), "border-border bg-surface text-text-primary")}
      </div>

      {/* Filtros */}
      <div className="bg-surface mb-4 p-3 border border-border rounded-xl">
        <div className="flex lg:flex-row flex-col lg:items-center gap-3">
          <div className="relative flex-grow">
            <Search
              className="top-1/2 left-3 absolute text-text-secondary -translate-y-1/2"
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && pushParams({ q: searchQuery.trim() }, "replace")}
              placeholder="Buscar por nombre o DNI"
              className="py-2.5 pr-9 pl-10 border border-border focus:border-brand rounded-lg focus:ring-brand w-full text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Borrar búsqueda"
                className="top-1/2 right-3 absolute text-text-secondary hover:text-text-primary -translate-y-1/2"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <EventCombobox
            events={events}
            value={eventFilter}
            onChange={(v) => pushParams({ event: v })}
          />

          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
            {periodButton("default", isWholeEvent ? "Todo" : "24 hs")}
            {periodButton("today", "Hoy")}
            {periodButton("7d", "7 días")}
            {periodButton("month", "Este mes")}
            {periodButton("custom", "Personalizado")}
          </div>
        </div>

        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <input
              type="date"
              value={customStart}
              max={customEnd || undefined}
              onChange={(e) => setCustomRange(e.target.value, customEnd)}
              aria-label="Desde"
              className="px-3 py-2 border border-border focus:border-brand rounded-lg focus:ring-brand text-sm"
            />
            <span className="text-text-secondary text-sm">a</span>
            <input
              type="date"
              value={customEnd}
              min={customStart || undefined}
              onChange={(e) => setCustomRange(customStart, e.target.value)}
              aria-label="Hasta"
              className="px-3 py-2 border border-border focus:border-brand rounded-lg focus:ring-brand text-sm"
            />
            {(!customStart || !customEnd) && (
              <span className="text-text-secondary text-xs">Elegí ambas fechas para aplicar.</span>
            )}
          </div>
        )}

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-border border-t">
            {chips.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1 bg-gray-100 py-1 pr-1 pl-3 rounded-full text-text-primary text-xs"
              >
                {c.label}
                <button
                  type="button"
                  onClick={c.onRemove}
                  aria-label={`Quitar ${c.label}`}
                  className="hover:bg-gray-200 p-0.5 rounded-full text-text-secondary hover:text-text-primary"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="ml-1 text-text-secondary hover:text-text-primary text-xs underline"
            >
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* Pestañas de estado */}
      <div className="flex items-center gap-1 mb-4 border-border border-b overflow-x-auto">
        {STATUS_TABS.map((t) => {
          const active = statusTab === t.value;
          const badgeTone =
            counts[t.value] === 0
              ? "bg-gray-100 text-text-secondary"
              : t.value === "attention"
                ? attentionHasProblems
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-800"
                : t.value === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-text-secondary";
          return (
            <button
              key={t.value || "all"}
              type="button"
              onClick={() => setStatusTab(t.value)}
              aria-pressed={active}
              className={`-mb-px flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm whitespace-nowrap transition-colors ${
                active
                  ? "border-brand font-semibold text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {t.label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${badgeTone}`}>
                {counts[t.value]}
              </span>
            </button>
          );
        })}
        {isPending && (
          <Loader2 size={16} className="ml-auto mr-2 text-text-secondary animate-spin" aria-label="Cargando" />
        )}
      </div>

      {statusTab === "attention" && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm text-text-secondary">
            Pedidos cobrados con el envío a Odoo sin terminar, de cualquier fecha.
          </p>
          {retryableIds.length > 0 && (
            <button
              type="button"
              onClick={retryAll}
              disabled={retrying || isPending}
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 px-4 py-2 rounded-md font-semibold text-sm text-white"
            >
              {retrying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Reintentar envíos ({retryableIds.length})
            </button>
          )}
          {retryResult && (
            <p
              className={`w-full rounded-md border px-3 py-2 text-sm ${
                retryResult.tone === "ok"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : retryResult.tone === "warn"
                    ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                    : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {retryResult.text}
            </p>
          )}
        </div>
      )}

      <div className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {visibleOrders.length > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="flex border-border border-b">
              <div className="w-11 shrink-0" />
              <div className="gap-4 grid grid-cols-7 flex-1 px-4 pb-2">
                <div className="col-span-2 font-semibold text-text-secondary text-sm">
                  COMPRADOR
                </div>
                <div className="font-semibold text-text-secondary text-sm">
                  ATENDIÓ
                </div>
                <div className="font-semibold text-text-secondary text-sm">
                  FECHA
                </div>
                <div className="font-semibold text-text-secondary text-sm text-right">
                  TOTAL
                </div>
                <div className="font-semibold text-text-secondary text-sm text-center">
                  ESTADO
                </div>
                <div className="font-semibold text-text-secondary text-sm text-right">
                  ACCIONES
                </div>
              </div>
            </div>
            {visibleOrders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                events={events}
                eventName={
                  order.event_id
                    ? eventNames.get(order.event_id) ?? "Evento eliminado"
                    : "Venta individual"
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center gap-2 bg-surface border-2 border-border border-dashed rounded-lg h-64 text-center">
            <p className="text-text-secondary">
              {statusTab === "attention"
                ? "No hay pedidos con el envío a Odoo pendiente."
                : initialOrders.length > 0
                ? `No hay pedidos en “${STATUS_TABS.find((t) => t.value === statusTab)?.label}”.`
                : chips.length > 0
                  ? "No se encontraron pedidos para los filtros aplicados."
                  : `No hay pedidos en ${defaultPeriodLabel.toLowerCase()}.`}
            </p>
            {statusTab !== "attention" && initialOrders.length === 0 && !isWholeEvent && period === "default" && (
              <button
                type="button"
                onClick={() => choosePeriod("7d")}
                className="text-brand text-sm underline"
              >
                Ver últimos 7 días
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
