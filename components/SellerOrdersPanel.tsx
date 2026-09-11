"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Package,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import type { Order } from "@/types";

// Runtime field not in the shared Order type — see lib/orderQueries.ts.
type SellerOrder = Order & { transferred_to_odoo?: boolean };

type Period = "today" | "week" | "month" | "all";
type StatusFilter = "all" | "done" | "pending";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "7 días" },
  { key: "month", label: "Este mes" },
  { key: "all", label: "Todas" },
];

const STATUSES: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Pendientes" },
  { key: "done", label: "Concretadas" },
];

function isFinalized(order: SellerOrder) {
  return order.status === "COMPLETED" || !!order.transferred_to_odoo;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Lower bound (inclusive) for a period, or null when everything is in range. */
function periodFloor(period: Period): Date | null {
  const today = startOfDay(new Date());
  switch (period) {
    case "today":
      return today;
    case "week": {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return d;
    }
    case "month":
      return new Date(today.getFullYear(), today.getMonth(), 1);
    case "all":
      return null;
  }
}

const money = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

/** "Hoy" / "Ayer" / "lun 8 sep" — the header of each day group in the list. */
function dayLabel(iso: string) {
  const day = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  const diff = Math.round((today.getTime() - day.getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return day.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SellerOrdersPanel({ sellerSlug }: { sellerSlug: string }) {
  const {
    openConfirmationModal,
    openCart,
    isSellerOrdersOpen: isOpen,
    closeSellerOrders,
  } = useUIStore();
  const { loadOrderForEdit } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("today");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/orders?sellerSlug=${encodeURIComponent(sellerSlug)}`,
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      setError("No se pudieron cargar tus pedidos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSellerOrders();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, closeSellerOrders]);

  // Orders inside the selected period — the stats always describe this set, so
  // the search box narrows the list without making the totals lie about it.
  const periodOrders = useMemo(() => {
    const floor = periodFloor(period);
    if (!floor) return orders;
    return orders.filter((o) => new Date(o.created_at) >= floor);
  }, [orders, period]);

  const stats = useMemo(() => {
    let total = 0;
    let done = 0;
    let doneTotal = 0;
    let units = 0;
    for (const o of periodOrders) {
      total += o.total;
      if (isFinalized(o)) {
        done += 1;
        doneTotal += o.total;
      }
      units += o.items.reduce((sum, it) => sum + (it.quantity || 0), 0);
    }
    return {
      total,
      done,
      doneTotal,
      units,
      count: periodOrders.length,
      pending: periodOrders.length - done,
      average: periodOrders.length ? total / periodOrders.length : 0,
    };
  }, [periodOrders]);

  const visibleOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return periodOrders.filter((o) => {
      if (status === "done" && !isFinalized(o)) return false;
      if (status === "pending" && isFinalized(o)) return false;
      if (!q) return true;
      const buyer = o.buyer_details;
      return (
        buyer.name?.toLowerCase().includes(q) ||
        buyer.dni?.toLowerCase().includes(q) ||
        buyer.phone?.toLowerCase().includes(q) ||
        o.items.some((it) => `${it.brand} ${it.name}`.toLowerCase().includes(q))
      );
    });
  }, [periodOrders, status, query]);

  // Day separators only earn their space once the list can span several days.
  const groups = useMemo(() => {
    if (period === "today") return [{ label: "", orders: visibleOrders }];
    const out: { label: string; orders: SellerOrder[] }[] = [];
    for (const order of visibleOrders) {
      const label = dayLabel(order.created_at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.orders.push(order);
      else out.push({ label, orders: [order] });
    }
    return out;
  }, [visibleOrders, period]);

  const handleEdit = (order: SellerOrder) => {
    loadOrderForEdit(order, sellerSlug);
    closeSellerOrders();
    openCart();
  };

  const handleDelete = (order: SellerOrder) => {
    openConfirmationModal({
      title: "Eliminar pedido",
      message: `¿Eliminar el pedido de ${order.buyer_details.name}?`,
      onConfirm: async () => {
        setDeletingId(order.id);
        try {
          const res = await fetch(
            `/api/orders/${order.id}?sellerSlug=${encodeURIComponent(sellerSlug)}`,
            { method: "DELETE" },
          );
          if (!res.ok) throw new Error();
          setOrders((prev) => prev.filter((o) => o.id !== order.id));
        } catch {
          alert("No se pudo eliminar el pedido.");
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  if (!isOpen) return null;

  const periodLabel =
    PERIODS.find((p) => p.key === period)?.label.toLowerCase() ?? "";
  const isFiltered = !!query.trim() || status !== "all";

  return (
    <div
      className="z-[70] fixed inset-0 flex sm:justify-center sm:items-center bg-background/80 backdrop-blur-sm sm:p-4"
      onClick={closeSellerOrders}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col bg-surface shadow-2xl sm:rounded-xl w-full sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[88vh]"
      >
        <div className="flex justify-between items-center gap-2 px-4 sm:px-6 pt-5 pb-3">
          <div>
            <h2 className="font-bold text-xl">Mis ventas</h2>
            <p className="text-text-secondary text-xs">
              {stats.count} venta{stats.count === 1 ? "" : "s"} · {periodLabel}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={loadOrders}
              disabled={isLoading}
              className="hover:bg-background p-2 rounded-full text-text-secondary transition disabled:opacity-50"
              aria-label="Actualizar"
            >
              <RefreshCw
                size={18}
                className={isLoading ? "animate-spin" : undefined}
              />
            </button>
            <button
              onClick={closeSellerOrders}
              className="hover:bg-background p-2 rounded-full text-text-secondary transition"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-3 border-border border-b">
          <div className="gap-2 grid grid-cols-3 mb-3">
            <div className="bg-background px-3 py-2 border border-border rounded-lg">
              <p className="text-[10px] text-text-secondary uppercase tracking-wide">
                Vendido
              </p>
              <p className="font-bold text-brand text-base leading-tight">
                {money(stats.total)}
              </p>
            </div>
            <div className="bg-green-50 px-3 py-2 border border-green-200 rounded-lg">
              <p className="text-[10px] text-green-700 uppercase tracking-wide">
                Concretadas
              </p>
              <p className="font-bold text-green-800 text-base leading-tight">
                {stats.done}
                <span className="ml-1 font-medium text-green-700 text-xs">
                  {money(stats.doneTotal)}
                </span>
              </p>
            </div>
            <div className="bg-background px-3 py-2 border border-border rounded-lg">
              <p className="text-[10px] text-text-secondary uppercase tracking-wide">
                Ticket prom.
              </p>
              <p className="font-bold text-text-primary text-base leading-tight">
                {money(stats.average)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-2 overflow-x-auto no-scrollbar">
            <CalendarDays
              size={16}
              className="shrink-0 text-text-secondary"
              aria-hidden
            />
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  period === p.key
                    ? "bg-brand text-white"
                    : "bg-background text-text-secondary hover:text-text-primary"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex sm:flex-row flex-col gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="top-1/2 left-3 absolute text-text-secondary -translate-y-1/2"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, DNI o producto"
                className="bg-background py-2 pr-8 pl-9 border border-border focus:border-brand rounded-lg focus:outline-none w-full text-sm"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="top-1/2 right-2 absolute text-text-secondary hover:text-text-primary -translate-y-1/2"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="flex gap-1">
              {STATUSES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStatus(s.key)}
                  className={`flex-1 sm:flex-none rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    status === s.key
                      ? "bg-text-primary text-white"
                      : "bg-background text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {s.label}
                  {s.key === "pending" && stats.pending > 0 && (
                    <span className="ml-1 opacity-70">{stats.pending}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 sm:px-6 py-3 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10 text-text-secondary">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : error ? (
            <p className="py-4 text-red-600 text-sm text-center">{error}</p>
          ) : visibleOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Package size={32} className="text-text-secondary/50" />
              <p className="text-text-secondary text-sm">
                {orders.length === 0
                  ? "Todavía no tenés ventas."
                  : isFiltered
                    ? "Ninguna venta coincide con la búsqueda."
                    : `Sin ventas en el período "${periodLabel}".`}
              </p>
              {orders.length > 0 && (
                <button
                  onClick={() => {
                    setPeriod("all");
                    setStatus("all");
                    setQuery("");
                  }}
                  className="font-medium text-brand text-sm underline underline-offset-2"
                >
                  Ver todas mis ventas
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((group) => (
                <div key={group.label || "single"}>
                  {group.label && (
                    <p className="mb-1.5 font-semibold text-text-secondary text-xs uppercase tracking-wide">
                      {group.label}
                    </p>
                  )}
                  <ul className="flex flex-col gap-2">
                    {group.orders.map((order) => (
                      <SellerOrderCard
                        key={order.id}
                        order={order}
                        expanded={expandedId === order.id}
                        onToggle={() =>
                          setExpandedId((id) =>
                            id === order.id ? null : order.id,
                          )
                        }
                        onEdit={() => handleEdit(order)}
                        onDelete={() => handleDelete(order)}
                        isDeleting={deletingId === order.id}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {!isLoading && !error && visibleOrders.length > 0 && (
          <div className="flex justify-between items-center px-4 sm:px-6 py-3 border-border border-t text-sm">
            <span className="text-text-secondary">
              {visibleOrders.length === stats.count
                ? `${stats.count} venta${stats.count === 1 ? "" : "s"} · ${stats.units} producto${stats.units === 1 ? "" : "s"}`
                : `${visibleOrders.length} de ${stats.count} ventas`}
            </span>
            <span className="font-bold text-brand">
              {money(
                visibleOrders.reduce((sum, o) => sum + o.total, 0),
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function SellerOrderCard({
  order,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  isDeleting,
}: {
  order: SellerOrder;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const finalized = isFinalized(order);
  const units = order.items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  const combos = order.promos_sold ?? [];

  // The same product can appear twice — bought loose and again unrolled from a
  // combo. Collapse to one line per product so the detail reads cleanly.
  const lines = useMemo(() => {
    const byId = new Map<string, { name: string; brand: string; quantity: number }>();
    for (const it of order.items) {
      const key = it.id || it.name;
      const existing = byId.get(key);
      if (existing) existing.quantity += it.quantity || 0;
      else
        byId.set(key, {
          name: it.name,
          brand: it.brand,
          quantity: it.quantity || 0,
        });
    }
    return Array.from(byId.entries());
  }, [order.items]);

  return (
    <li
      className={`rounded-lg border transition-colors ${
        finalized ? "border-green-200 bg-green-50" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 min-w-0 text-left"
          aria-expanded={expanded}
        >
          <ChevronDown
            size={16}
            className={`shrink-0 text-text-secondary transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
          <div className="min-w-0">
            <p className="font-semibold truncate">{order.buyer_details.name}</p>
            <p className="text-text-secondary text-xs">
              {timeLabel(order.created_at)} hs · {units} prod.
              {order.buyer_details.dni ? ` · DNI ${order.buyer_details.dni}` : ""}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-brand text-sm">
            {money(order.total)}
          </span>
          {finalized ? (
            <span
              className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full font-medium text-green-700 text-xs"
              title="Venta concretada"
            >
              <CheckCircle2 size={14} />
              <span className="hidden sm:inline">Concretada</span>
            </span>
          ) : (
            <div className="flex items-center gap-0.5">
              <button
                onClick={onEdit}
                disabled={isDeleting}
                className="hover:bg-blue-50 disabled:opacity-50 p-2 rounded-full text-gray-400 hover:text-blue-600"
                aria-label="Editar pedido"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="hover:bg-red-50 disabled:opacity-50 p-2 rounded-full text-gray-400 hover:text-red-600"
                aria-label="Eliminar pedido"
              >
                {isDeleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-border/70 border-t">
          {combos.length > 0 && (
            <ul className="flex flex-wrap gap-1 pt-2">
              {combos.map((c) => (
                <li
                  key={c.id}
                  className="bg-brand/10 px-2 py-0.5 rounded-full text-brand text-xs"
                >
                  {c.quantity}× {c.title}
                </li>
              ))}
            </ul>
          )}
          <ul className="flex flex-col gap-1 pt-2 text-sm">
            {lines.map(([key, line]) => (
              <li key={key} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  {line.brand ? (
                    <span className="text-text-secondary">{line.brand} </span>
                  ) : null}
                  {line.name}
                </span>
                <span className="shrink-0 text-text-secondary">
                  ×{line.quantity}
                </span>
              </li>
            ))}
          </ul>
          {order.discounted_amount > 0 && (
            <p className="mt-2 text-text-secondary text-xs">
              Descuento aplicado: {money(order.discounted_amount)}
            </p>
          )}
          {order.buyer_details.phone && (
            <p className="mt-1 text-text-secondary text-xs">
              Tel: {order.buyer_details.phone}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
