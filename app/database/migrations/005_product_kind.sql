-- 005: two kinds of products: 'business' (resale stock) and 'personal'
-- (one-off sales of the owner's own items). Personal products and orders
-- containing them are excluded from the analytics views.
-- After applying on an existing DB, re-run create_views.sql so the views
-- pick up the personal-order exclusion. Idempotent.

ALTER TABLE products ADD COLUMN IF NOT EXISTS kind varchar(10) NOT NULL DEFAULT 'business';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_kind_chk') THEN
        ALTER TABLE products
            ADD CONSTRAINT products_kind_chk CHECK (kind IN ('business', 'personal'));
    END IF;
END $$;
