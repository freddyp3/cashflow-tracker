CREATE TABLE products (
    product_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    product_name varchar(50) NOT NULL UNIQUE,
    product_type varchar(40),
    cost NUMERIC(10, 2) NOT NULL, 
    stock_quantity INT DEFAULT 0 
);

CREATE TABLE orders (
--  name data_type constraints
    order_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    platform varchar(30) NOT NULL,
    shipping NUMERIC(10, 2) DEFAULT -1,
    revenue NUMERIC(10, 2) DEFAULT 0,
    refunded NUMERIC(10, 2) DEFAULT 0,
    refunded_used NUMERIC(10, 2) DEFAULT 0,
    customer_name varchar(200) DEFAULT 'TBD',
    shipping_location varchar(200) DEFAULT 'TBD',
    disputed BOOLEAN NOT NULL DEFAULT FALSE, 
    order_date DATE, -- order_date and delivered_date mainly to calculate average overall time to customer
    delivered_date DATE,
    note TEXT DEFAULT NULL
);

CREATE TABLE order_items (
    order_item_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    order_id int NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE, -- deletes all children if order_id (parent) is deleted
    product_id int NOT NULL REFERENCES products(product_id),
    item_paid NUMERIC(10, 2) DEFAULT 0,
    item_size varchar(200),
    note TEXT DEFAULT NULL
);

CREATE TABLE personal_hauls (
    entry_time TIMESTAMPTZ PRIMARY KEY DEFAULT now(),
    flow_type varchar(10) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    note TEXT DEFAULT NULL
); -- refunded used = 129.54

-- future: add a places unable to ship table