"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw, X, XCircle } from "lucide-react";
import { usePauseRefresh } from "@/store/refreshGuardStore";
import { CUSTOMER_REVIEW_MESSAGE, type BuyerData } from "@/lib/customerReview";
import type { ExportProgress } from "@/lib/odooExport";
import { displayExportError, EXPORT_MIGRATION_MESSAGE } from "@/lib/odooExportStatus";
import { useOdooExport } from "./useOdooExport";

type Tone = "info" | "success" | "warning" | "error";

const TONES: Record<Tone, { box: string; icon: typeof Info }> = {
  info: { box: "border-sky-200 bg-sky-50 text-sky-900", icon: Info },
  success: { box: "border-green-200 bg-green-50 text-green-900", icon: CheckCircle2 },
  warning: { box: "border-orange-200 bg-orange-50 text-orange-900", icon: AlertTriangle },
  error: { box: "border-red-200 bg-red-50 text-red-900", icon: XCircle },
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente de envío",
  processing: "Enviando",
  error: "Error",
  review: "Requiere conciliación",
  customer_review: "Revisar datos del cliente",
  customer_selection: "Elegir cliente",
  exported: "Enviado",
  legacy_sent: "Registrado previamente",
};

/** What happened and what to do next, in plain words. */
function guide(progress: ExportProgress | null): { tone: Tone; title: string; text: string } {
  if (!progress) {
    return { tone: "info", title: "Sin exportación automática", text: "Este pedido no tiene registro en la cola de exportación a Odoo, así que se gestiona de forma manual." };
  }
  switch (progress.status) {
    case "pending":
      return { tone: "info", title: "Pendiente de envío", text: "El pago está confirmado y el pedido todavía no se envió a Odoo." };
    case "processing":
      return { tone: "info", title: "Enviando a Odoo", text: "La exportación está en curso. Actualizá el estado en unos segundos." };
    case "exported":
      return { tone: "success", title: "Enviado a Odoo", text: "El presupuesto se creó correctamente en Odoo." };
    case "legacy_sent":
      return { tone: "success", title: "Registrado previamente en Odoo", text: "Este pedido se cargó en Odoo antes de la exportación automática. No se vuelve a enviar." };
    case "customer_review":
      return { tone: "warning", title: "Revisar datos del cliente", text: "Ya existe en Odoo un cliente con este documento, pero sus datos no coinciden con los del pedido. Compará los datos y elegí cómo seguir." };
    case "customer_selection":
      return { tone: "warning", title: "Elegir cliente", text: "Hay más de un cliente en Odoo que coincide con este pedido. Elegí cuál usar para el presupuesto." };
    case "review":
      return { tone: "warning", title: "Conciliar con Odoo", text: "No se pudo confirmar si el presupuesto llegó a crearse en Odoo. Conciliá para verificarlo sin generar un duplicado." };
    case "error":
      return { tone: "error", title: "Error al enviar a Odoo", text: "La exportación falló. Revisá el detalle, corregí lo necesario y reintentá." };
    default:
      return { tone: "info", title: progress.status, text: "" };
  }
}

const primaryButton =
  "inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

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
        <OdooPanel orderId={orderId} onChanged={onChanged} onClose={onClose} />
      </div>
    </div>
  );
}

