-- Benchmark seed: synthetic, deterministic (setseed), idempotent.
-- 40 products, 20 000 orders across 8 platforms/2025 dates/60 locations,
-- ~50 000 order_items with item_paid splitting order revenue.

SELECT setseed(0.42);

TRUNCATE order_items, orders, products RESTART IDENTITY CASCADE;

INSERT INTO products (product_name, product_type, cost, stock_quantity)
SELECT 'Bench Product ' || i,
       (ARRAY['Shirts','Jackets','Accessories','Shoes'])[1 + (i % 4)],
       50 + (i % 8) * 50,
       1000
FROM generate_series(1, 40) AS i;

INSERT INTO orders (platform, shipping, revenue, refunded, refunded_used,
                    customer_name, shipping_location, disputed, draft, order_date)
SELECT (ARRAY['Grailed','Depop','eBay','Instagram','In Person',
              'Facebook Marketplace','Website','Other'])[1 + (i % 8)],
       i % 31,
       20 + (i % 381),
       0,
       0,
       'Customer ' || i,
       'City' || (i % 60) || ', ST, Country' || (i % 12),
       (i % 100) < 2,
       (i % 100) IN (2, 3),
       DATE '2025-01-01' + (i % 365)
FROM generate_series(1, 20000) AS i;

INSERT INTO order_items (order_id, product_id, item_paid, item_size, note)
SELECT o.order_id,
       1 + ((o.order_id + n.n) % 40),
       ROUND(o.revenue / (o.order_id % 4 + 1), 2),
       (ARRAY['XS','S','M','L','XL'])[1 + ((o.order_id + n.n) % 5)],
       NULL
FROM orders AS o
JOIN LATERAL generate_series(1, o.order_id % 4 + 1) AS n ON true;
