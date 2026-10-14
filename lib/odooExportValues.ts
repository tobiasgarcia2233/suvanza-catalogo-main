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
  if (Math.abs(lines.reduce((sum, line) => sum + line.total, 0) - order.total) > 0.005) throw new Error('Los componentes/promociones no suman el total acordado. Revisá la asignación original; no se recalcularán precios.');
  return lines;
}
