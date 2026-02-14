CREATE OR REPLACE VIEW vw_counts AS
SELECT order_id, 
	   COUNT(*) AS item_count
FROM order_items
GROUP BY order_id;

CREATE OR REPLACE VIEW vw_base AS
SELECT o.order_id,
	   c.item_count,
	   o.platform,
	   o.shipping, 
	   SUM(oi.item_paid) AS items_cost, 
	   o.shipping + SUM(oi.item_paid) AS total_cost,
	   o.revenue,
	   o.revenue - (o.shipping + SUM(oi.item_paid)) AS profit,
	   o.refunded, 
	   o.refunded_used,
	   o.refunded - o.refunded_used AS net_refund,
	   o.customer_name,
	   o.shipping_location,
	   o.order_date, 
       ROUND((o.revenue - (o.shipping + SUM(oi.item_paid))) / o.revenue, 2) AS profit_margin
FROM orders AS o
JOIN order_items AS oi ON o.order_id = oi.order_id
JOIN vw_counts AS c ON o.order_id = c.order_id
WHERE o.disputed = FALSE
GROUP BY o.order_id,
         c.item_count,
         o.platform,
         o.shipping,
         o.revenue,
         o.refunded,
         o.refunded_used,
         o.customer_name,
         o.shipping_location,
         o.order_date;

CREATE OR REPLACE VIEW vw_product_base AS
SELECT p.product_id,
	   p.product_type,
	   p.product_name,
	   oi.item_paid,
	   ROUND(o.shipping / c.item_count, 2) AS shipping,
	   ROUND(o.revenue  / c.item_count, 2) AS revenue,
	   ROUND(oi.item_paid + (o.shipping / c.item_count), 2) AS total_cost,
	   ROUND((o.revenue / c.item_count) - (oi.item_paid + (o.shipping / c.item_count)), 2) AS profit,
	   ROUND(o.refunded / c.item_count, 2) AS refunded, 
	   ROUND(o.refunded_used / c.item_count, 2) AS refunded_used,
	   ROUND((o.refunded - o.refunded_used) / c.item_count, 2) AS net_refund,
	   p.cost AS item_cost_yuan,
       o.platform,
       o.order_date
FROM orders AS o
JOIN order_items AS oi ON o.order_id = oi.order_id
JOIN vw_counts AS c ON o.order_id = c.order_id
JOIN products AS p ON oi.product_id = p.product_id  
WHERE o.disputed = FALSE;

CREATE OR REPLACE VIEW vw_product_stats AS
SELECT b.product_id,
	   b.product_name,
	   SUM(b.shipping) AS product_total_shipping,
	   SUM(b.item_paid) AS item_total_cost,
	   SUM(b.total_cost) AS product_total_cost,
	   SUM(b.revenue) AS product_total_revenue,
	   SUM(b.profit) AS product_total_profit,
	   SUM(b.refunded) AS product_total_refunded,
	   SUM(b.refunded_used) AS product_total_refunded_used,
	   SUM(b.net_refund) AS product_net_refund,
	   ROUND(SUM(b.item_paid) / COUNT(*), 2) AS avg_item_cost,
	   ROUND(SUM(b.revenue) / COUNT(*), 2) AS avg_product_revenue,
	   ROUND(SUM(b.profit) / COUNT(*), 2) AS avg_product_profit,
   	   ROUND(SUM(b.shipping) / COUNT(*), 2) AS avg_shipping_per_unit, -- nat geo avg skewed because 10 sold in person
	   ROUND(SUM(b.profit)/SUM(b.revenue), 2) AS product_profit_margin,
	   COUNT(*) AS units_sold
FROM vw_product_base AS b
GROUP BY 1, 2;

CREATE OR REPLACE VIEW vw_platform_stats AS
SELECT b.platform,
	   SUM(b.shipping) AS platform_shipping,
	   SUM(b.total_cost) AS platform_total_cost,
	   SUM(b.revenue) AS platform_revenue,
	   SUM(b.profit) AS platform_profit,
	   SUM(b.refunded) AS platform_refunded,
	   SUM(b.refunded_used) AS platform_refunded_used,
	   SUM(b.net_refund) AS platform_net_refund,
	   SUM(b.item_count) AS units_sold, 
	   ROUND(SUM(b.revenue) / SUM(b.item_count), 2) AS avg_platform_revenue,
	   ROUND(SUM(b.profit) / SUM(b.item_count), 2) AS avg_platform_profit,
   	   ROUND(SUM(b.shipping) / SUM(b.item_count), 2) AS avg_shipping_per_unit,
	   ROUND(SUM(b.profit)/SUM(b.revenue), 2) AS platform_profit_margin
