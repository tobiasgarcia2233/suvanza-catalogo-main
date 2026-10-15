// Decimal rational arithmetic: no binary floating point in monetary calculations.
export type Fraction = { n: bigint; d: bigint };
export function decimal(value: number): Fraction {
  if (!Number.isFinite(value)) throw new Error('Importe inválido.');
  const [coefficient, exponent = '0'] = String(value).toLowerCase().split('e');
  const [whole, fraction = ''] = coefficient.split('.');
  const scale = fraction.length - Number(exponent);
  const n = BigInt(whole + fraction);
  return scale >= 0 ? { n, d: BigInt(10) ** BigInt(scale) } : { n: n * BigInt(10) ** BigInt(-scale), d: BigInt(1) };
}
export const add = (a: Fraction, b: Fraction): Fraction => ({ n: a.n*b.d+b.n*a.d, d:a.d*b.d });
export const mul = (a: Fraction, b: Fraction): Fraction => ({ n:a.n*b.n,d:a.d*b.d });
export const div = (a: Fraction, b: Fraction): Fraction => {
  if (b.n === BigInt(0)) throw new Error('División monetaria por cero.');
  return {n:a.n*b.d,d:a.d*b.n};
};
export function rounded(a: Fraction): number {
  const sign = a.n < BigInt(0) ? -1 : 1;
  const n = a.n < BigInt(0) ? -a.n : a.n;
  const result = Number((n*BigInt(2)+a.d)/(a.d*BigInt(2))) * sign;
  if (!Number.isSafeInteger(result)) throw new Error('Importe fuera de rango.');
  return result;
}
export const cents = (value: number) => rounded(mul(decimal(value), decimal(100)));
export const extendedCents = (unit: number, quantity: number) => rounded(mul(mul(decimal(unit),decimal(quantity)),decimal(100)));
export function roundTo(value: Fraction, step: number): number {
  const product = mul(decimal(rounded(div(value, decimal(step)))), decimal(step));
  return Number(product.n) / Number(product.d);
}
