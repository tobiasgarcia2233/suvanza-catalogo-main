"use client";

import { useState } from "react";
import { AlertTriangle, Check, CheckCircle2, Info, Loader2, Lock, RefreshCw, X, XCircle } from "lucide-react";
import { usePauseRefresh } from "@/store/refreshGuardStore";
import { CUSTOMER_REVIEW_MESSAGE, type BuyerData, type CustomerComparison, type PartnerUpdateField } from "@/lib/customerReview";
import type { ExportProgress } from "@/lib/odooExport";
import { displayExportError, EXPORT_MIGRATION_MESSAGE, canRecoverPricingOnRetry, exportErrorDetail, canRecompareCustomer, canResolveManually } from "@/lib/odooExportStatus";
import { useOdooExport } from "./useOdooExport";
import { OdooPartnerLink } from "./OdooPartnerLink";

type Tone = "info" | "success" | "warning" | "error";

const TONES: Record<Tone, { box: string; icon: typeof Info }> = {
  info: { box: "border-sky-200 bg-sky-50 text-sky-900", icon: Info },
  success: { box: "border-green-200 bg-green-50 text-green-900", icon: CheckCircle2 },
  warning: { box: "border-orange-200 bg-orange-50 text-orange-900", icon: AlertTriangle },
  error: { box: "border-red-200 bg-red-50 text-red-900", icon: XCircle },
};

/** What happened and what to do next, in plain words. */
function exportSummary(progress: ExportProgress | null): { tone: Tone; title: string; text: string } {
  if (!progress) {
    return { tone: "info", title: "Sin envío automático", text: "Este pedido se gestiona a mano en Odoo." };
  }
  if (canRecoverPricingOnRetry(progress)) {
    return { tone: "info", title: "Listo para reintentar", text: "Los precios originales se pueden recuperar. Reintentá el envío." };
  }
  switch (progress.status) {
    case "pending":
      return { tone: "info", title: "Listo para enviar", text: "El pago está confirmado. Falta enviar el pedido a Odoo." };
    case "processing":
      return { tone: "info", title: "Enviando a Odoo…", text: "Actualizá el estado en unos segundos." };
    case "exported":
      return { tone: "success", title: "Enviado a Odoo", text: "El presupuesto se creó en Odoo." };
    case "legacy_sent":
      return { tone: "success", title: "Registrado en Odoo", text: "Este pedido se cargó en Odoo antes del envío automático. No se vuelve a enviar." };
    case "manual_resolved":
      return { tone: "success", title: "Resuelto manualmente", text: "Se marcó como resuelto a mano en Odoo. No se vuelve a enviar." };
    case "customer_review":
      return { tone: "warning", title: "Los datos del cliente no coinciden", text: "Ya existe en Odoo un cliente con este DNI, pero algunos datos son distintos. Elegí con qué dato quedarte en cada fila." };
    case "customer_selection":
      return { tone: "warning", title: "Hay varios clientes posibles", text: "Más de un cliente de Odoo coincide con este DNI. Elegí cuál usar." };
    case "review":
      return { tone: "warning", title: "Hay que verificar en Odoo", text: "No se sabe si el presupuesto llegó a crearse. Verificalo antes de seguir, así no se duplica." };
    case "pricing_review":
      return { tone: "warning", title: "Revisar precios originales", text: "" };
    case "error":
      return { tone: "error", title: "No se pudo enviar a Odoo", text: "Revisá el motivo, corregilo y reintentá." };
    default:
      return { tone: "info", title: progress.status, text: "" };
  }
}

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";
const linkButton = "text-sm text-gray-600 underline underline-offset-2 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50";

export default function OdooModal({
  open,
  onClose,
  orderId,
  buyerName,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  buyerName: string;
  /** Called after any action that changed the export, to refresh the card. */
  onChanged: () => void;
}) {
  usePauseRefresh(open);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 p-1 text-gray-400 hover:text-gray-700"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
        <h2 className="text-lg font-bold">Odoo</h2>
        <p className="mb-4 text-sm text-gray-500">
          Comprador: <span className="font-medium">{buyerName}</span>
        </p>
        {/* Mounted only while open: every opening reads the export fresh. */}
        <OdooPanel orderId={orderId} onChanged={onChanged} />
      </div>
    </div>
  );
}

type Keep = "order" | "odoo";

