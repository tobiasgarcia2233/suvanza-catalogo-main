import { cents, decimal, div, extendedCents, roundTo } from './money';
import type { Order } from '@/types';
export function normalizeDni(value: unknown): string {
  if (typeof value !== 'string' || !/^[\d.\s-]+$/.test(value)) throw new Error('El DNI debe ser un texto con dígitos, sin letras.');
  const dni = value.replace(/[.\s-]/g, '');
  if (!dni) throw new Error('Falta el DNI.');
  return dni;
}
export function commercialLines(order: Pick<Order, 'items' | 'total'>) {
  if (!order.items.length || !Number.isFinite(order.total) || order.total < 0) throw new Error('Total o productos del pedido inválidos.');
  const lines = order.items.map(item => {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0 || typeof item.finalPrice !== 'number' || !Number.isFinite(item.finalPrice) || item.finalPrice < 0) {
      throw new Error(`La línea ${item.name} no tiene cantidad/precio acordado válido. Revisá el pedido original.`);
    }
    // finalPrice is the whole NET-OF-DISCOUNT line, including allocated combos.
    return { variantId: String(item.id), name: item.name, quantity: item.quantity, total: item.finalPrice };
  });
  if (lines.reduce((sum, line) => sum + cents(line.total), 0) !== cents(order.total)) throw new Error('Los componentes/promociones no suman el total acordado. Revisá la asignación original; no se recalcularán precios.');
  return lines;
}

/** Preserve quantity and agreed cents when a deliberate adjustment cannot be
 * represented by one Odoo unit price. Only new server-calculated snapshots may
 * split; historical quotations retain their existing review behavior.
 */
export function exportPriceParts(line: {name:string;quantity:number;total:number;pricing?:import('@/types').PricingAllocation}, digits:number) {
  const unit = roundTo(line.pricing ? decimal(line.pricing.unitPrice) : div(decimal(line.total),decimal(line.quantity)),10 ** -digits);
  if (extendedCents(unit,line.quantity) === cents(line.total)) return [{quantity:line.quantity,unit}];
  if (!line.pricing?.serverCalculated || digits < 2) throw new Error(`El precio unitario acordado de ${line.name} no reproduce su total con ${digits} decimales en Odoo. Revisá el ajuste histórico de esa línea; no se cambiará el importe pagado.`);
  const total = cents(line.total);
  const lower = Math.floor(total/line.quantity);
  const higherQuantity = total - lower*line.quantity;
  const parts = [
    {quantity:line.quantity-higherQuantity,unit:lower/100},
    {quantity:higherQuantity,unit:(lower+1)/100},
  ].filter(p=>p.quantity>0);
  if (parts.reduce((s,p)=>s+p.quantity,0)!==line.quantity || parts.reduce((s,p)=>s+extendedCents(p.unit,p.quantity),0)!==total) throw new Error('El ajuste no puede representarse exactamente en Odoo.');
  return parts;
}
