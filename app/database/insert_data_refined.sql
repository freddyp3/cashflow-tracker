-- =========================================================
-- PRODUCTS (catalog) — no combo product
-- =========================================================
INSERT INTO products (product_name, product_type, cost) VALUES
  ('National Geographic Penguin Shirt', 'Shirts', 55.80), -- id 1
  ('Furry Leopard Belt', 'Accessories', 19.15),           -- id 2
  ('Gunslinger Cheetah Belt', 'Accessories', 8.40),       -- id 3
  ('Death Note Shirt', 'Shirts', 68.90);                  -- id 4


-- =========================================================
-- Instagram (CAD) — Furry Leopard Belt
-- =========================================================
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('Instagram', 14.30, 40.00, 0, '4k.albert', 'Toronto, ON, CAN', FALSE, '2025-07-25', 'IG sale, paid with paypal')
RETURNING order_id \gset

INSERT INTO order_items (order_id, product_id, item_paid, item_size, note)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Furry Leopard Belt'), 5.01, NULL, NULL);


-- =========================================================
-- Grailed (USD) — Furry Leopard Belt
-- =========================================================
-- Will Mclaughlin IV
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 24.63, 38.07, 0, 'Will Mclaughlin IV', 'Mooresville, NC, USA', FALSE, '2025-08-04', 'shipping refund 36 CNY')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Furry Leopard Belt'), 3.57);

-- Quinton Bargallo
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 19.82, 38.03, 0, 'Quinton Bargallo', 'San Antonio, TX, USA', FALSE, '2025-08-27', 'belt used 20 CNY refunded')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Furry Leopard Belt'), 0.00);

-- Lucas Anthony
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 20.59, 38.08, 0, 'Lucas Anthony', 'Newport News, VA, USA', FALSE, '2025-08-15', 'belt used 11 CNY refunded')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Furry Leopard Belt'), 1.76);

-- Mike Lopez
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 27.44, 38.21, 0, 'Mike Lopez', 'Effort, PA, USA', FALSE, '2025-08-22', 'shipping refunded 44 CNY; used 18.3')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Furry Leopard Belt'), 3.10);

-- Leon Avosti
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 8.32, 51.12, 0, 'Leon Avosti', 'Losone, Ticino, CHE', FALSE, '2025-08-27', 'shipping refund 17 CNY')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Furry Leopard Belt'), 3.11);

-- Athian
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 11.19, 50.82, 0, 'Athian', 'Burpengary, Queensland, AU', FALSE, '2025-09-06', NULL)
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Furry Leopard Belt'), 3.47);

-- Matthew Marchese
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 20.74, 33.91, 0, 'Matthew Marchese', 'River Vale, NJ, USA', FALSE, '2025-09-13', 'belt used 20 CNY refunded')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Furry Leopard Belt'), 0.00);

-- Sebastian Banuelos Marrufo
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 21.66, 42.30, 0, 'Sebastian Banuelos Marrufo', 'Tulsa, OK, USA', FALSE, '2025-09-21', NULL)
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Furry Leopard Belt'), 3.00);

-- Sam Levine
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 22.11, 33.91, 0, 'Sam Levine', 'New York, NY, USA', FALSE, '2025-09-27', 'used 19 CNY refunded')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Furry Leopard Belt'), 0.00);

-- Richard Lawrence
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 27.59, 33.91, 0, 'Richard Lawrence', 'Dumont, NJ, USA', FALSE, '2025-09-29', 'used 17 CNY refunded')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Furry Leopard Belt'), 0.00);

-- Omar Quiroz
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 21.74, 32.19, 0, 'Omar Quiroz', 'Alliston, ON, CAN', FALSE, '2025-10-09', 'used 19 CNY refunded')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Furry Leopard Belt'), 0.00);

-- Hysheim Wardlaw
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 21.74, 46.62, 0, 'Hysheim Wardlaw', 'Anderson, SC, USA', FALSE, '2025-10-13', 'shipping refund 17 CNY')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Furry Leopard Belt'), 0.00);

-- Drew Perry
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 13.79, 50.87, 0, 'Drew Perry', 'Seagoville, TX, USA', FALSE, '2025-10-16', 'used refunded shipping idk how much, 4.95 CNY refunded')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Furry Leopard Belt'), 2.61);

