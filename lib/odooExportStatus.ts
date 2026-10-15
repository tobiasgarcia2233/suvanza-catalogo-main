import type { ExportProgress } from './odooExport';

export const EXPORT_MIGRATION_MESSAGE = 'Falta aplicar la migración de revisión de clientes: npm run db:migrate:odoo-exports.';

export function missingOdooProductMessage(name: string) {
  return `Para exportar este pedido, primero vinculá el producto “${name}” con Odoo desde la edición del producto. Guardá los cambios y luego seleccioná “Reintentar exportación”.`;
}

/** Translate the old persisted message for display without modifying the outbox. */
export function displayExportError(message: string | null | undefined) {
  if (!message) return '';
  const legacy = /^Vinculá la variante ([\s\S]+) \([^()]+\) a product\.product\. La referencia del producto padre no sirve\. Guardá el vínculo y reintentá; solo se completan vínculos que estaban vacíos\.$/.exec(message);
  return legacy ? missingOdooProductMessage(legacy[1]) : message;
}

/** Only show price recovery after retry identified missing historical allocations. */
export function needsHistoricalPricingReview(progress: ExportProgress | null) {
  return !!progress && (progress.status === 'pricing_review' || (progress.status === 'error' && !!progress.error?.startsWith('La asignación promocional histórica requiere reparación revisada.'))) && !progress.pricing_repaired &&
    !progress.quotation_id && !progress.phase?.endsWith('creating');
}

/** Only reconstruct from complete purchase data or the owner's date-scoped confirmation. */
export function canRecoverPricingOnRetry(progress: ExportProgress | null) {
  return needsHistoricalPricingReview(progress) && (progress?.pricing_review?.kind === 'available' ||
    (progress?.pricing_review?.kind === 'missing_history' && progress.pricing_review.confirmedCatalogueEligible === true));
}

export function exportErrorDetail(progress: ExportProgress | null) {
  if (canRecoverPricingOnRetry(progress) && progress?.error === progress?.pricing_review?.message) return '';
  return progress?.error ?? '';
}

/** A missing/unreadable status never authorizes creation. */
export function exportAction(progress: ExportProgress | null, readFailed = false) {
  if (!progress || readFailed || progress.migration_required || ['exported', 'legacy_sent', 'processing'].includes(progress.status)) return null;
  if (progress.quotation_id || progress.phase?.endsWith('creating') || progress.status === 'review') return 'reconcile';
  if (needsHistoricalPricingReview(progress)) return canRecoverPricingOnRetry(progress) ? 'retry' : null;
  if (progress.status === 'pending' || progress.status === 'error') return 'retry';
  return null;
}

/** Customer comparison is a separate action; it must not enable bulk retry. */
export function canRecompareCustomer(progress: ExportProgress | null) {
  return !!progress && !progress.migration_required && progress.status === 'customer_review' &&
    !!progress.customer_review && !progress.quotation_id && !progress.phase?.endsWith('creating');
}

export async function parseExportResponse(response: Response): Promise<ExportProgress | null> {
  if (response.status === 401) throw new Error('Sesión vencida. Volvé a iniciar sesión para consultar el estado.');
  const data = await response.json().catch(() => { throw new Error('Respuesta de estado inválida.'); });
  if (!response.ok) throw new Error(data.message || 'No se pudo consultar la exportación.');
  if (!Object.hasOwn(data, 'export') || (data.export !== null && (typeof data.export !== 'object' || typeof data.export.status !== 'string'))) throw new Error('Respuesta de estado inválida.');
  return data.export;
}
