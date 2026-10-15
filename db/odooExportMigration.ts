import type { Client } from '@libsql/client';
export const exportSchema = `CREATE TABLE IF NOT EXISTS odoo_exports (
 order_id TEXT PRIMARY KEY REFERENCES orders(id),
 status TEXT NOT NULL DEFAULT 'pending',
 snapshot TEXT NOT NULL,
 customer_data TEXT,
 pricing_data TEXT,
 partner_id INTEGER,
 quotation_id INTEGER UNIQUE,
 quotation_ref TEXT,
 phase TEXT NOT NULL DEFAULT 'ready',
 payload TEXT,
 candidates TEXT,
 error TEXT,
 lock_token TEXT,
 locked_until INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;
export async function migrateOdooExports(db: Client) {
  await db.execute(exportSchema);
  const columns = await db.execute("PRAGMA table_info(odoo_exports)");
  if (!columns.rows.some(column => column.name === "customer_data")) {
    await db.execute("ALTER TABLE odoo_exports ADD COLUMN customer_data TEXT");
  }
  if (!columns.rows.some(column => column.name === "pricing_data")) {
    await db.execute("ALTER TABLE odoo_exports ADD COLUMN pricing_data TEXT");
  }
  await db.execute(`CREATE TABLE IF NOT EXISTS odoo_customer_claims (document_key TEXT PRIMARY KEY, order_id TEXT NOT NULL)`);
}
