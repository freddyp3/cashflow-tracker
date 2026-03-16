-- ============================================================================
-- archivelol Database Schema
-- ============================================================================
-- E-commerce reselling business tracking system.
-- Products are sourced from suppliers (costs in CNY).
-- Orders are placed on various platforms (Instagram, GRAILED, In Person, website).
-- All order monetary values are stored in CAD (converted at entry time).
-- ============================================================================

-- Products table: catalog of items available for resale.
-- Each product has a unique name, category type, supplier cost (CNY), and stock count.
CREATE TABLE products (
    product_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    product_name varchar(50) NOT NULL UNIQUE,  -- unique display name (e.g. "National Geographic Penguin Shirt")
    product_type varchar(40),                  -- category grouping (e.g. "Shirts", "Accessories")
    cost NUMERIC(10, 2) NOT NULL,              -- supplier cost in CNY (Chinese Yuan)
    stock_quantity INT DEFAULT 0               -- current inventory count
);

-- Orders table: customer orders placed across different sales platforms.
-- All monetary values (shipping, revenue, refunded, refunded_used) are in CAD.
-- Disputed orders are excluded from analytics views.
CREATE TABLE orders (
    order_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    platform varchar(30) NOT NULL,             -- sales channel (e.g. "Instagram", "GRAILED", "In Person")
    shipping NUMERIC(10, 2) DEFAULT -1,        -- shipping cost in CAD; -1 = unknown/pending
    revenue NUMERIC(10, 2) DEFAULT 0,          -- total revenue received in CAD
    refunded NUMERIC(10, 2) DEFAULT 0,         -- amount refunded to customer in CAD
    refunded_used NUMERIC(10, 2) DEFAULT 0,    -- portion of refund that was reused/recouped
    customer_name varchar(200) DEFAULT 'TBD',  -- customer display name
    shipping_location varchar(200) DEFAULT 'TBD', -- format: "City, State, COUNTRY" (country extracted for filtering)
    disputed BOOLEAN NOT NULL DEFAULT FALSE,   -- disputed orders excluded from stats views
    draft BOOLEAN NOT NULL DEFAULT FALSE,       -- draft orders are incomplete and excluded from stats views
    order_date DATE,                           -- date order was placed
    delivered_date DATE,                       -- date order was delivered (for delivery time analysis)
    note TEXT DEFAULT NULL                     -- optional free-text note
);

-- Order items table: line items within an order, linking orders to products.
-- Each item tracks what the customer paid and the size variant.
-- Shipping and revenue are pro-rated across items in analytics views.
CREATE TABLE order_items (
    order_item_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    order_id int NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE, -- cascade delete when parent order is removed
    product_id int NOT NULL REFERENCES products(product_id),            -- which product this item is
    item_paid NUMERIC(10, 2) DEFAULT 0,        -- what customer paid for this specific item in CAD
    item_size varchar(200),                    -- size variant (e.g. "M", "L", "One Size")
    note TEXT DEFAULT NULL                     -- optional note about this line item
);

-- Personal hauls table: tracks personal clothing purchases and resale cash flows.
-- Separate from business orders. Primary key is a DB-generated timestamp.
CREATE TABLE personal_hauls (
    entry_time TIMESTAMPTZ PRIMARY KEY DEFAULT now(), -- auto-generated timestamp (not settable from app)
    flow_type varchar(10) NOT NULL,            -- "income" or "expense"
    amount NUMERIC(10, 2) NOT NULL,            -- dollar amount in CAD
    note TEXT DEFAULT NULL                     -- optional description
);
