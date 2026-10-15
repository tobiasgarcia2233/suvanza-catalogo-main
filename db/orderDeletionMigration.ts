import type { Client } from '@libsql/client';
export const orderDeletionSchema = `CREATE TABLE IF NOT EXISTS order_deletions (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_by TEXT NOT NULL
)`;
export async function migrateOrderDeletion(db: Client) {
  await db.execute(orderDeletionSchema);
}
