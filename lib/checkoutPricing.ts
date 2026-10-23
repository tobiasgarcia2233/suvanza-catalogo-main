import { agreedLineTotal } from './cartMoney';
import type { CartItem, Order, PricingAllocation } from '@/types';
import { expandComboRows } from './comboRows';
import { cents, extendedCents, decimal, div, mul, rounded } from './money';

export function promotionComponentTotal(items: {quantity:number;pricePerUnit:number}[]) {
  if (!items.length || items.some(i => !Number.isSafeInteger(i.quantity) || i.quantity <= 0 || !Number.isFinite(i.pricePerUnit) || i.pricePerUnit < 0)) throw new Error('Componentes de promoción inválidos.');
  const total = items.reduce((sum,i) => sum + extendedCents(i.pricePerUnit,i.quantity),0);
  if (!Number.isSafeInteger(total)) throw new Error('Importe fuera de rango.');
  return total / 100;
}

export function promotionReviewMessage(p: {title:string;totalPrice:number;items:{quantity:number;pricePerUnit:number}[]}) {
  try { validatePromotion(p); return null; } catch (error) { return error instanceof Error ? error.message : 'Promoción inválida.'; }
}

export function validatePromotion(p: {title:string;totalPrice:number;items:{quantity:number;pricePerUnit:number}[]}) {
  if (!p.items.length || p.items.some(i => !Number.isSafeInteger(i.quantity) || i.quantity <= 0 || !Number.isFinite(i.pricePerUnit) || i.pricePerUnit < 0) || !Number.isFinite(p.totalPrice) || p.totalPrice < 0 ||
    p.items.reduce((sum, i) => sum + extendedCents(i.pricePerUnit,i.quantity), 0) !== cents(p.totalPrice)) {
    throw new Error(`La promoción «${p.title}» es inconsistente: Productos incluidos no suma el total del combo. Corregí sus precios unitarios o el total antes de vender; no se redistribuirá la diferencia.`);
  }
}

export function checkoutItems(items: CartItem[], total: number): Order['items'] {
  const result = expandComboRows(items).flatMap((item, index): Order['items'] => {
    if (!item.isPromo) {
      const lineTotal = cents(item.customTotal as number);
      return [{id:String(item.id),name:item.name,brand:item.brand ?? '',quantity:item.quantity,finalPrice:lineTotal/100,discountPercentage:item.discountPercentage,
        pricing:{version:2,kind:'extra',unitPrice:lineTotal/100/item.quantity,baseUnitPrice:item.priceTiers?.[0]?.pricePerUnit ?? 0, agreedTotal:lineTotal/100,tiers:item.priceTiers, tierQuantity:item.tierQuantity,adjustment:{manualPricePerUnit:item.manualPricePerUnit,manualPercentage:item.manualPercentage,manualTotal:item.manualTotal}}}];
    }
    const manifest = item.includedItems;
    if (!manifest?.length || manifest.some(i => i.promotionUnitPrice == null) || item.promotionTotal == null) throw new Error(`Falta el precio original de «${item.name}». Quitá y volvé a seleccionar la promoción antes de confirmar.`);
    validatePromotion({title:item.name,totalPrice:item.promotionTotal,items:manifest.map(i => ({quantity:i.quantity,pricePerUnit:i.promotionUnitPrice!}))});
    const bases = manifest.map(i => extendedCents(i.promotionUnitPrice!, i.quantity * item.quantity));
    const baseTotal = bases.reduce((a,b)=>a+b,0);
    const agreed = cents(item.customTotal as number);
    if (!baseTotal && agreed) throw new Error('No se puede asignar un ajuste sobre una promoción sin precio.');
    const adjusted = item.manualTotal != null || item.manualPricePerUnit != null || item.manualPercentage > 0;
    if (!adjusted && baseTotal !== agreed) throw new Error('Los componentes/repeticiones no suman el total de promoción. Revisá la precisión de sus precios configurados.');
    // Allocate only a deliberate bundle adjustment, using configured component prices.
    // Cumulative rounding preserves the agreed cents without adjustment products.
    let cumulative = 0, allocated = 0;
    return manifest.map((part, j) => {
      cumulative += bases[j];
      const next = baseTotal ? rounded(div(mul(decimal(agreed),decimal(cumulative)),decimal(baseTotal))) : 0;
      const lineTotal = next - allocated; allocated = next;
      const quantity = part.quantity * item.quantity;
      return {id:String(part.id),name:part.name,brand:part.brand ?? '',quantity,finalPrice:lineTotal/100,discountPercentage:0,
        pricing:{version:2,kind:'promotion',comboSource:item.comboSource,promotionId:String(item.promoId ?? item.id),promotionName:item.name,allocationId:`${index}`,repetitions:item.quantity,quantityPerPromotion:part.quantity,
          configuredUnitPrice:part.promotionUnitPrice!,promotionTotal:item.promotionTotal!,unitPrice:lineTotal/100/quantity,agreedTotal:lineTotal/100,
          adjustment:{manualPricePerUnit:item.manualPricePerUnit,manualPercentage:item.manualPercentage,manualTotal:item.manualTotal}}};
    });
  });
  validatePurchasedItems(result,total);
  validateAllocationManifest(result);
  return result;
}

