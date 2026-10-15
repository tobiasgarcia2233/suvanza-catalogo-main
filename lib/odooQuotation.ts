import 'server-only';
import { odooCall } from './odooClient';
import { normalizeDni } from './odooExportValues';
import { missingOdooProductMessage } from './odooExportStatus';
// JSON-2 records have dynamic fields, checked at their usage boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RecordData = Record<string, any>;
export type Call = typeof odooCall;
export type ExportSnapshot = {
  reference: string; total: number; buyer: { name: string; dni: string; phone: string };
  lines: { variantId: string; name: string; quantity: number; total: number; productId: number | null }[];
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
  if (c.priceBasis !== 'gross' || ![c.dniType,c.responsibility,c.country,c.currency,c.pricelist].every(n => Number.isSafeInteger(n) && n > 0)) throw new Error('Configurá ODOO_DNI_TYPE_ID, ODOO_CUSTOMER_RESPONSIBILITY_ID, ODOO_COUNTRY_ID, ODOO_CURRENCY_ID, ODOO_PRICELIST_ID y confirmá ODOO_LOCAL_PRICE_BASIS=gross (total con impuestos).');
  const [dni] = await search(call,'l10n_latam.identification.type',[['id','=',c.dniType]],['name','country_id']);
  const [responsibility] = await search(call,'l10n_ar.afip.responsibility.type',[['id','=',c.responsibility]],['name']);
  if (dni?.name !== 'DNI' || dni.country_id?.[0] !== c.country || responsibility?.name !== 'IVA Responsable Inscripto') throw new Error('La configuración fiscal no corresponde a DNI / IVA Responsable Inscripto. Revisá los IDs.');
  normalizeDni(s.buyer.dni);
  for (const line of s.lines) if (!line.productId) throw new Error(missingOdooProductMessage(line.name));
}

export async function quotationPayload(call: Call, s: ExportSnapshot, partnerId: number) {
  const [company] = await search(call,'res.company',[['id','=',1]],['currency_id','tax_calculation_rounding_method']);
  const [pricelist] = await search(call,'product.pricelist',[['id','=',s.config.pricelist]],['currency_id','company_id']);
  const [currency] = await search(call,'res.currency',[['id','=',s.config.currency]],['name','rounding']);
  if (company?.currency_id?.[0] !== s.config.currency || pricelist?.currency_id?.[0] !== s.config.currency || (pricelist.company_id && pricelist.company_id[0] !== 1) || !currency?.rounding) throw new Error('La moneda/lista de precios no coincide con la moneda acordada.');
  const defaults = await call<RecordData>('sale.order','default_get',{fields:['state','company_id']});
  if (defaults.state !== 'draft' || defaults.company_id !== 1) throw new Error('Odoo no tiene Presupuesto/SUVANZA como valores iniciales.');
  const [partner] = await search(call,'res.partner',[['id','=',partnerId]],['country_id','property_account_position_id','l10n_ar_afip_responsibility_type_id','company_id','active','vat','l10n_latam_identification_type_id']);
  if (!partner || !partner.active || normalizeDni(partner.vat) !== normalizeDni(s.buyer.dni) || partner.l10n_latam_identification_type_id?.[0] !== s.config.dniType || (partner.company_id && partner.company_id[0] !== 1)) throw new Error('Cliente no disponible para SUVANZA.');
  const positions = await search(call,'account.fiscal.position',[['company_id','=',1]],['sequence','auto_apply','country_id','country_group_id','state_ids','zip_from','zip_to','vat_required','l10n_ar_afip_responsibility_type_ids','tax_ids']);
  let fiscal = positions.find(p => p.id === partner.property_account_position_id?.[0]);
  if (partner.property_account_position_id && !fiscal) throw new Error('Posición fiscal del cliente no disponible.');
  if (!fiscal && partner.country_id) {
    for (const p of positions.filter(p => p.auto_apply).sort((a,b) => a.sequence - b.sequence || a.id - b.id)) {
      if (p.country_id && p.country_id[0] !== partner.country_id[0]) continue;
      // Argentine localization requires membership, including when the list is empty.
      if (!p.l10n_ar_afip_responsibility_type_ids.includes(partner.l10n_ar_afip_responsibility_type_id?.[0])) continue;
      if (p.country_group_id || p.state_ids.length || p.zip_from || p.zip_to || p.vat_required) throw new Error('La posición fiscal automática requiere reglas geográficas/IVA no soportadas. Asigná y revisá la posición fiscal del cliente en Odoo.');
      fiscal = p; break;
    }
  }
  const products = await search(call,'product.product',[['id','in',s.lines.map(l => l.productId)],['company_id','=',1],['active','=',true],['sale_ok','=',true]],['name','taxes_id','uom_id']);
  const taxes = await search(call,'account.tax',[['company_id','=',1],['type_tax_use','=','sale']],['amount','amount_type','price_include','include_base_amount','is_base_affected','original_tax_ids','fiscal_position_ids']);
  const [precision] = await search(call,'decimal.precision',[['name','=','Product Price']],['digits']);
  if (!Number.isInteger(precision?.digits)) throw new Error('No se pudo verificar la precisión del precio Odoo.');
  let expected = 0;
  const orderLines = s.lines.map(line => {
    const product = products.find(p => p.id === line.productId);
    if (!product?.uom_id) throw new Error(`La variante ${line.name} tiene un vínculo Odoo inválido/inactivo o de otra empresa.`);
    let ids: number[] = product.taxes_id;
    if (fiscal) ids = [...new Set(ids.flatMap(id => {
      const mapped = taxes.filter(t => fiscal.tax_ids.includes(t.id) && t.original_tax_ids.includes(id)).map(t => t.id);
      return mapped.length ? mapped : (fiscal.tax_ids.length || !taxes.find(t => t.id === id)?.fiscal_position_ids.length ? [id] : []);
    }))];
    const applicable = ids.map(id => taxes.find(t => t.id === id));
    if (applicable.some(t => !t || (t.amount_type !== 'percent' && !(t.amount_type === 'fixed' && t.amount === 0)) || t.include_base_amount || t.amount < 0)) throw new Error(`Impuestos no soportados en ${line.name}; revisar sin exportar parcialmente.`);
    const rate = applicable.reduce((sum,t) => sum + t!.amount / 100,0);
    const included = applicable.filter(t => t!.price_include).reduce((sum,t) => sum + t!.amount / 100,0);
    const unit = Number((line.total / line.quantity / (1 + rate) * (1 + included)).toFixed(precision.digits));
    const gross = unit * line.quantity / (1 + included) * (1 + rate);
    expected += company.tax_calculation_rounding_method === 'round_globally' ? gross : Math.round(gross / currency.rounding) * currency.rounding;
    return [0,0,{product_id:product.id,name:product.name,product_uom_id:product.uom_id[0],product_uom_qty:line.quantity,price_unit:unit,discount:0,tax_ids:[[6,0,ids]]}];
  });
  if (Math.abs(Math.round(expected / currency.rounding) * currency.rounding - s.total) > currency.rounding / 2 + 1e-8) throw new Error('La precisión de precio/impuestos Odoo no reproduce el total acordado. Revisá el redondeo; no se ajustarán los totales.');
  return { partner_id:partnerId, partner_invoice_id:partnerId, partner_shipping_id:partnerId, company_id:1,
    pricelist_id:s.config.pricelist, fiscal_position_id:fiscal?.id ?? false,
    origin:s.reference,client_order_ref:s.reference, note:false, order_line:orderLines };
}
