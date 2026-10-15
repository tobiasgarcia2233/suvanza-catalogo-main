export type BuyerData = { name: string; dni: string; phone: string };
export type ComparedCustomer = {
  id: number; reference: string; name: string; dni: string; phone: string;
  documentTypeId: number | null; documentType: string;
  countryId: number | null; countryCode: string; companyId: number | null; active: boolean;
  responsibilityId: number | null; fiscalPositionId: number | null;
};
export type CustomerComparison = {
  token: string; revision: number; local: BuyerData; localDocumentType: string;
  remote: ComparedCustomer; differences: { name: boolean; phone: boolean; document: boolean };
  canApprove: boolean;
};
export type CustomerAudit = {
  kind: 'correction' | 'approval' | 'deferred'; actor: string; at: string; revision: number;
  before?: BuyerData; after?: BuyerData; comparison?: CustomerComparison;
  releasedPartnerId?: number | null; releasedCustomerReference?: string;
};
export type CustomerReviewData = {
  revision: number; buyer?: BuyerData; review?: CustomerComparison;
  approval?: CustomerComparison; preparedFor?: string; audit: CustomerAudit[];
  created: { id: number; reference: string; revision: number }[];
};
export type CustomerReviewAction =
  | { kind: 'approve'; actor: string; revision: number; token: string; partnerId: number }
  | { kind: 'correct'; actor: string; revision: number; buyer: BuyerData; preserveResolvedContact: boolean }
  | { kind: 'defer'; actor: string; revision: number };

export const CUSTOMER_REVIEW_MESSAGE = 'Pedido pagado. Revisar datos del cliente antes de enviar a Odoo.';
export function normalizedName(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}
/** Conservative formatting comparison: no fuzzy identities or suffix matching. */
export function normalizedPhone(value: string, countryCode = ''): string {
  const original = value.trim();
  if (!original) return '';
  // Extensions/letters are significant; don't silently discard them.
  if (!/^[+\d\s().-]+$/.test(original)) return original.toLowerCase().replace(/\s+/g, ' ');
  let compact = original.replace(/[\s().-]/g, '');
  if (compact.startsWith('00')) compact = `+${compact.slice(2)}`;
  if (/^\+\d+$/.test(compact)) return compact;
  // Only Argentina has an established local country context in this integration.
  // Do not infer mobile 15/9 transformations or apply Argentine rules abroad.
  if (countryCode === 'AR' && /^0?\d{10}$/.test(compact)) {
    compact = compact.length === 11 ? compact.slice(1) : compact;
    return `+54${compact}`;
  }
  return compact;
}