function OdooPanel({ orderId, onChanged }: { orderId: string; onChanged: () => void }) {
  const { progress, busy, error, readError, reading, send: post, reload, action, blocked, canCorrect } = useOdooExport(orderId);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<BuyerData>({ name: "", dni: "", phone: "" });
  const [formRevision, setFormRevision] = useState(0);
  const [confirmingManual, setConfirmingManual] = useState(false);

  async function send(body: Record<string, unknown> = {}) {
    const result = await post(body);
    if (!result) return;
    onChanged();
    if (body.action === "resolve_manually") setConfirmingManual(false);
    if (body.action === "correct" && result.next?.customer_revision !== formRevision) setEditing(false);
    return result;
  }
  function startCorrection() {
    setForm(progress?.customer_buyer ?? { name: "", dni: "", phone: "" });
    setFormRevision(progress?.customer_revision ?? 0);
    setEditing(true);
  }

  if (reading && !progress && !readError) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-gray-500">
        <Loader2 size={16} className="animate-spin" /> Consultando estado en Odoo…
      </p>
    );
  }

  if (editing && canCorrect) {
    return (
      <form
        className="space-y-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          void send({ action: "correct", revision: formRevision, buyer: form, preserveResolvedContact: true });
        }}
      >
        <p className="font-semibold">Corregir datos del pedido</p>
        <p className="text-gray-600">
          Cambia los datos del comprador en este pedido y vuelve a buscar el cliente en Odoo; si no existe, se crea uno
          nuevo. El pago, los importes y el contacto actual de Odoo no se tocan.
        </p>
        {(["name", "dni", "phone"] as const).map((key) => (
          <label className="block" key={key}>
            <span className="mb-1 block font-medium text-gray-700">
              {key === "name" ? "Nombre y apellido" : key === "dni" ? "DNI" : "Teléfono"}
            </span>
            <input
              required
              inputMode={key === "dni" ? "numeric" : key === "phone" ? "tel" : "text"}
              maxLength={key === "name" ? 200 : 80}
              className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-gray-900"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}
        {error && <p className="text-red-700">{displayExportError(error)}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4">
          <button type="button" className={secondaryButton} disabled={busy} onClick={() => setEditing(false)}>
            Cancelar
          </button>
          <button type="submit" className={primaryButton} disabled={blocked}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            Guardar y volver a buscar
          </button>
        </div>
      </form>
    );
  }

  const review = progress?.status === "customer_review" && !progress.quotation_id ? progress.customer_review : undefined;
  const candidates = progress?.status === "customer_selection" ? progress.candidates ?? [] : [];
  const { tone, title, text } = exportSummary(progress);
  const { box, icon: Icon } = TONES[tone];
  // One place for every message: the failed action first, then the stored reason.
  const storedDetail = exportErrorDetail(progress);
  const reason = displayExportError(
    error || (storedDetail.startsWith(CUSTOMER_REVIEW_MESSAGE) ? storedDetail.slice(CUSTOMER_REVIEW_MESSAGE.length).trim() : storedDetail),
  );
  const creating = !!progress?.phase?.endsWith("creating");

  return (
    <div className="space-y-4 text-sm" aria-live="polite">
      {/* 1. Qué pasó */}
      <div className={`flex gap-3 rounded-lg border p-4 ${readError ? TONES.error.box : box}`}>
        {readError ? <XCircle size={20} className="mt-0.5 shrink-0" /> : <Icon size={20} className="mt-0.5 shrink-0" />}
        <div className="space-y-1">
          <p className="font-semibold">{readError ? "No se pudo consultar el estado" : title}</p>
          {readError ? <p>{readError}</p> : text && <p>{text}</p>}
          {reason && <p className="whitespace-pre-wrap font-medium">{reason}</p>}
          {progress?.quotation_id && progress.status !== "exported" && (
            <p>El presupuesto que ya existe se revisa directamente en Odoo; desde acá no se reasigna.</p>
          )}
          {progress?.migration_required && <p className="font-medium">{EXPORT_MIGRATION_MESSAGE}</p>}
        </div>
      </div>

      {/* 2-3. Qué hacer + acción principal */}
      {review && (
        <CustomerDecision
          key={review.token}
          review={review}
          disabled={blocked || creating}
          busy={busy}
          canCorrect={canCorrect}
          onCorrect={startCorrection}
          onApply={send}
        />
      )}

      {candidates.length > 0 && (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {candidates.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 p-3">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-gray-500">
                  {c.phone || "Sin teléfono"} · <OdooPartnerLink id={c.id} />
                  {!c.active && " · archivado"}
                </p>
              </div>
              <button className={primaryButton} disabled={blocked || !c.active} onClick={() => send({ partnerId: c.id })}>
                Usar este cliente
              </button>
            </li>
          ))}
        </ul>
      )}

      {action && (
        <button className={`${primaryButton} w-full sm:w-auto`} disabled={blocked} onClick={() => send()}>
          {busy && <Loader2 size={14} className="animate-spin" />}
          {action === "reconcile" ? "Verificar en Odoo" : progress?.status === "pending" ? "Enviar a Odoo" : "Reintentar envío"}
        </button>
      )}

      {/* Secondary ways out, deliberately quieter than the main action. */}
      {confirmingManual && canResolveManually(progress) && (
        <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-orange-900">
          <p className="font-semibold">¿Marcar como resuelto manualmente?</p>
          <p>
            Usalo solo si el pedido ya se cargó a mano en Odoo. Desde el catálogo no se va a volver a enviar ni se crea
            nada en Odoo. El motivo actual queda guardado en el registro.
          </p>
          {progress?.status === "review" && (
            <p className="font-medium">
              Puede que el presupuesto ya exista en Odoo. Verificalo antes de cargarlo a mano, así no se duplica.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button className={secondaryButton} disabled={busy} onClick={() => setConfirmingManual(false)}>
              Cancelar
            </button>
            <button className={primaryButton} disabled={blocked} onClick={() => void send({ action: "resolve_manually" })}>
              {busy && <Loader2 size={14} className="animate-spin" />}
              Marcar como resuelto
            </button>
          </div>
        </div>
      )}

      {(canCorrect || review || canRecompareCustomer(progress) || canResolveManually(progress)) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {canCorrect && !review && (
            <button className={linkButton} disabled={blocked} onClick={startCorrection}>
              Corregir datos del pedido
            </button>
          )}
          {canRecompareCustomer(progress) && (
            <button className={linkButton} disabled={blocked} onClick={() => void send()}>
              Volver a comparar con Odoo
            </button>
          )}
          {review && (
            <button className={linkButton} disabled={blocked} onClick={() => send({ action: "defer", revision: review.revision })}>
              Resolver más tarde
            </button>
          )}
          {canResolveManually(progress) && !confirmingManual && (
            <button className={linkButton} disabled={blocked} onClick={() => setConfirmingManual(true)}>
              Resolver manualmente
            </button>
          )}
        </div>
      )}

      {/* 4. Detalles técnicos */}
      {progress && (
        <details className="rounded-lg bg-gray-50 p-3">
          <summary className="cursor-pointer select-none text-gray-600">Detalles técnicos</summary>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <dt className="text-gray-500">Estado interno</dt>
            <dd>{progress.status}{progress.phase && progress.phase !== "ready" ? ` · ${progress.phase}` : ""}</dd>
            <dt className="text-gray-500">Presupuesto</dt>
            <dd>
              {progress.quotation_ref ?? "—"}
              {progress.quotation_id && <span className="text-gray-500"> · ID {progress.quotation_id}</span>}
            </dd>
            <dt className="text-gray-500">Cliente en Odoo</dt>
            <dd>{progress.partner_id ? <OdooPartnerLink id={progress.partner_id} /> : "—"}</dd>
            {progress.customer_buyer && (
              <>
                <dt className="text-gray-500">Datos del pedido</dt>
                <dd>
                  {progress.customer_buyer.name} · DNI {progress.customer_buyer.dni} · {progress.customer_buyer.phone}
                </dd>
              </>
            )}
            {progress.original_buyer && progress.customer_buyer && sameBuyer(progress.original_buyer, progress.customer_buyer) === false && (
              <>
                <dt className="text-gray-500">Datos originales</dt>
                <dd>
                  {progress.original_buyer.name} · DNI {progress.original_buyer.dni} · {progress.original_buyer.phone}
                </dd>
              </>
            )}
            {!!progress.created_customers?.length && (
              <>
                <dt className="text-gray-500">Contactos creados</dt>
                <dd className="flex flex-wrap gap-x-2">
                  {progress.created_customers.map((c) => (
                    <OdooPartnerLink key={c.id} id={c.id} />
                  ))}
                </dd>
              </>
            )}
          </dl>
        </details>
      )}

      <div className="flex justify-end">
        <button className={linkButton} disabled={busy || reading} onClick={reload}>
          <span className="inline-flex items-center gap-1">
            <RefreshCw size={12} className={reading ? "animate-spin" : ""} />
            {reading ? "Consultando…" : "Actualizar estado"}
          </span>
        </button>
      </div>
    </div>
  );
}

