-- 002: external order identity.
-- Adds orders.external_ref (marketplace order number, NULL for manual orders)
-- and a unique (platform, external_ref) index. Idempotent.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_ref varchar(100);
CREATE UNIQUE INDEX IF NOT EXISTS orders_platform_external_ref_uq ON orders (platform, external_ref);
