import type { CartItem, CrossPromotion, Product } from '@/types';
import { checkoutItems, validatePromotion } from './checkoutPricing';
import { agreedLineTotal, quantityPricingKey } from './cartMoney';
import { expandComboRows } from './comboRows';
import { allocatePromotionComponents, matchesRequirement } from './comboSelection';
import { resolvePromotionProduct } from './promotionProducts';
import { cents, extendedCents } from './money';

export class CheckoutPricingError extends Error {}

/** Only selection, quantities and explicit adjustments are browser inputs.
 * Catalog prices, labels, tiers, totals and persisted allocations are server-owned.
 * This function never selects a promotion merely because quantities qualify.
 */
export function calculateCheckout(cart: CartItem[], products: Product[], promotions: CrossPromotion[], agreedTotal: number) {
  try {
    if (!Array.isArray(cart) || !cart.length) throw new Error('Actualizá el carrito antes de confirmar.');
    const variants = products.flatMap(p => (p.variants?.length ? p.variants.map(v => ({
      ...p, ...v, id:String(v.id), priceTiers:v.priceTiers ?? [], variants:[],
    })) : [{...p,id:String(p.id)}]));
    const hydrate = (raw: CartItem): CartItem => {
      const product = variants.find(v => v.id === String(raw.id));
      if (!product || !Number.isSafeInteger(raw.quantity) || raw.quantity <= 0) throw new Error('Producto o cantidad inválidos.');
      return {...product,quantity:raw.quantity,discountPercentage:0,manualTotal:null,manualPercentage:0};
    };
    const adjustment = (raw: CartItem) => {
      for (const value of [raw.manualTotal,raw.manualPricePerUnit,raw.manualPercentage]) {
        if (value != null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) throw new Error('Ajuste inválido.');
      }
      if ((raw.manualPercentage ?? 0) > 100 || [raw.manualTotal != null,raw.manualPricePerUnit != null,(raw.manualPercentage ?? 0)>0].filter(Boolean).length > 1) throw new Error('Ajustes incompatibles.');
      return {manualTotal:raw.manualTotal ?? null,manualPricePerUnit:raw.manualPricePerUnit ?? null,manualPercentage:raw.manualPercentage ?? 0};
    };
    const selected = expandComboRows(cart).map((raw): CartItem => {
      const adjustments = adjustment(raw);
      if (!raw.isPromo) return {...hydrate(raw),...adjustments};
      const promo = promotions.find(p => p.id === String(raw.promoId ?? raw.id));
      if (!promo || !Number.isSafeInteger(raw.quantity) || raw.quantity <= 0 || !raw.includedItems?.length || !['explicit','automatic'].includes(raw.comboSource ?? '')) throw new Error('Falta la selección de promoción. Volvé a seleccionarla.');
      if (raw.comboSource === 'automatic' && !promo.isPromo) throw new Error('La promoción automática ya no está habilitada.');
      validatePromotion(promo);
      const parts = raw.includedItems.map(part => ({...hydrate(part),promotionUnitPrice:part.promotionUnitPrice}));
      // Explicit purchases retain the existing legacy name resolver. Automatic
      // selections use the existing exact/brand/name matching rules.
      const requirements = {...promo,items:promo.items.map(row => {
        if (raw.comboSource !== 'explicit') return row;
        const exact = variants.find(v => v.id === row.id);
        const resolved = exact ?? resolvePromotionProduct(products,row.name)?.variant;
        if (!resolved) throw new Error(`No se encuentra el componente ${row.name}.`);
        return {...row,id:String(resolved.id),matchBy:undefined};
      })};
      const matrix = allocatePromotionComponents(parts,requirements,1,(part,row) =>
        matchesRequirement(part,row) && part.promotionUnitPrice === row.pricePerUnit);
      if (!matrix || parts.some((p,i) => matrix.reduce((s,row)=>s+row[i],0)!==p.quantity)) throw new Error(`Los componentes/precios de «${promo.title}» cambiaron o no corresponden. Volvé a seleccionar la promoción.`);
      return {...raw,id:promo.id,promoId:promo.id,name:promo.title,quantity:raw.quantity,
        promotionTotal:promo.totalPrice,includedItems:parts,comboParts:undefined,...adjustments};
    });
    const quantities = new Map<string,number>();
    selected.filter(i=>!i.isPromo).forEach(i => quantities.set(quantityPricingKey(i),(quantities.get(quantityPricingKey(i)) ?? 0)+i.quantity));
    const tierUnits = new Map<CartItem,number>();
    let subtotalCents = 0;
    for (const item of selected) {
      if (item.isPromo) {
        subtotalCents += item.includedItems!.reduce((sum,p)=>sum+extendedCents(p.priceTiers[0]?.pricePerUnit ?? 0,p.quantity*item.quantity),0);
        item.customTotal = agreedLineTotal(item.promotionTotal!,item);
      } else {
        if (!item.priceTiers.length) throw new Error(`Falta la escala de ${item.name}.`);
        item.tierQuantity = quantities.get(quantityPricingKey(item))!;
        let unit = item.priceTiers[0].pricePerUnit;
        if (!item.manualPercentage) for (const tier of item.priceTiers) if (item.tierQuantity >= tier.minQuantity) unit = tier.pricePerUnit;
        tierUnits.set(item,unit);
        subtotalCents += extendedCents(item.priceTiers[0].pricePerUnit,item.quantity);
        item.customTotal = agreedLineTotal(unit,item);
      }
    }
    const total = selected.reduce((s,i)=>s+cents(i.customTotal!),0)/100;
    if (typeof agreedTotal !== 'number' || cents(total)!==cents(agreedTotal)) throw new Error('Los precios cambiaron o el total no coincide. Revisá el carrito antes de confirmar.');
    const items = checkoutItems(selected,total);
    let offset = 0;
    for (const item of selected) {
      const lines = items.slice(offset,offset+(item.isPromo ? item.includedItems!.length : 1));
      lines.forEach(line => {
        const p = line.pricing!;
        p.serverCalculated = true;
        if (!item.isPromo) p.appliedTierUnitPrice = tierUnits.get(item)!;
        p.adjustmentAmount = (cents(line.finalPrice!) - extendedCents(item.isPromo ? p.configuredUnitPrice! : p.appliedTierUnitPrice!,line.quantity))/100;
      });
      offset += lines.length;
    }
    const sold = new Map<string,{id:string;title:string;quantity:number}>();
    selected.filter(i=>i.isPromo).forEach(i => {
      const id = String(i.promoId);
      sold.set(id,{id,title:i.name,quantity:(sold.get(id)?.quantity ?? 0)+i.quantity});
    });
    return {items,total,subtotal:subtotalCents/100,discounted_amount:(subtotalCents-cents(total))/100,promos:[...sold.values()]};
  } catch (error) {
    throw new CheckoutPricingError(error instanceof Error ? error.message : 'Precios inválidos.');
  }
}