export function validatePurchasedItems(items: Order['items'], total: number) {
  if (!items.length || !Number.isFinite(total) || total < 0 || items.some(i => !Number.isSafeInteger(i.quantity) || i.quantity <= 0 || typeof i.finalPrice !== 'number' || !Number.isFinite(i.finalPrice) || i.finalPrice < 0) ||
    items.reduce((sum,i)=>sum+cents(i.finalPrice!),0) !== cents(total)) throw new Error('Las asignaciones no suman el total acordado. Revisá el pedido.');
  for (const item of items) {
    const p: PricingAllocation | undefined = item.pricing;
    if (p && (p.version !== 2 || !['extra','promotion'].includes(p.kind) || cents(p.agreedTotal) !== cents(item.finalPrice!) || !Number.isFinite(p.unitPrice) || p.unitPrice < 0 || cents(p.unitPrice * item.quantity) !== cents(item.finalPrice!))) throw new Error('Snapshot de precios inválido.');
  }
}

/** Validate captured allocations, never consult today's catalog. */
export function validateAllocationManifest(items:Order['items'], sold?:Order['promos_sold']) {
  const groups = new Map<string,Order['items']>();
  for (const item of items) {
    const p = item.pricing;
    if (!p) throw new Error('Falta la asignación de precios histórica de una línea.');
    if (p.adjustment?.manualPercentage != null && (!Number.isFinite(p.adjustment.manualPercentage) || p.adjustment.manualPercentage < 0 || p.adjustment.manualPercentage > 100)) throw new Error('Descuento histórico inválido.');
    if (p.kind === 'promotion') {
      if (!p.promotionId || !p.allocationId || !Number.isSafeInteger(p.repetitions) || p.repetitions! <= 0 || !Number.isSafeInteger(p.quantityPerPromotion) || p.quantityPerPromotion! <= 0 || p.repetitions! * p.quantityPerPromotion! !== item.quantity || !Number.isFinite(p.configuredUnitPrice) || p.configuredUnitPrice! < 0 || !Number.isFinite(p.promotionTotal)) throw new Error('Falta manifiesto histórico por promoción/repetición.');
      const key = JSON.stringify([p.promotionId,p.allocationId]);
      groups.set(key,[...(groups.get(key) ?? []),item]);
    } else {
      const extraQuantity = items.filter(i=>i.pricing?.kind==='extra' && (item.brand ? i.brand===item.brand : i.id===item.id)).reduce((s,i)=>s+i.quantity,0);
      if (p.tierQuantity !== extraQuantity) throw new Error('La escala debe contar solo unidades extra.');
      if (!p.tiers?.length || p.tiers.some(t=>!Number.isSafeInteger(t.minQuantity)||t.minQuantity<=0||!Number.isFinite(t.pricePerUnit)||t.pricePerUnit<0)) throw new Error('Falta la escala histórica de las unidades extra.');
      let unit = p.tiers[0].pricePerUnit;
      if (!(p.adjustment?.manualPercentage! > 0)) for (const tier of p.tiers) if (extraQuantity >= tier.minQuantity) unit = tier.pricePerUnit;
      if (cents(agreedLineTotal(unit,{quantity:item.quantity,...p.adjustment} as CartItem)) !== cents(item.finalPrice!)) throw new Error('El precio extra no coincide con su escala/ajuste histórico.');
    }
  }
  const counts = new Map<string,number>();
  for (const lines of groups.values()) {
    const p = lines[0].pricing!;
    if (lines.some(i=>i.pricing!.repetitions!==p.repetitions || i.pricing!.promotionTotal!==p.promotionTotal || JSON.stringify(i.pricing!.adjustment)!==JSON.stringify(p.adjustment))) throw new Error('Manifiesto histórico ambiguo.');
    const base = lines.reduce((s,i)=>s+extendedCents(i.pricing!.configuredUnitPrice!,i.pricing!.quantityPerPromotion!),0);
    if (base !== cents(p.promotionTotal!)) throw new Error('Los componentes históricos no suman el total de promoción; requiere revisión de la venta original.');
    const expected = cents(agreedLineTotal(p.promotionTotal!,{quantity:p.repetitions!,...p.adjustment} as CartItem));
    if (lines.reduce((s,i)=>s+cents(i.finalPrice!),0) !== expected) throw new Error('El descuento histórico no coincide con el total acordado.');
    const repeatedBase = lines.reduce((s,i)=>s+extendedCents(i.pricing!.configuredUnitPrice!,i.quantity),0);
    const adjusted = p.adjustment?.manualTotal != null || p.adjustment?.manualPricePerUnit != null || (p.adjustment?.manualPercentage ?? 0) > 0;
    if (!adjusted && repeatedBase !== expected) throw new Error('Los componentes/repeticiones no suman el total de promoción.');
    let cumulative = 0, allocated = 0;
    for (const line of lines) {
      cumulative += extendedCents(line.pricing!.configuredUnitPrice!,line.quantity);
      const next = repeatedBase ? rounded(div(mul(decimal(expected),decimal(cumulative)),decimal(repeatedBase))) : 0;
      if (cents(line.finalPrice!) !== next-allocated) throw new Error('Los precios promocionales no coinciden con sus componentes/ajuste histórico.');
      allocated = next;
    }
    counts.set(p.promotionId!,(counts.get(p.promotionId!) ?? 0)+p.repetitions!);
  }
  if (sold !== undefined) {
    const expected = new Map<string,number>();
    for (const p of sold ?? []) expected.set(p.id,(expected.get(p.id) ?? 0)+p.quantity);
    if (JSON.stringify([...expected].sort()) !== JSON.stringify([...counts].sort())) throw new Error('La asignación no coincide con las promociones/repeticiones vendidas.');
  }
}
