CREATE TABLE products (
    product_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    product_name varchar(50) NOT NULL UNIQUE,
    product_type varchar(40),
    cost NUMERIC(8, 2) NOT NULL, 
    stock_quantity INT DEFAULT 0
);

CREATE TABLE sold_items (
--  name data_type constraints
    sale_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    platform varchar(30) NOT NULL,
    product_id int REFERENCES products(product_id) NOT NULL,
    item_paid NUMERIC(6, 2) DEFAULT -1,
    shipping NUMERIC(6, 2) DEFAULT -1,
    revenue NUMERIC(6, 2) DEFAULT 0,
    refunded NUMERIC(6, 2) DEFAULT 0,
    customer_name varchar(70) DEFAULT 'TBD',
    shipping_location varchar(100) DEFAULT 'TBD',
    disputed BOOLEAN NOT NULL DEFAULT FALSE, 
    order_date DATE,
    order_date_warehouse DATE, 
    delivered_date_warehouse DATE,
    shipped_date DATE, 
    delivered_date DATE,
    note TEXT
);
 
CREATE TABLE personal_hauls (
    entry_time TIMESTAMPTZ PRIMARY KEY DEFAULT now(),
    flow_type varchar(10) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    note TEXT
);

-- future: add a places unable to ship table