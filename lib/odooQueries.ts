import "server-only";
import { ODOO_COMPANY_ID, OdooError, odooCall, odooSearchRead } from "./odooClient";
import type { OdooLinkCheck, OdooProduct, OdooProductDetails } from "@/types";

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

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);
const many2one = (value: unknown) =>
  Array.isArray(value) && Number.isSafeInteger(value[0]) && typeof value[1] === "string" ? { id: value[0] as number, name: value[1] as string } : null;

/**
 * Display only, never used to accept a link. Reads the variant without the
 * export's filters so the form can say which requirement fails. Keep the checks
 * in sync with the product search in quotationPayload (lib/odooQuotation.ts).
 */
export async function getOdooProductDetails(id: number): Promise<OdooProductDetails> {
  parseOdooProductId(id);
  let rows: unknown;
  try {
    rows = await odooCall("product.product", "search_read", {
      domain: [["id", "=", id], ["active", "in", [true, false]]],
      fields: ["name", "company_id", "active", "sale_ok", "uom_id", "product_tmpl_id", "default_code", "barcode"],
      limit: 1,
    });
  } catch {
    throw new OdooError("No se pudo consultar el producto en Odoo. Intentá nuevamente.");
  }
  if (!Array.isArray(rows) || rows.length > 1) throw new OdooError("Odoo devolvió una respuesta inválida. Intentá nuevamente.");
  const row = rows[0];
  if (!row) {
    return {
      id, found: false, name: null, companyName: null, templateId: null, defaultCode: null, barcode: null, uomName: null, exportable: false,
      checks: [{ key: "found", label: "Existe como variante en Odoo", ok: false,
        hint: "No se encontró este ID como variante (product.product) accesible desde SUVANZA. Revisá que no sea el ID de la plantilla o de un producto de otra empresa." }],
    };
  }
  if (row.id !== id || typeof row.name !== "string") throw new OdooError("Odoo devolvió una respuesta inválida. Intentá nuevamente.");
  const company = many2one(row.company_id);
  const uom = many2one(row.uom_id);
  const checks: OdooLinkCheck[] = [
    { key: "found", label: "Existe como variante en Odoo", ok: true, hint: "" },
    { key: "company", label: "Empresa SUVANZA", ok: company?.id === ODOO_COMPANY_ID,
      hint: company ? `Pertenece a ${company.name}. Elegí un producto de SUVANZA.` : "Tiene la empresa vacía (visible para todos). La exportación solo acepta productos de SUVANZA: asignale la empresa en Odoo." },
    { key: "active", label: "Activo", ok: row.active === true, hint: "Está archivado en Odoo. Desarchivalo o elegí otro producto." },
    { key: "sale_ok", label: "Puede venderse", ok: row.sale_ok === true, hint: "Tildá “Puede ser vendido” en el producto en Odoo." },
    { key: "uom", label: "Unidad de medida", ok: !!uom, hint: "No tiene unidad de medida asignada en Odoo." },
  ];
  return {
    id, found: true, name: row.name, companyName: company?.name ?? null,
    templateId: many2one(row.product_tmpl_id)?.id ?? null,
    defaultCode: text(row.default_code), barcode: text(row.barcode), uomName: uom?.name ?? null,
    checks, exportable: checks.every((check) => check.ok),
  };
}

export async function validateOdooLink(value: unknown, previous: number | null): Promise<number | null> {
  // Omitted by older clients: preserve the saved reference.
  if (value === undefined) return previous;
  if (value === null) return null;
  const id = parseOdooProductId(value);
  if (id !== previous) await getOdooProduct(id);
  return id;
}
