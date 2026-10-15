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

/** A missing/unreadable status never authorizes creation. */
export function exportAction(progress: ExportProgress | null, readFailed = false) {
  if (!progress || readFailed || progress.migration_required || ['exported', 'legacy_sent', 'processing'].includes(progress.status)) return null;
  if (progress.quotation_id || progress.phase?.endsWith('creating') || progress.status === 'review') return 'reconcile';
  if (progress.status === 'pending' || progress.status === 'error') return 'retry';
  return null;
}

export async function parseExportResponse(response: Response): Promise<ExportProgress | null> {
  if (response.status === 401) throw new Error('Sesión vencida. Volvé a iniciar sesión para consultar el estado.');
  const data = await response.json().catch(() => { throw new Error('Respuesta de estado inválida.'); });
  if (!response.ok) throw new Error(data.message || 'No se pudo consultar la exportación.');
  if (!Object.hasOwn(data, 'export') || (data.export !== null && (typeof data.export !== 'object' || typeof data.export.status !== 'string'))) throw new Error('Respuesta de estado inválida.');
  return data.export;
}
