import "server-only";
import { ODOO_COMPANY_ID, OdooError, odooSearchRead } from "./odooClient";
import type { OdooProduct } from "@/types";

const conditions = () => [
  "|",
  ["company_id", "=", ODOO_COMPANY_ID],
  ["company_id", "=", false],
  ["active", "=", true],
  ["sale_ok", "=", true],
];

export function parseOdooProductId(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new OdooError("Seleccioná un producto válido de Odoo o quitá el vínculo.", 400);
  }
  return value;
}

async function query(domain: unknown[], limit: number): Promise<OdooProduct[]> {
  const records = await odooSearchRead(domain, limit);
  if (!Array.isArray(records)) throw new OdooError("Odoo devolvió una respuesta inválida. Intentá nuevamente.");
  return records.map((row) => {
    if (!row || !Number.isSafeInteger(row.id) || row.id <= 0 || typeof row.name !== "string" ||
        !(row.company_id === false || (Array.isArray(row.company_id) && row.company_id[0] === ODOO_COMPANY_ID && typeof row.company_id[1] === "string"))) {
      throw new OdooError("Odoo devolvió una respuesta inválida. Intentá nuevamente.");
    }
    return { id: row.id, name: row.name, companyName: row.company_id === false ? "Visible para todos" : row.company_id[1] };
  });
}

export async function searchOdooProducts(input: string): Promise<OdooProduct[]> {
  const text = input.trim();
  if (text.length < 2 || text.length > 120) throw new OdooError("Escribí entre 2 y 120 caracteres para buscar en Odoo.", 400);
  return query([...conditions(), ["name", "ilike", text]], 20);
}

export async function getOdooProduct(id: number): Promise<OdooProduct> {
  parseOdooProductId(id);
  const records = await query([...conditions(), ["id", "=", id]], 1);
  const product = records.find((record) => record.id === id);
  if (!product) throw new OdooError("El producto ya no existe en Odoo o no está activo, habilitado para ventas y disponible para SUVANZA o visible para todos. Elegí otro producto o quitá el vínculo.", 422);
  return product;
}

export async function validateOdooLink(value: unknown, previous: number | null): Promise<number | null> {
  // Omitted by older clients: preserve the saved reference.
  if (value === undefined) return previous;
  if (value === null) return null;
  const id = parseOdooProductId(value);
  if (id !== previous) await getOdooProduct(id);
  return id;
}