FROM vw_base AS b
GROUP BY b.platform;

CREATE OR REPLACE VIEW vw_product_by_platform_stats AS
SELECT b.product_id,
	   b.product_name,
	   b.platform,
	   SUM(b.shipping) AS product_total_shipping,
	   SUM(b.item_paid) AS item_total_cost,
	   SUM(b.total_cost) AS product_total_cost,
	   SUM(b.revenue) AS product_total_revenue,
	   SUM(b.profit) AS product_total_profit,
	   SUM(b.refunded) AS product_total_refunded,
	   SUM(b.refunded_used) AS product_total_refunded_used,
	   SUM(b.net_refund) AS product_net_refund,
	   ROUND(SUM(b.item_paid) / COUNT(*), 2) AS avg_item_cost,
	   ROUND(SUM(b.revenue) / COUNT(*), 2) AS avg_product_revenue,
	   ROUND(SUM(b.profit) / COUNT(*), 2) AS avg_product_profit,
   	   ROUND(SUM(b.shipping) / COUNT(*), 2) AS avg_shipping_per_unit,
	   ROUND(SUM(b.profit)/SUM(b.revenue), 2) AS product_profit_margin,
	   COUNT(*) AS units_sold 
FROM vw_product_base AS b
GROUP BY 1, 2, 3;

-- Views for graphs

CREATE OR REPLACE VIEW vw_platform_month AS
SELECT b.platform,
	   DATE_TRUNC('month', b.order_date)::date AS month,
	   SUM(b.total_cost) AS month_cost,
	   SUM(b.revenue) AS month_revenue,
	   SUM(b.profit) AS month_profit,
	   SUM(b.item_count) AS month_units_sold
FROM vw_base AS b
GROUP BY 1, 2;

CREATE OR REPLACE VIEW vw_product_month AS
SELECT b.product_id,
       b.product_name,
	   DATE_TRUNC('month', b.order_date)::date AS month,
	   SUM(b.total_cost) AS month_cost,
	   SUM(b.revenue) AS month_revenue,
	   SUM(b.profit) AS month_profit,
	   COUNT(*) AS month_units_sold 
FROM vw_product_base AS b
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW vw_product_by_platform_month AS
SELECT b.product_id,
       b.product_name,
       b.platform,
	   DATE_TRUNC('month', b.order_date)::date AS month,
	   SUM(b.total_cost) AS month_cost,
	   SUM(b.revenue) AS month_revenue,
	   SUM(b.profit) AS month_profit,
	   COUNT(*) AS month_units_sold 
FROM vw_product_base AS b
GROUP BY 1, 2, 3, 4;

CREATE OR REPLACE VIEW vw_platform_day AS
SELECT b.platform,
	   DATE_TRUNC('day', b.order_date)::date AS day,
	   SUM(b.total_cost) AS day_cost,
	   SUM(b.revenue) AS day_revenue,
	   SUM(b.profit) AS day_profit,
	   SUM(b.item_count) AS day_units_sold
FROM vw_base AS b
GROUP BY 1, 2;

CREATE OR REPLACE VIEW vw_product_day AS
SELECT b.product_id,
       b.product_name,
	   DATE_TRUNC('day', b.order_date)::date AS day,
	   SUM(b.total_cost) AS day_cost,
	   SUM(b.revenue) AS day_revenue,
	   SUM(b.profit) AS day_profit,
	   COUNT(*) AS day_units_sold 
FROM vw_product_base AS b
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW vw_product_by_platform_day AS
SELECT b.product_id,
       b.product_name,
       b.platform,
	   DATE_TRUNC('day', b.order_date)::date AS day,
	   SUM(b.total_cost) AS day_cost,
	   SUM(b.revenue) AS day_revenue,
	   SUM(b.profit) AS day_profit,
	   COUNT(*) AS day_units_sold 
FROM vw_product_base AS b
GROUP BY 1, 2, 3, 4;