const sameBuyer = (a: BuyerData, b: BuyerData) => a.name === b.name && a.dni === b.dni && a.phone === b.phone;

/**
 * The customer review as one decision per row: keep the order's value or
 * Odoo's. The choices map onto the existing actions: everything from Odoo is
 * an approval; any value from the order is written onto the contact first.
 */
function CustomerDecision({
  review,
  disabled,
  busy,
  canCorrect,
  onCorrect,
  onApply,
}: {
  review: CustomerComparison;
  disabled: boolean;
  busy: boolean;
  canCorrect: boolean;
  onCorrect: () => void;
  onApply: (body: Record<string, unknown>) => void;
}) {
  const fields = (["name", "phone"] as const).filter((f) => review.differences[f]);
  // An empty phone in Odoo is new information, not a conflict.
  const [choice, setChoice] = useState<Partial<Record<PartnerUpdateField, Keep>>>(() =>
    review.differences.phone && !review.remote.phone.trim() ? { phone: "order" } : {},
  );
  const locked = !review.canApprove;
  const fromOrder = fields.filter((f) => choice[f] === "order");
  const allChosen = fields.every((f) => choice[f]);
  const label = (f: PartnerUpdateField) => (f === "name" ? "nombre" : "teléfono");

  const outcome = !allChosen
    ? "Elegí un dato en cada fila resaltada."
    : fromOrder.length
      ? `Se actualizará ${fromOrder.map(label).join(" y ")} en Odoo y se enviará el pedido.`
      : "Se usará el cliente de Odoo tal como está y se enviará el pedido.";

  function apply() {
    if (!fromOrder.length) {
      onApply({ action: "approve", revision: review.revision, partnerId: review.remote.id, token: review.token });
    } else {
      onApply({
        action: "update_partner",
        revision: review.revision,
        partnerId: review.remote.id,
        token: review.token,
        fields: fromOrder,
        approveRest: fromOrder.length < fields.length,
      });
    }
  }

  const option = (f: PartnerUpdateField, keep: Keep, value: string) => {
    const selected = choice[f] === keep;
    return (
      <label
        className={`flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 ${
          selected ? "border-gray-900 bg-white ring-1 ring-gray-900" : "border-transparent hover:border-gray-300"
        }`}
      >
        <input
          type="radio"
          className="mt-0.5"
          name={`keep-${f}`}
          checked={selected}
          disabled={disabled}
          onChange={() => setChoice({ ...choice, [f]: keep })}
        />
        <span className={value ? "" : "text-gray-400"}>{value || `Sin ${label(f)}`}</span>
      </label>
    );
  };

  const row = (f: PartnerUpdateField) => {
    const differs = review.differences[f];
    return (
      <tr key={f} className={differs && !locked ? "bg-amber-50" : ""}>
        <th className="p-2 align-top font-medium">{f === "name" ? "Nombre" : "Teléfono"}</th>
        {differs && !locked ? (
          <>
            <td className="p-1 align-top">{option(f, "order", review.local[f])}</td>
            <td className="p-1 align-top">{option(f, "odoo", review.remote[f])}</td>
          </>
        ) : (
          <>
            <td className="p-2 align-top">{review.local[f] || "—"}</td>
            <td className="p-2 align-top">
              {review.remote[f] || "—"}
              {!differs && <Check size={14} className="ml-1 inline text-green-600" aria-label="Coincide" />}
            </td>
          </>
        )}
      </tr>
    );
  };

  return (
    <section aria-label="Revisión del cliente" className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-left">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="p-2">Dato</th>
              <th className="p-2">Pedido</th>
              <th className="p-2">
                Odoo · <OdooPartnerLink id={review.remote.id} className="normal-case" />
                {!review.remote.active && " · archivado"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {row("name")}
            <tr className={review.differences.document ? "bg-red-50" : ""}>
              <th className="p-2 align-top font-medium">Documento</th>
              <td className="p-2 align-top">{review.localDocumentType} · {review.local.dni || "Sin número"}</td>
              <td className="p-2 align-top">
                {review.remote.documentType || "Sin tipo"} · {review.remote.dni || "Sin número"}
                {review.differences.document ? (
                  <Lock size={13} className="ml-1 inline text-red-600" aria-label="No coincide" />
                ) : (
                  <Check size={14} className="ml-1 inline text-green-600" aria-label="Coincide" />
                )}
              </td>
            </tr>
            {row("phone")}
          </tbody>
        </table>
      </div>

      {locked ? (
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-900">
          <p>
            {review.differences.document
              ? "El documento no coincide, así que no se puede usar este cliente de Odoo."
              : "Este cliente está archivado en Odoo, así que no se puede usar."}{" "}
            Revisá los datos del pedido: al corregirlos se vuelve a buscar el cliente.
          </p>
          <button className={primaryButton} disabled={disabled || !canCorrect} onClick={onCorrect}>
            Corregir datos del pedido
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className={allChosen ? "text-gray-700" : "text-gray-500"}>{outcome}</p>
          <button className={primaryButton} disabled={disabled || !allChosen} onClick={apply}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            Aplicar y enviar
          </button>
        </div>
      )}

      {!locked && canCorrect && (
        <p className="text-gray-500">
          ¿Ninguno de los dos es correcto?{" "}
          <button className={linkButton} disabled={disabled} onClick={onCorrect}>
            Corregir datos del pedido
          </button>
        </p>
      )}
    </section>
  );
}
