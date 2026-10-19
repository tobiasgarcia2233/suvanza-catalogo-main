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
  kind: 'correction' | 'approval' | 'deferred' | 'partner_update'; actor: string; at: string; revision: number;
  before?: BuyerData; after?: BuyerData; comparison?: CustomerComparison;
  releasedPartnerId?: number | null; releasedCustomerReference?: string;
  /** partner_update: the Odoo contact written and the exact values replaced. */
  partnerId?: number; partnerBefore?: Partial<Pick<BuyerData, 'name' | 'phone'>>; partnerAfter?: Partial<Pick<BuyerData, 'name' | 'phone'>>;
};
export type CustomerReviewData = {
  revision: number; buyer?: BuyerData; review?: CustomerComparison;
  approval?: CustomerComparison; preparedFor?: string; audit: CustomerAudit[];
  created: { id: number; reference: string; revision: number }[];
};
export type CustomerReviewAction =
  | { kind: 'approve'; actor: string; revision: number; token: string; partnerId: number }
  | { kind: 'correct'; actor: string; revision: number; buyer: BuyerData; preserveResolvedContact: boolean }
  | { kind: 'defer'; actor: string; revision: number }
  /** Write the order's name/phone onto the resolved Odoo contact. Never the document. */
  /** approveRest: the operator chose to keep Odoo's value for every other name/phone difference. */
  | { kind: 'update_partner'; actor: string; revision: number; token: string; partnerId: number; fields: PartnerUpdateField[]; approveRest: boolean };

export type PartnerUpdateField = 'name' | 'phone';
export const PARTNER_UPDATE_FIELDS: readonly PartnerUpdateField[] = ['name', 'phone'];

export const CUSTOMER_REVIEW_MESSAGE = 'Pedido pagado. Revisar datos del cliente antes de enviar a Odoo.';
/** Accent-, case- and punctuation-insensitive: "Ramírez" = "ramirez", "D'Angelo" = "d angelo". */
export function normalizedName(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// Connectors that are often dropped when a name is typed in a hurry.
const NAME_PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'das', 'do', 'dos', 'di', 'van', 'von', 'der']);

function nameTokens(value: string): string[] {
  return normalizedName(value).split(' ').filter(token => token && !NAME_PARTICLES.has(token));
}

/** At most one insertion, deletion or substitution apart. */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Same word, an initial of it ("J" ~ "Julieta"), or a one-letter typo in a long word. */
function sameNameToken(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length === 1 || b.length === 1) return a[0] === b[0];
  return Math.min(a.length, b.length) >= 5 && withinOneEdit(a, b);
}

/**
 * Whether two names plausibly belong to the same person, once the document
 * already matched. Tolerates accents, case, punctuation, connectors, word
 * order, initials, one-letter typos and missing words: every word of the
 * shorter name must pair with a distinct word of the longer one. A partial
 * name needs at least two full words in common ("Julieta Ramírez" ~ "Julieta
 * Ramírez Bermejo"); a lone first name is not enough to confirm the person.
 */
export function namesMatch(a: string, b: string): boolean {
  const x = nameTokens(a), y = nameTokens(b);
  if (!x.length || !y.length) return x.length === y.length;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  const pool = [...long];
  const pending: string[] = [];
  // Exact words first, so a fuzzy pairing never steals another word's exact match.
  for (const token of short) {
    const index = pool.indexOf(token);
    if (index >= 0) pool.splice(index, 1);
    else pending.push(token);
  }
  for (const token of pending) {
    const index = pool.findIndex(candidate => sameNameToken(token, candidate));
    if (index < 0) return false;
    pool.splice(index, 1);
  }
  const fullWords = short.filter(token => token.length > 1).length;
  return fullWords >= (short.length === long.length ? 1 : 2);
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

/**
 * Argentine national numbers (area code + subscriber, 10 digits) a phone can
 * stand for. Catalog phones are typed locally ("11 15 5555-0000",
 * "011 5555-0000") while Odoo stores them international ("+54 9 11 5555-0000"),
 * so the country code, the mobile 9, the trunk 0 and the mobile 15 are dropped.
 * The area code length (2–4) is unknown, so "15" yields one candidate per
 * position. Empty when the phone is not an Argentine number.
 */
function argentineNumbers(value: string, countryCode: string): Set<string> {
  const found = new Set<string>();
  const compact = value.trim().replace(/[\s().-]/g, '');
  if (!/^\+?\d+$/.test(compact)) return found;
  const international = compact.startsWith('+') || compact.startsWith('00');
  const digits = compact.replace(/^\+|^00/, '');
  const national = (rest: string) => {
    if (rest.length === 11 && rest.startsWith('9')) rest = rest.slice(1);
    if (rest.length === 10) found.add(rest);
  };
  if (international) {
    if (digits.startsWith('54')) national(digits.slice(2));
    return found;
  }
  if (countryCode !== 'AR' && countryCode !== '') return found;
  // "54 11 …" typed without the plus.
  if (digits.startsWith('54') && digits.length >= 12) national(digits.slice(2));
  const local = digits.startsWith('0') ? digits.slice(1) : digits;
  if (local.length === 10) found.add(local);
  if (local.length === 12) {
    for (const at of [2, 3, 4]) if (local.slice(at, at + 2) === '15') found.add(local.slice(0, at) + local.slice(at + 2));
  }
  return found;
}

/**
 * Whether two phones reach the same line. Argentine numbers are compared by
 * their national number, whatever prefixes each side used; anything else
 * keeps the strict formatting comparison of normalizedPhone.
 */
export function phonesMatch(a: string, aCountry: string, b: string, bCountry: string): boolean {
  const x = argentineNumbers(a, aCountry), y = argentineNumbers(b, bCountry);
  if (x.size && y.size) return [...x].some(number => y.has(number));
  return normalizedPhone(a, aCountry) === normalizedPhone(b, bCountry);
}