function OdooPanel({ orderId, onChanged, onClose }: { orderId: string; onChanged: () => void; onClose: () => void }) {
  const { progress, busy, error, readError, reading, send: post, reload, action, blocked, canCorrect } = useOdooExport(orderId);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<BuyerData>({ name: "", dni: "", phone: "" });
  const [formRevision, setFormRevision] = useState(0);
  const [recompared, setRecompared] = useState(false);

  async function send(body: Record<string, unknown> = {}) {
    setRecompared(false);
    const result = await post(body);
    if (!result) return;
    onChanged();
    if (body.action === "correct" && result.next?.customer_revision !== formRevision) setEditing(false);
    return result;
  }
  /** Plain retry: compares again with the current rules and, if nothing differs, sends. */
  async function recompare() {
    if (await send()) setRecompared(true);
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

  const review = progress?.status === "customer_review" && !progress.quotation_id ? progress.customer_review : undefined;
  const candidates = progress?.status === "customer_selection" ? progress.candidates ?? [] : [];
  const detail = error || (progress?.error && progress.error !== CUSTOMER_REVIEW_MESSAGE ? progress.error : "");
  const staleComparison = !!progress?.error && !progress.error.startsWith(CUSTOMER_REVIEW_MESSAGE);
  const { tone, title, text } = guide(progress);
  const { box, icon: Icon } = TONES[tone];
  const buyer = progress?.customer_buyer;
  const original = progress?.original_buyer;
  const buyerChanged =
    !!buyer && !!original && (buyer.name !== original.name || buyer.dni !== original.dni || buyer.phone !== original.phone);
  const different = "bg-amber-100 font-semibold";

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
          Se conservan los datos originales, el pago y los importes. El contacto existente en Odoo no se modifica. Se
          repetirá la búsqueda del cliente; si no existe, se podrá crear uno nuevo.
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
        {!!progress?.created_customers?.length && (
          <p className="text-gray-600">
            Contactos creados previamente y conservados: {progress.created_customers.map((c) => `ID ${c.id}`).join(", ")}.
          </p>
        )}
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

  return (
    <div className="space-y-4 text-sm" aria-live="polite">
      {readError ? (
        <div className={`flex gap-3 rounded-lg border p-4 ${TONES.error.box}`}>
          <XCircle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{error ? "La acción no se completó" : "No se pudo consultar el estado"}</p>
            {error && <p className="font-medium">{displayExportError(error)}</p>}
            <p>{readError}</p>
          </div>
        </div>
      ) : (
        <div className={`flex gap-3 rounded-lg border p-4 ${box}`}>
          <Icon size={20} className="mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">{title}</p>
            {text && <p>{text}</p>}
            {detail && <p className="whitespace-pre-wrap font-medium">{displayExportError(detail)}</p>}
            {progress?.quotation_id && progress.status !== "exported" && (
              <p>El presupuesto existente necesita revisión separada en Odoo; no se reasignará desde este pedido.</p>
            )}
          </div>
        </div>
      )}

      {progress?.migration_required && <p className="text-amber-900">{EXPORT_MIGRATION_MESSAGE}</p>}

      {review && (
        <section aria-label="Revisión del cliente" className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full border-collapse text-left">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="p-2">Dato</th>
                <th className="p-2">En el pedido</th>
                <th className="p-2">
                  En Odoo (ID {review.remote.id}
                  {!review.remote.active && " · archivado"})
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className={review.differences.name ? different : ""}>
                <th className="p-2">Nombre</th>
                <td className="p-2">{review.local.name || "Sin nombre"}</td>
                <td className="p-2">{review.remote.name || "Sin nombre"}</td>
              </tr>
              <tr className={review.differences.document ? different : ""}>
                <th className="p-2">Documento</th>
                <td className="p-2">{review.localDocumentType} · {review.local.dni || "Sin número"}</td>
                <td className="p-2">{review.remote.documentType || "Sin tipo"} · {review.remote.dni || "Sin número"}</td>
              </tr>
              <tr className={review.differences.phone ? different : ""}>
                <th className="p-2">Teléfono</th>
                <td className="p-2">{review.local.phone || "Sin teléfono"}</td>
                <td className="p-2">{review.remote.phone || "Sin teléfono"}</td>
              </tr>
            </tbody>
          </table>
          <p className="border-t border-gray-200 p-2 text-xs text-gray-500">
            Las diferencias están resaltadas. Usar el cliente existente no modifica el contacto en Odoo y registra tu
            aprobación.
          </p>
        </section>
      )}

      {candidates.length > 0 && (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {candidates.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 p-3">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-gray-500">
                  {c.phone || "Sin teléfono"} · ID {c.id}
                  {!c.active && " · archivado"}
                </p>
              </div>
              <button className={secondaryButton} disabled={blocked || !c.active} onClick={() => send({ partnerId: c.id })}>
                Usar este cliente
              </button>
            </li>
          ))}
        </ul>
      )}

      {review && (
        <div className="space-y-2 rounded-lg border border-gray-200 p-3">
          <p className="text-gray-600">
            Si esta revisión quedó de antes, volvé a comparar con los datos actuales de Odoo. Si ya no hay diferencias,
            el pedido se envía a Odoo en el mismo paso.
          </p>
          <button
            className={primaryButton}
            disabled={blocked || !!progress?.phase?.endsWith("creating")}
            onClick={() => void recompare()}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Volver a comparar y enviar
          </button>
          {/* A fresh comparison always saves an error starting with CUSTOMER_REVIEW_MESSAGE.
              Any other error means the retry failed before comparing, so the
              comparison shown is the stored one, not a new result. */}
          {recompared && progress?.status === "customer_review" && staleComparison && (
            <p className="font-medium text-red-700">
              No se pudo volver a comparar: {displayExportError(progress.error)} La comparación de abajo es la anterior.
              Resolvé ese problema y volvé a intentar.
            </p>
          )}
          {recompared && progress?.status === "customer_review" && !staleComparison && (
            <p className="font-medium text-orange-800">
              Sigue habiendo diferencias en:{" "}
              {[
                review.differences.name && "nombre",
                review.differences.document && "documento",
                review.differences.phone && "teléfono",
                !review.remote.active && "cliente archivado en Odoo",
              ]
                .filter(Boolean)
                .join(", ")}
              . Elegí cómo resolverlas con las opciones de abajo.
            </p>
          )}
        </div>
      )}

      {(review || action || canCorrect) && (
        <div className="flex flex-wrap gap-2">
          {review && (
            <button
              className={primaryButton}
              disabled={blocked || !review.canApprove || !!progress?.phase?.endsWith("creating")}
              onClick={() => send({ action: "approve", revision: review.revision, partnerId: review.remote.id, token: review.token })}
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              Usar cliente existente
            </button>
          )}
          {action && (
            <button className={primaryButton} disabled={blocked} onClick={() => send()}>
              {busy && <Loader2 size={14} className="animate-spin" />}
              {action === "reconcile" ? "Conciliar con Odoo" : progress?.status === "pending" ? "Enviar a Odoo" : "Reintentar exportación"}
            </button>
          )}
          {canCorrect && (
            <button className={secondaryButton} disabled={blocked} onClick={startCorrection}>
              Corregir datos del pedido
            </button>
          )}
          {review && (
            <button className={secondaryButton} disabled={blocked} onClick={() => send({ action: "defer", revision: review.revision })}>
              Resolver más tarde
            </button>
          )}
        </div>
      )}

      {progress && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg bg-gray-50 p-4">
          <dt className="text-gray-500">Estado</dt>
          <dd>{STATUS_LABELS[progress.status] ?? progress.status}</dd>
          <dt className="text-gray-500">Presupuesto</dt>
          <dd>
            {progress.quotation_ref ?? "—"}
            {progress.quotation_id && <span className="text-gray-500"> · ID {progress.quotation_id}</span>}
          </dd>
          <dt className="text-gray-500">Cliente en Odoo</dt>
          <dd>{progress.partner_id ? `ID ${progress.partner_id}` : "—"}</dd>
          {buyer && (
            <>
              <dt className="text-gray-500">Datos del cliente</dt>
              <dd>
                {buyer.name} · DNI {buyer.dni} · {buyer.phone}
              </dd>
            </>
          )}
          {buyerChanged && (
            <>
              <dt className="text-gray-500">Datos originales</dt>
              <dd>
                {original.name} · DNI {original.dni} · {original.phone}
              </dd>
            </>
          )}
          {!!progress.created_customers?.length && (
            <>
              <dt className="text-gray-500">Contactos creados</dt>
              <dd>{progress.created_customers.map((c) => `ID ${c.id}`).join(", ")}</dd>
            </>
          )}
        </dl>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-4">
        <button className={secondaryButton} disabled={busy || reading} onClick={reload}>
          <RefreshCw size={14} className={reading ? "animate-spin" : ""} />
          {reading ? "Consultando…" : "Actualizar estado"}
        </button>
        <button className={secondaryButton} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
