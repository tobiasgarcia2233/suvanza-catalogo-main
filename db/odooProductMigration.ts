import type { Client } from "@libsql/client";

// One-time transfer: rerunning must not guess a new destination after a user
// removes variants from a previously ambiguous product.
const migration = "2026-10-odoo-variant-links";

/** Read-only check; safe to run before deciding whether to migrate. */
export async function checkOdooProductSchema(db: Client) {
  const products = await db.execute("PRAGMA table_info(products)");
  const variants = await db.execute("PRAGMA table_info(variants)");
  const migrations = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'");
  const recorded = migrations.rows.length
    ? await db.execute({ sql: "SELECT name FROM schema_migrations WHERE name=?", args: [migration] })
    : null;
  return {
    productsHasOdooId: products.rows.some((row) => row.name === "odoo_product_id"),
    variantsHasOdooId: variants.rows.some((row) => row.name === "odoo_product_id"),
    variantMigrationRecorded: !!recorded?.rows.length,
  };
}

export async function migrateOdooProductLink(db: Client) {
  for (const table of ["products", "variants"]) {
    const columns = await db.execute(`PRAGMA table_info(${table})`);
    if (!columns.rows.some((row) => row.name === "odoo_product_id")) {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN odoo_product_id INTEGER`);
    }
  }
  await db.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`);
  const tx = await db.transaction("write");
  try {
    const done = await tx.execute({ sql: "SELECT name FROM schema_migrations WHERE name=?", args: [migration] });
    if (!done.rows.length) {
      // Transfer only a single variant with no conflicting link. Clearing the
      // source and populating the destination happen in the same transaction.
      await tx.execute(`UPDATE variants SET odoo_product_id = (
        SELECT odoo_product_id FROM products WHERE products.id = variants.product_id
      ) WHERE product_id IN (
        SELECT p.id FROM products p JOIN variants v ON v.product_id=p.id
        WHERE p.odoo_product_id IS NOT NULL
        GROUP BY p.id HAVING COUNT(*)=1
      ) AND (odoo_product_id IS NULL OR odoo_product_id = (
        SELECT odoo_product_id FROM products WHERE products.id=variants.product_id
      ))`);
      await tx.execute(`UPDATE products SET odoo_product_id=NULL
        WHERE odoo_product_id IS NOT NULL
        AND (SELECT COUNT(*) FROM variants WHERE product_id=products.id)=1
        AND EXISTS (SELECT 1 FROM variants WHERE product_id=products.id
          AND variants.odoo_product_id=products.odoo_product_id)`);
      await tx.execute({ sql: "INSERT INTO schema_migrations(name) VALUES (?)", args: [migration] });
    }
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally { tx.close(); }

  // Keep all unresolved references on products, and report every affected row.
  const pending = await db.execute(`SELECT p.id, p.name, p.odoo_product_id,
    COUNT(v.id) AS variant_count,
    CASE WHEN COUNT(v.id)=0 THEN 'Sin variantes'
         WHEN COUNT(v.id)>1 THEN 'Varias variantes'
         ELSE 'Asignación pendiente o conflicto de vínculo' END AS reason
    FROM products p LEFT JOIN variants v ON v.product_id=p.id
    WHERE p.odoo_product_id IS NOT NULL GROUP BY p.id ORDER BY p.name, p.id`);
  return pending.rows;
}
