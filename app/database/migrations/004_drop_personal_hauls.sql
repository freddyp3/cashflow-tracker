-- 004: remove the personal hauls feature.
-- Drops the personal_hauls cash-flow table; haul tracking is replaced by
-- products with kind='personal' (see 005_product_kind.sql). Idempotent.

DROP TABLE IF EXISTS personal_hauls;
