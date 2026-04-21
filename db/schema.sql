-- Schema for Suvanza Catalogo on Turso (libSQL / SQLite).
-- All timestamps stored as ISO-8601 strings (UTC) for easy transport as JSON.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  brand TEXT,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES variants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS price_tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES variants(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL,
  price_per_unit REAL NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  total_price REAL NOT NULL,
  is_promo INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS promotion_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  brand TEXT,
  quantity INTEGER NOT NULL,
  price_per_unit REAL NOT NULL,
  notes TEXT,
  match_by TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_promotions (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, promotion_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
  order_date TEXT,
  total REAL NOT NULL DEFAULT 0,
  discounted_amount REAL NOT NULL DEFAULT 0,
  items TEXT NOT NULL,
  buyer_details TEXT NOT NULL,
  seller_name TEXT,
  auto_apply_promos INTEGER NOT NULL DEFAULT 0,
  transferred_to_odoo INTEGER NOT NULL DEFAULT 0,
  transferred_at TEXT,
  notes TEXT,
  payment_method TEXT,
  payments TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_variant ON product_images(variant_id);
CREATE INDEX IF NOT EXISTS idx_price_tiers_product ON price_tiers(product_id);
CREATE INDEX IF NOT EXISTS idx_price_tiers_variant ON price_tiers(variant_id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_promotion_items_promo ON promotion_items(promotion_id);
