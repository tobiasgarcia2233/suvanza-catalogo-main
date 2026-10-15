import { cents, decimal, div, mul, rounded } from './money';
import type { CartItem } from '@/types';
export function agreedLineTotal(baseUnit:number, item:CartItem) {
  if (item.manualTotal != null) return cents(item.manualTotal)/100;
  const unit = item.manualPricePerUnit ?? baseUnit;
  const factor = item.manualPricePerUnit == null && item.manualPercentage > 0 ? div(decimal(100-item.manualPercentage),decimal(100)) : decimal(1);
  return rounded(mul(mul(mul(decimal(unit),decimal(item.quantity)),factor),decimal(100)))/100;
}

// Preserve brand-wide tiers; products without a brand use their own extra units.
export const quantityPricingKey = (item:Pick<CartItem,'id'|'brand'>) => item.brand ? `brand:${item.brand}` : `variant:${item.id}`;