-- Seokgyu Kim
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 13.79, 51.12, 0, 'Seokgyu Kim', 'Busan, Nam-gu, KOR', FALSE, '2025-10-17', 'shipping refund 21.78 CNY')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Furry Leopard Belt'), 3.32);


-- =========================================================
-- Grailed (USD) — Gunslinger Cheetah Belt
-- =========================================================
-- Rafael Orozco
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 21.70, 38.08, 0, 'Rafael Orozco', 'Norcross, GA, USA', FALSE, '2025-08-15', 'First')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Gunslinger Cheetah Belt'), 1.66);

-- Rodney Serrano
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 6.47, 33.76, 0, 'Rodney Serrano', 'Highland, CA, USA', FALSE, '2025-09-29', 'used 118.7 CNY + 22 CNY refunded; used 9.15 refunded')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Gunslinger Cheetah Belt'), 0.00);

-- Emmanuel
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 8.96, 25.31, 0, 'Emmanuel', 'Edmonton, AB, CAN', FALSE, '2025-09-23', 'used 10 CNY refunded (Fifth)')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Gunslinger Cheetah Belt'), 0.00);

-- Atg_ttf
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 20.75, 45.79, 0, 'Atg_ttf', 'Suwanee, GA, USA', FALSE, '2025-09-18', 'used 10 CNY refunded (Sixth)')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Gunslinger Cheetah Belt'), 0.00);

-- William McGee
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 24.25, 50.88, 0, 'William McGee', 'Aurora, CO, USA', FALSE, '2025-09-19', 'shipping refund 22 CNY (Seventh)')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Gunslinger Cheetah Belt'), 1.50);

-- Bryce Valls
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 24.14, 45.83, 0, 'Bryce Valls', 'East Williston, NY, USA', FALSE, '2025-09-30', 'shipping refund 28 CNY (Eighth)')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Gunslinger Cheetah Belt'), 0.00);

-- Victor Aguilar
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 24.08, 51.12, 0, 'Victor Aguilar', 'Chelsea, MA, USA', FALSE, '2025-09-30', 'shipping refund 22 CNY (Ninth)')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Gunslinger Cheetah Belt'), 0.00);


-- =========================================================
-- Grailed (USD) — Death Note Shirt
-- =========================================================
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 19.97, 42.19, 0, 'Simon Keays', 'Kanata, ON, CAN', FALSE, '2025-09-23', 'shipping refund ~56 CNY')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Death Note Shirt'), 10.83);


-- =========================================================
-- Grailed (USD) — National Geographic Penguin Shirt
-- =========================================================
-- Stevie Dotts
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 17.11, 62.22, 0, 'Stevie Dotts', 'Charlotte, MI, USA', FALSE, '2025-07-29', 'used 6 refunded')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 17.11);

-- Federico
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 23.05, 64.02, 0, 'Federico', 'Geneva, N/A, CHE', FALSE, '2025-08-20', 'shipping refund ~51 CNY')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 9.46);

-- Philipp Harig
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 11.22, 59.05, 0, 'Philipp Harig', 'Horath, RLP, DEU', FALSE, '2025-09-15', 'shipped from Canada')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 9.00);

-- Xander
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('GRAILED', 25.28, 55.16, 0, 'Xander', 'Munford, AL, USA', FALSE, '2025-09-07', 'shipping refund ~31 CNY')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 9.00);


-- =========================================================
-- In Person (CAD) — National Geographic Penguin Shirt (10 orders)
-- =========================================================
-- 2025-07-27
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('In Person', 3.44, 40.00, 0, 'N/A', 'Canada', FALSE, '2025-07-27', 'Sold in under a month')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.27);

-- 2025-07-28
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('In Person', 3.44, 40.00, 0, 'N/A', 'Canada', FALSE, '2025-07-28', 'Sold in under a month')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.27);

-- 2025-07-29
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('In Person', 3.44, 40.00, 0, 'N/A', 'Canada', FALSE, '2025-07-29', 'Sold in under a month')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.27);

-- 2025-07-30 (first)
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('In Person', 3.44, 40.00, 0, 'N/A', 'Canada', FALSE, '2025-07-30', 'Sold in under a month')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.27);

