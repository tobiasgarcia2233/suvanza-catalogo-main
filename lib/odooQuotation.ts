import 'server-only';
import { cents, extendedCents } from './money';
import { odooCall } from './odooClient';
import { commercialLines, normalizeDni, exportPriceParts } from './odooExportValues';
import { missingOdooProductMessage } from './odooExportStatus';
import { validateSalesTax, type SalesTaxPolicy, type SalesTaxAdoption } from './odooTaxPolicy';
// JSON-2 records have dynamic fields, checked at their usage boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RecordData = Record<string, any>;
export type Call = typeof odooCall;
export type ExportSnapshot = {
  // Purchase prices are captured locally first; export validates and persists this
  // policy before any quotation creation, without coupling payment to Odoo uptime.
  taxPolicy?: SalesTaxPolicy;
  taxPolicyAdoption?: SalesTaxAdoption;
  reference: string; total: number; buyer: { name: string; dni: string; phone: string };
  lines: { variantId: string; name: string; quantity: number; total: number; productId: number | null; pricing?: import("@/types").PricingAllocation }[];
  config: { dniType: number; responsibility: number; country: number; currency: number; pricelist: number; priceBasis: string };
};
export async function search(call: Call, model: string, domain: unknown[], fields: string[]): Promise<RecordData[]> {
  const rows = await call< RecordData[]>(model, 'search_read', { domain, fields, limit: 1001, order: 'id' });
  if (!Array.isArray(rows) || rows.length > 1000 || rows.some(row => !Number.isSafeInteger(row.id))) throw new Error(`Consulta ${model} incompleta o inválida; requiere revisión.`);
  return rows;
}
export async function customers(call: Call, s: ExportSnapshot) {
  // Digit subsequence search includes formatted VAT; exact normalized matching below
  // excludes false positives and preserves leading zeros and shared contacts.
  // Fail closed if the bounded result is incomplete, never mistake it for no match.
  const rows = await search(call, 'res.partner', [ ['l10n_latam_identification_type_id', '=', s.config.dniType], ['vat','ilike',normalizeDni(s.buyer.dni).split('').join('%')], ['active','in',[true,false]], '|', ['company_id','=',1], ['company_id','=',false] ], ['name','vat','phone','active','company_id','l10n_latam_identification_type_id']);
  return rows.filter(row => { try { return normalizeDni(row.vat) === normalizeDni(s.buyer.dni); } catch { return false; } });
}
export function customerPayload(s: ExportSnapshot) {
  if (!s.buyer.name?.trim() || !s.buyer.phone?.trim()) throw new Error('Falta nombre o teléfono para crear el cliente. Corregí los datos del pedido.');
  return { name: s.buyer.name.trim(), phone: s.buyer.phone.trim(), vat: normalizeDni(s.buyer.dni),
    l10n_latam_identification_type_id: s.config.dniType, l10n_ar_afip_responsibility_type_id: s.config.responsibility,
    company_id: 1, country_id: s.config.country, ref: s.reference };
}
export async function validateConfig(call: Call, s: ExportSnapshot) {
  const c = s.config;
  // Accept the legacy 'gross' snapshot label; both mean final catalogue price.
  if (!['catalogue','gross'].includes(c.priceBasis) || ![c.dniType,c.responsibility,c.country,c.currency,c.pricelist].every(n => Number.isSafeInteger(n) && n > 0)) throw new Error('Configurá ODOO_DNI_TYPE_ID, ODOO_CUSTOMER_RESPONSIBILITY_ID, ODOO_COUNTRY_ID, ODOO_CURRENCY_ID, ODOO_PRICELIST_ID. El snapshot debe conservar el precio final acordado en el catálogo.');
  const [dni] = await search(call,'l10n_latam.identification.type',[['id','=',c.dniType]],['name','country_id']);
  const [responsibility] = await search(call,'l10n_ar.afip.responsibility.type',[['id','=',c.responsibility]],['name']);
  if (dni?.name !== 'DNI' || dni.country_id?.[0] !== c.country || responsibility?.name !== 'IVA Responsable Inscripto') throw new Error('La configuración fiscal no corresponde a DNI / IVA Responsable Inscripto. Revisá los IDs.');
  normalizeDni(s.buyer.dni);
  for (const line of s.lines) if (!line.productId) throw new Error(missingOdooProductMessage(line.name));
}

