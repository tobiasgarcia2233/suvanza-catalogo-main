"use client";
import { OdooExportStatus } from "@/components/OdooExportStatus";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Order } from "@/types";
import type { EventOption } from "@/lib/eventQueries";
import { EventFilterSelect } from "@/components/EventFilterSelect";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  Printer,
  Send,
  StickyNote,
  TriangleAlert,
} from "lucide-react";

export default function OdooPageClient({
  orders,
  includeTransferred,
  startDate,
  endDate,
  event,
  events,
}: {
  orders: Order[];
  includeTransferred: boolean;
  startDate: string;
  endDate: string;
  /** "" | "individual" | event id */
  event: string;
  events: EventOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);

  const [retryAllowed,setRetryAllowed] = useState<Record<string,boolean>>({});
  const onRetryAllowed = useCallback((id:string,allowed:boolean)=>{
    setRetryAllowed(previous=>previous[id] === allowed ? previous : {...previous,[id]:allowed});
  },[]);
  const selectableIds = useMemo(
    () => orders.filter((o) => retryAllowed[o.id]).map((o) => o.id),
    [orders,retryAllowed],
  );
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      if (selectableIds.every((id) => prev.has(id))) return new Set();
      return new Set(selectableIds);
    });
  }

  const eventNames = useMemo(() => new Map(events.map((e) => [e.id, e.name])), [events]);

  function pushFilters(
    next: { includeTransferred?: boolean; event?: string } = {},
  ) {
    const params = new URLSearchParams();
    if (next.includeTransferred ?? includeTransferred) {
      params.set("includeTransferred", "1");
    }
    const nextEvent = next.event ?? event;
    if (nextEvent) params.set("event", nextEvent);
    if (localStart) params.set("startDate", localStart);
    if (localEnd) params.set("endDate", localEnd);
    const qs = params.toString();
    startTransition(() => router.push(`/odoo${qs ? `?${qs}` : ""}`));
  }

  async function bulkMark(transferred: boolean) {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/orders/bulk-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selected).filter(id=>selectableIds.includes(id)),
          transferred,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo exportar.");
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo exportar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto p-8 max-w-6xl">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft size={14} /> Volver al dashboard de pedidos
          </Link>
          <h1 className="font-bold text-3xl mt-1">Pasar a Odoo</h1>
          <p className="text-sm text-gray-500">
            Ventas cobradas: revisá sus presupuestos, clientes pendientes y errores de exportación.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <EventFilterSelect
            events={events}
            value={event}
            onChange={(v) => {
              setSelected(new Set());
              pushFilters({ event: v });
            }}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeTransferred}
              onChange={(e) => pushFilters({ includeTransferred: e.target.checked })}
            />
            Mostrar ya pasadas
          </label>
          <input
            type="date"
            value={localStart}
            onChange={(e) => setLocalStart(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <span className="text-sm text-gray-500">a</span>
          <input
            type="date"
            value={localEnd}
            onChange={(e) => setLocalEnd(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <button
            onClick={() => pushFilters()}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white"
          >
            Filtrar
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-lg px-4 py-3 mb-4 shadow-sm">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={selectableIds.length === 0}
          />
          <span className="font-semibold">
            {selected.size > 0
              ? `${selected.size} seleccionada${selected.size === 1 ? "" : "s"}`
              : allSelected
              ? "Todas seleccionadas"
              : `Seleccionar todas (${selectableIds.length})`}
          </span>
        </label>

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <button
                onClick={() => bulkMark(true)}
                disabled={busy || isPending || Array.from(selected).some(id=>!selectableIds.includes(id))}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Reintentar exportaciones pendientes
              </button>

            </>
          )}
        </div>
      </div>

      {/* List */}
      {orders.length === 0 ? (
        <div className="flex justify-center items-center bg-white border-2 border-dashed border-gray-200 rounded-lg h-48">
          <p className="text-gray-500">
            {includeTransferred
              ? "No hay pedidos en el rango seleccionado."
              : "No hay ventas cobradas pendientes de pasar a Odoo."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              selected={selected.has(order.id)}
              retryAllowed={!!retryAllowed[order.id]}
              onRetryAllowed={onRetryAllowed}
              onToggle={() => toggle(order.id)}
              eventName={
                order.event_id
                  ? eventNames.get(order.event_id) ?? "Evento eliminado"
                  : "Venta individual"
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  selected,
  onToggle,
  eventName,
  retryAllowed,
  onRetryAllowed,
}: {
  order: Order;
  selected: boolean;
  onToggle: () => void;
  eventName: string;
  retryAllowed: boolean;
  onRetryAllowed: (id:string,allowed:boolean)=>void;
}) {
  // The page only lists paid orders (see fetchOrdersForOdoo).
  const isTransferred = order.status === "ODOO_SENT" || order.odoo_export_status === "exported";
  const hasOdooError = order.status === "ODOO_ERROR";
  const created = new Date(order.created_at);
  const dateStr = created.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = created.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`rounded-lg border p-4 flex gap-4 transition ${
        isTransferred
          ? "bg-blue-50/40 border-blue-100"
          : "bg-white border-gray-200 hover:shadow-sm"
      }`}
    >
      <div className="pt-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          disabled={!retryAllowed}
          className="h-4 w-4"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-bold text-base">{order.buyer_details.name}</p>
            <p className="text-sm text-gray-600">
              DNI: {order.buyer_details.dni} · Tel: {order.buyer_details.phone}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Atendió: <span className="font-medium">{order.seller_name}</span> ·{" "}
              {eventName} ·{" "}
              {dateStr} {timeStr} hs
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-xl">
              ${order.total.toLocaleString("es-AR")}
            </p>
            {order.discounted_amount > 0 && (
              <p className="text-xs text-gray-500">
                Dto: ${order.discounted_amount.toLocaleString("es-AR")}
              </p>
            )}
            <div className="mt-1 flex items-center gap-1 justify-end">
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
                Pagada
              </span>
              {isTransferred && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">
                  <Send size={9} /> En Odoo
                </span>
              )}
              {hasOdooError && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800">
                  <TriangleAlert size={9} /> Error Odoo
                </span>
              )}
            </div>
          </div>
        </div>

        <OdooExportStatus onRetryAllowed={onRetryAllowed} orderId={order.id} buyerName={order.buyer_details.name} legacySent={order.status === "ODOO_SENT" || !!order.odoo_sent_at} />

        {hasOdooError && order.odoo_error && (
          <div className="mb-3 flex items-start gap-2 rounded-md bg-red-50 border border-red-100 px-3 py-1.5 text-sm text-red-900">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{order.odoo_error}</span>
          </div>
        )}

        {((order.payments && order.payments.length > 0) || order.notes) && (
          <div className="mb-3 flex flex-col gap-2">
            {order.payments && order.payments.length > 0 && (
              <div className="flex items-start gap-2 rounded-md bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-sm text-indigo-900">
                <CreditCard size={14} className="mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] uppercase tracking-wide text-indigo-700 mr-1">
                    Pago:
                  </span>
                  {order.payments.map((p, i) => (
                    <span key={i}>
                      {i > 0 && " · "}
                      <span className="font-medium">{p.method}</span>{" "}
                      <span className="text-indigo-700">
                        (${p.amount.toLocaleString("es-AR")})
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {order.notes && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-100 px-3 py-1.5 text-sm text-amber-900">
                <StickyNote size={14} className="mt-0.5 shrink-0" />
                <span className="whitespace-pre-wrap">
                  <span className="text-[11px] uppercase tracking-wide text-amber-700 mr-1">
                    Nota:
                  </span>
                  {order.notes}
                </span>
              </div>
            )}
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <th className="text-left py-1">Producto</th>
              <th className="text-right py-1 w-16">Cant.</th>
              <th className="text-right py-1 w-28">P. unit.</th>
              <th className="text-right py-1 w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, i) => {
              const total = it.finalPrice ?? 0;
              const unit = it.quantity > 0 ? total / it.quantity : 0;
              return (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="py-1.5 pr-2">
                    {it.brand && (
                      <span className="text-gray-500">{it.brand} — </span>
                    )}
                    {it.name}
                  </td>
                  <td className="py-1.5 text-right">{it.quantity}</td>
                  <td className="py-1.5 text-right">
                    ${unit.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-1.5 text-right font-medium">
                    ${total.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-3 flex items-center gap-2">
          <a
            href={`/orders/${order.id}/print`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
          >
            <Printer size={12} /> Vista imprimible
          </a>
        </div>
      </div>
    </div>
  );
}
