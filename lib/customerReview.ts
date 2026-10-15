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