export async function quotationPayload(call: Call, s: ExportSnapshot, partnerId: number) {
  if (!s.taxPolicy) throw new Error('Falta la política de IVA 0% validada en el snapshot. Reintentá la exportación para validarla antes de crear el presupuesto.');
  const taxPolicy = await validateSalesTax(call,s.taxPolicy);
  commercialLines({total:s.total,items:s.lines.map(l=>({id:l.variantId,name:l.name,brand:'',quantity:l.quantity,finalPrice:l.total,discountPercentage:0}))});
  const [company] = await search(call,'res.company',[['id','=',1]],['currency_id']);
  const [pricelist] = await search(call,'product.pricelist',[['id','=',s.config.pricelist]],['currency_id','company_id']);
  const [currency] = await search(call,'res.currency',[['id','=',s.config.currency]],['name','rounding']);
  if (company?.currency_id?.[0] !== s.config.currency || pricelist?.currency_id?.[0] !== s.config.currency || (pricelist.company_id && pricelist.company_id[0] !== 1) || !currency?.rounding) throw new Error('La moneda/lista de precios no coincide con la moneda acordada.');
  const defaults = await call<RecordData>('sale.order','default_get',{fields:['state','company_id']});
  if (defaults.state !== 'draft' || defaults.company_id !== 1) throw new Error('Odoo no tiene Presupuesto/SUVANZA como valores iniciales.');
  const [partner] = await search(call,'res.partner',[['id','=',partnerId]],['country_id','property_account_position_id','l10n_ar_afip_responsibility_type_id','company_id','active','vat','l10n_latam_identification_type_id']);
  if (!partner || !partner.active || normalizeDni(partner.vat) !== normalizeDni(s.buyer.dni) || partner.l10n_latam_identification_type_id?.[0] !== s.config.dniType || (partner.company_id && partner.company_id[0] !== 1)) throw new Error('Cliente no disponible para SUVANZA.');
  const products = await search(call,'product.product',[['id','in',s.lines.map(l => l.productId)],['company_id','=',1],['active','=',true],['sale_ok','=',true]],['name','uom_id']);
  const [precision] = await search(call,'decimal.precision',[['name','=','Product Price']],['digits']);
  if (!Number.isInteger(precision?.digits) || precision.digits < 0 || precision.digits > 8) throw new Error('No se pudo verificar la precisión del precio Odoo.');
  let expectedCents = 0;
  const orderLines = s.lines.flatMap((line): [number,number,RecordData][] => {
    const product = products.find(p => p.id === line.productId);
    if (!product?.uom_id) throw new Error(`La variante ${line.name} tiene un vínculo Odoo inválido/inactivo o de otra empresa.`);
    // The snapshot contains the final catalogue price, already discounted.
    // No gross/net conversion, tax mapping, catalogue lookup or second discount.
    if (line.pricing && cents(line.pricing.agreedTotal) !== cents(line.total)) throw new Error(`La asignación histórica de ${line.name} no coincide con su total acordado.`);
    return exportPriceParts(line,precision.digits).map(({quantity,unit}) => {
      expectedCents += extendedCents(unit,quantity);
      return [0,0,{product_id:product.id,name:line.name,product_uom_id:product.uom_id[0],product_uom_qty:quantity,price_unit:unit,discount:0,tax_ids:[[6,0,[taxPolicy.taxId]]]}];
    });
  });
  if (expectedCents !== cents(s.total)) throw new Error('Las líneas no suman el total acordado del pedido. Revisá la asignación histórica; no se ajustarán precios ni totales.');

  return { partner_id:partnerId, partner_invoice_id:partnerId, partner_shipping_id:partnerId, company_id:1,
    pricelist_id:s.config.pricelist, fiscal_position_id:partner.property_account_position_id?.[0] ?? false,
    origin:s.reference,client_order_ref:s.reference, note:false, order_line:orderLines };
}
