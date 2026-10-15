import 'server-only';
import type { Client } from '@libsql/client';
import { db } from './db';

export class OrderActionError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
export const activeOrderSql = (alias = 'orders') => `NOT EXISTS (SELECT 1 FROM order_deletions WHERE order_id = ${alias}.id)`;
export async function isOrderDeleted(id: string, client: Pick<Client,'execute'> = db) {
  return (await client.execute({sql:'SELECT order_id FROM order_deletions WHERE order_id = ?',args:[id]})).rows.length > 0;
}
export async function requireActiveOrder(id: string, client: Pick<Client,'execute'> = db) {
  if (await isOrderDeleted(id,client)) throw new OrderActionError('Este pedido fue eliminado del catálogo. No se puede modificar ni volver a exportar.');
}

/** Atomic and idempotent; never changes payments, leases, claims or export records. */
export async function softDeleteOrder(id: string, actor: string, sellerOnly = false, client: Client = db) {
  const tx = await client.transaction('write');
  try {
    const row = (await tx.execute({sql:'SELECT status, odoo_sent_at FROM orders WHERE id = ?',args:[id]})).rows[0];
    if (!row) throw new OrderActionError('Pedido no encontrado.',404);
    if (sellerOnly && (row.status !== 'PENDING_PAYMENT' || row.odoo_sent_at || (await tx.execute({sql:'SELECT order_id FROM odoo_exports WHERE order_id = ?',args:[id]})).rows.length)) {
      throw new OrderActionError('Esta venta ya fue confirmada o tiene historial Odoo y no puede eliminarse desde el enlace de vendedor.',403);
    }
    await tx.execute({sql:'INSERT OR IGNORE INTO order_deletions (order_id,deleted_by) VALUES (?,?)',args:[id,actor]});
    await tx.commit();
  } finally { tx.close(); }
}
