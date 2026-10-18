-- 003: order coordinates + canonical platform values.
-- Adds orders.latitude / orders.longitude (WGS-84 coordinates of
-- shipping_location, geocoded on save, NULL when unknown) and rewrites
-- legacy platform values to their canonical spellings. Idempotent.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS latitude  NUMERIC(9, 6);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS longitude NUMERIC(9, 6);
UPDATE orders SET platform = 'Grailed' WHERE platform = 'GRAILED';
UPDATE orders SET platform = 'Website' WHERE platform = 'archivelol website';
