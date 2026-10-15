import 'server-only';
import { createHash } from 'node:crypto';
import { normalizeDni } from './odooExportValues';
import { search, type Call, type ExportSnapshot } from './odooQuotation';
import { namesMatch, normalizedPhone, type BuyerData, type CustomerComparison, type CustomerReviewData } from './customerReview';

export function readCustomerData(value: unknown): CustomerReviewData {
  return value ? JSON.parse(String(value)) : { revision: 0, audit: [], created: [] };
}
export function customerReference(s: ExportSnapshot, revision: number) {
  // Revision zero retains the legacy creation marker for crash reconciliation.
  return revision === 0 ? s.reference : `${s.reference}:customer:${revision}`;
}
export function validateCorrection(value: unknown): BuyerData {
  if (!value || typeof value !== 'object') throw new Error('Datos del comprador inválidos.');
  const buyer = value as BuyerData;
  for (const key of ['name', 'dni', 'phone'] as const) {
    if (typeof buyer[key] !== 'string' || !buyer[key].trim() || buyer[key].length > (key === 'name' ? 200 : 80)) throw new Error('Completá nombre, DNI y teléfono válidos.');
  }
  normalizeDni(buyer.dni);
  return { name: buyer.name, dni: buyer.dni, phone: buyer.phone };
}
export async function compareCustomer(call: Call, s: ExportSnapshot, partnerId: number, revision: number): Promise<CustomerComparison> {
  const [partner] = await search(call, 'res.partner', [
    ['id', '=', partnerId], ['active', 'in', [true, false]], '|', ['company_id', '=', 1], ['company_id', '=', false],
  ], ['name', 'ref', 'phone', 'vat', 'country_id', 'company_id', 'active', 'l10n_latam_identification_type_id', 'l10n_ar_afip_responsibility_type_id', 'property_account_position_id']);
  if (!partner || (partner.company_id && partner.company_id[0] !== 1)) throw new Error('Cliente no accesible para SUVANZA. No se puede aprobar.');
  const countries = await search(call, 'res.country', [['id', 'in', [...new Set([s.config.country, partner.country_id?.[0]].filter(Boolean))]]], ['code']);
  const localCountry = countries.find(c => c.id === s.config.country)?.code ?? '';
  const remote = {
    id: partner.id, reference: typeof partner.ref === 'string' ? partner.ref : '', name: typeof partner.name === 'string' ? partner.name : '',
    phone: typeof partner.phone === 'string' ? partner.phone : '', dni: typeof partner.vat === 'string' ? partner.vat : '',
    documentTypeId: partner.l10n_latam_identification_type_id?.[0] || null,
    documentType: partner.l10n_latam_identification_type_id?.[1] || '',
    countryId: partner.country_id?.[0] || null,
    countryCode: countries.find(c => c.id === partner.country_id?.[0])?.code ?? '',
    companyId: partner.company_id?.[0] || null, active: partner.active === true,
    responsibilityId: partner.l10n_ar_afip_responsibility_type_id?.[0] || null,
    fiscalPositionId: partner.property_account_position_id?.[0] || null,
  };
  let documentMatches = false;
  try { documentMatches = remote.documentTypeId === s.config.dniType && normalizeDni(remote.dni) === normalizeDni(s.buyer.dni); } catch { /* visible mismatch */ }
  const local = { name: s.buyer.name || '', dni: s.buyer.dni || '', phone: s.buyer.phone || '' };
  const differences = {
    name: !namesMatch(local.name, remote.name),
    phone: normalizedPhone(local.phone, localCountry) !== normalizedPhone(remote.phone, remote.countryCode),
    document: !documentMatches,
  };
  // Raw values are intentionally bound too: staff approve exactly what was shown.
  const token = createHash('sha256').update(JSON.stringify({ reference: s.reference, revision, local, localCountry, remote })).digest('hex');
  return { token, revision, local, localDocumentType: 'DNI', remote, differences, canApprove: remote.active && documentMatches };
}