-- 2025-07-31
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('In Person', 3.44, 40.00, 0, 'N/A', 'Canada', FALSE, '2025-07-31', 'Sold in under a month')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.27);

-- 2025-07-30 (second)
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('In Person', 3.44, 40.00, 0, 'N/A', 'Canada', FALSE, '2025-07-30', 'Sold in under a month')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.27);

-- 2025-07-29 (second)
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('In Person', 3.44, 40.00, 0, 'N/A', 'Canada', FALSE, '2025-07-29', 'Sold in under a month')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.27);

-- 2025-07-28 (second)
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('In Person', 3.44, 40.00, 0, 'N/A', 'Canada', FALSE, '2025-07-28', 'Sold in under a month')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.27);

-- 2025-07-27 (second)
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('In Person', 3.44, 40.00, 0, 'N/A', 'Canada', FALSE, '2025-07-27', 'Sold in under a month')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.27);

-- 2025-07-26
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('In Person', 3.44, 40.00, 0, 'N/A', 'Canada', FALSE, '2025-07-26', 'Sold in under a month')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.27);


-- =========================================================
-- archivelol website (CAD)
-- =========================================================
-- Oskar Swerdlow — Penguin Shirt
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('archivelol website', 19.47, 70.78, 0, 'Oskar Swerdlow', 'Beacon Hill, NSW, AU', FALSE, '2025-06-07', 'First order! yipee')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.25);

-- Andreas Winther Klit — Penguin Shirt (Faroe Islands code FRO)
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('archivelol website', 16.72, 64.83, 0, 'Andreas Winther Klit', 'Tórshavn, Streymoy, FRO', FALSE, '2025-06-07', NULL)
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.25);

-- Sacha Cavaillon — Penguin Shirt (France)
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('archivelol website', 16.72, 64.83, 0, 'Sacha Cavaillon', 'Levallois-Perret, Île-de-France, FRA', FALSE, '2025-08-13', NULL)
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.25);

-- Davyd Shtepa — Penguin Shirt (UK)
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('archivelol website', 16.72, 64.83, 0, 'Davyd Shtepa', 'London, Greater London, ENG', FALSE, '2025-08-14', NULL)
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.25);

-- Michael Sanyaolu — Penguin Shirt (USA)
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('archivelol website', 16.72, 64.83, 0, 'Michael Sanyaolu', 'Charlotte, NC, USA', FALSE, '2025-08-15', NULL)
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.25);

-- Payton Jones — Penguin Shirt (USA)
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('archivelol website', 16.72, 64.83, 0, 'Payton Jones', 'Helena, AL, USA', FALSE, '2025-09-05', NULL)
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.25);

-- Kalayanee Mahathalaeng — ONE ORDER with TWO ITEMS (shirt + belt)
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('archivelol website', 26.55, 91.06, 0, 'Kalayanee Mahathalaeng', 'Bangkok, Bangkok Metropolitan Region, THA', FALSE, '2025-09-07', 'tshirt and belt')
RETURNING order_id \gset
-- item 1: shirt
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='National Geographic Penguin Shirt'), 13.54);
-- item 2: cheetah belt
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Gunslinger Cheetah Belt'), 2.04);

-- Marcus Skov Nielsen — Gunslinger Cheetah Belt (DNK)
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('archivelol website', 18.70, 45.42, 0, 'Marcus Skov Nielsen', 'Kastrup, Region Hovedstaden, DNK', FALSE, '2025-09-14', 'belt')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Gunslinger Cheetah Belt'), 2.33);

-- Oliver Baldwyn — Gunslinger Cheetah Belt (disputed / negative revenue)
INSERT INTO orders (platform, shipping, revenue, refunded, customer_name, shipping_location, disputed, order_date, note)
VALUES ('archivelol website', 16.72, -15.00, 0, 'Oliver Baldwyn', 'Poole, Dorset, ENG', TRUE, '2025-08-12', 'disputed')
RETURNING order_id \gset
INSERT INTO order_items (order_id, product_id, item_paid)
VALUES (:order_id, (SELECT product_id FROM products WHERE product_name='Gunslinger Cheetah Belt'), 13.25);