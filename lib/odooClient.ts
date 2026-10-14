import "server-only";

export class OdooError extends Error {
  constructor(message: string, public status = 503) {
    super(message);
  }
}

// Fixed integration scope: never accept a company from browser input.
export const ODOO_COMPANY_ID = 1;

export async function odooSearchRead(domain: unknown[], limit: number): Promise<unknown> {
  const base = process.env.ODOO_BASE_URL?.trim();
  const key = process.env.ODOO_API_KEY?.trim();
  if (!base || !key) {
    throw new OdooError("La conexión con Odoo no está configurada. Contactá al administrador.");
  }
  let url: URL;
  try {
    url = new URL(base);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
    url.pathname = `${url.pathname.replace(/\/$/, '')}/json/2/product.product/search_read`;
  } catch {
    throw new OdooError("La conexión con Odoo no está configurada correctamente. Contactá al administrador.");
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (process.env.ODOO_DATABASE?.trim()) headers["X-Odoo-Database"] = process.env.ODOO_DATABASE.trim();
  try {
    const response = await fetch(url, {
      method: "POST", headers, cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ domain, context: { allowed_company_ids: [ODOO_COMPANY_ID] }, fields: ["id", "name", "company_id"], limit, order: "name, id" }),
    });
    if (response.status === 401 || response.status === 403) {
      throw new OdooError("No se pudo acceder a los productos de Odoo. Pedile al administrador que revise las credenciales y permisos.");
    }
    if (!response.ok) throw new Error();
    return await response.json();
  } catch (error) {
    if (error instanceof OdooError) throw error;
    // Never expose or log upstream bodies, URLs, credentials or transport errors.
    throw new OdooError("No se pudo consultar Odoo. Intentá nuevamente antes de guardar un vínculo nuevo o diferente.");
  }
}

/** JSON-2 calls share the configured credentials and fixed company scope. */
export async function odooCall<T = unknown>(model: string, method: string, args: Record<string, unknown> = {}): Promise<T> {
  const base = process.env.ODOO_BASE_URL?.trim();
  const key = process.env.ODOO_API_KEY?.trim();
  if (!base || !key) throw new OdooError("La conexión con Odoo no está configurada.");
  let url: URL;
  try {
    url = new URL(base);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
    url.pathname = `${url.pathname.replace(/\/$/, '')}/json/2/${model}/${method}`;
  } catch { throw new OdooError("Configuración de URL Odoo inválida."); }
  try {
    const response = await fetch(url, {
      method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
        ...(process.env.ODOO_DATABASE ? { 'X-Odoo-Database': process.env.ODOO_DATABASE } : {}) },
      body: JSON.stringify({ ...args, context: { allowed_company_ids: [ODOO_COMPANY_ID], tracking_disable: true, mail_create_nolog: true, mail_create_nosubscribe: true } }),
    });
    const body = await response.json();
    if (!response.ok) {
      // Only Odoo validation messages are safe to surface; never expose tracebacks.
      const name = body?.name ?? body?.error?.data?.name;
      const message = body?.message ?? body?.error?.data?.message;
      if (['odoo.exceptions.ValidationError', 'odoo.exceptions.UserError'].includes(name) && typeof message === 'string') {
        throw new OdooError(`Validación Odoo: ${message.slice(0, 700)}`, 422);
      }
      throw new OdooError('Odoo rechazó la solicitud. Revisá permisos y configuración.');
    }
    return body as T;
  } catch (error) {
    if (error instanceof OdooError) throw error;
    throw new OdooError('No se pudo verificar la respuesta de Odoo. Reintentá para reconciliar el resultado.');
  }
}
