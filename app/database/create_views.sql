DROP VIEW IF EXISTS platform_product_sales;

CREATE OR REPLACE VIEW vw_product_summary AS
SELECT p.product_id, 
       p.product_name, 
       -- GRAILED stats
       COUNT(oi.order_item_id) FILTER (WHERE o.platform = 'GRAILED') AS grailed_sales,
       -(SUM(oi.item_paid) FILTER (WHERE o.platform = 'GRAILED')) AS grailed_product_cost,
       -(SUM(o.shipping) FILTER (WHERE o.platform = 'GRAILED')) AS grailed_shipping_cost,
       SUM(o.revenue) FILTER (WHERE o.platform = 'GRAILED') AS grailed_revenue,
       (SUM(o.revenue) FILTER (WHERE o.platform = 'GRAILED') 
       + -(SUM(oi.item_paid) FILTER (WHERE o.platform = 'GRAILED')) 
       + -(SUM(o.shipping) FILTER (WHERE o.platform = 'GRAILED'))) AS grailed_profit,
       ROUND(((SUM(o.revenue) FILTER (WHERE o.platform = 'GRAILED') 
       + -(SUM(oi.item_paid) FILTER (WHERE o.platform = 'GRAILED')) 
       + -(SUM(o.shipping) FILTER (WHERE o.platform = 'GRAILED')))
       / (SUM(o.revenue) FILTER (WHERE o.platform = 'GRAILED'))) * 100, 2) AS grailed_profit_margin,
       -- Instagram stats
       COUNT(oi.order_item_id) FILTER (WHERE o.platform = 'Instagram') AS instagram_sales,
       -(SUM(oi.item_paid) FILTER (WHERE o.platform = 'Instagram')) AS instagram_product_cost,
       -(SUM(o.shipping) FILTER (WHERE o.platform = 'Instagram')) AS instagram_shipping_cost,
       SUM(o.revenue) FILTER (WHERE o.platform = 'Instagram') AS instagram_revenue,
       (SUM(o.revenue) FILTER (WHERE o.platform = 'Instagram') 
       + -(SUM(oi.item_paid) FILTER (WHERE o.platform = 'Instagram')) 
       + -(SUM(o.shipping) FILTER (WHERE o.platform = 'Instagram'))) AS instagram_profit,
       ROUND(((SUM(o.revenue) FILTER (WHERE o.platform = 'Instagram') 
       + -(SUM(oi.item_paid) FILTER (WHERE o.platform = 'Instagram')) 
       + -(SUM(o.shipping) FILTER (WHERE o.platform = 'Instagram')))
       / (SUM(o.revenue) FILTER (WHERE o.platform = 'Instagram'))) * 100, 2) AS instagram_profit_margin,
       -- archivelol website stats
       COUNT(oi.order_item_id) FILTER (WHERE o.platform = 'archivelol website') AS website_sales,
       -(SUM(oi.item_paid) FILTER (WHERE o.platform = 'archivelol website')) AS website_product_cost,
       -(SUM(o.shipping) FILTER (WHERE o.platform = 'archivelol website')) AS website_shipping_cost,
       SUM(o.revenue) FILTER (WHERE o.platform = 'archivelol website') AS website_revenue,
       (SUM(o.revenue) FILTER (WHERE o.platform = 'archivelol website') 
       + -(SUM(oi.item_paid) FILTER (WHERE o.platform = 'archivelol website')) 
       + -(SUM(o.shipping) FILTER (WHERE o.platform = 'archivelol website'))) AS website_profit,
       ROUND(((SUM(o.revenue) FILTER (WHERE o.platform = 'archivelol website') 
       + -(SUM(oi.item_paid) FILTER (WHERE o.platform = 'archivelol website')) 
       + -(SUM(o.shipping) FILTER (WHERE o.platform = 'archivelol website')))
       / (SUM(o.revenue) FILTER (WHERE o.platform = 'archivelol website'))) * 100, 2) AS website_profit_margin,
       -- In Person stats
       COUNT(oi.order_item_id) FILTER (WHERE o.platform = 'In Person') AS inperson_sales,
       -(SUM(oi.item_paid) FILTER (WHERE o.platform = 'In Person')) AS inperson_product_cost,
       -(SUM(o.shipping) FILTER (WHERE o.platform = 'In Person')) AS inperson_shipping_cost,
       SUM(o.revenue) FILTER (WHERE o.platform = 'In Person') AS inperson_revenue,
       (SUM(o.revenue) FILTER (WHERE o.platform = 'In Person') 
       + -(SUM(oi.item_paid) FILTER (WHERE o.platform = 'In Person')) 
       + -(SUM(o.shipping) FILTER (WHERE o.platform = 'In Person'))) AS inperson_profit,
       ROUND(((SUM(o.revenue) FILTER (WHERE o.platform = 'In Person') 
       + -(SUM(oi.item_paid) FILTER (WHERE o.platform = 'In Person')) 
       + -(SUM(o.shipping) FILTER (WHERE o.platform = 'In Person')))
       / (SUM(o.revenue) FILTER (WHERE o.platform = 'In Person'))) * 100, 2) AS inperson_profit_margin,
       -- total units sold stats and refunded
       COUNT(oi.order_item_id) AS total_units_sold,
       -(SUM(oi.item_paid)) AS total_product_cost,
       -(SUM(o.shipping)) AS total_shipping_cost,
       SUM(o.revenue) AS total_revenue,
       (SUM(o.revenue)  + -(SUM(oi.item_paid)) + -(SUM(o.shipping))) AS total_profit,
       ROUND(((SUM(o.revenue) + -(SUM(oi.item_paid)) + -(SUM(o.shipping)))
       / SUM(o.revenue)) * 100, 2) AS total_profit_margin
    FROM order_items AS oi
    JOIN products AS p ON p.product_id = oi.product_id
    JOIN orders AS o ON o.order_id = oi.order_id
    GROUP BY 
        p.product_id, p.product_name;

CREATE OR REPLACE VIEW vw_refund_summary AS
SELECT o.platform, 
       SUM(o.refunded) AS total_refunded,
       -(SUM(o.refunded_used)) AS total_refunded_used,
       (SUM(o.refunded) - SUM(o.refunded_used)) AS total_refunded_left
    FROM orders AS o
    GROUP BY
        o.platform;

CREATE OR REPLACE VIEW vw_total_summary AS
SELECT SUM(o.refunded) AS total_refunded,
       -(SUM(o.refunded_used)) AS total_refunded_used,
       (SUM(o.refunded) - SUM(o.refunded_used)) AS total_refunded_left,
       COUNT(oi.order_item_id) AS total_units_sold,
       -(SUM(oi.item_paid)) AS total_product_cost,
       -(SUM(o.shipping)) AS total_shipping_cost,
       SUM(o.revenue) AS total_revenue,
       (SUM(o.revenue)  + -(SUM(oi.item_paid)) + -(SUM(o.shipping))) AS total_profit,
       ROUND(((SUM(o.revenue) + -(SUM(oi.item_paid)) + -(SUM(o.shipping)))
       / SUM(o.revenue)) * 100, 2) AS total_profit_margin
    FROM order_items AS oi
    JOIN orders AS o ON o.order_id = oi.order_id;

CREATE OR REPLACE VIEW vw_platform_average AS
SELECT o.platform,
       ROUND(SUM(o.revenue) / COUNT(oi.order_id), 2) AS avg_rev,
       ROUND(SUM(o.shipping)/ COUNT(oi.order_id), 2) AS avg_ship,
       ROUND((SUM(o.revenue) - SUM(o.shipping) - SUM(oi.item_paid))
       / COUNT(oi.order_id), 2) AS avg_profit,
       ROUND(SUM(o.refunded)/ COUNT(oi.order_id), 2) AS avg_refunded,
       ROUND(SUM(o.refunded_used)/ COUNT(oi.order_id), 2) AS avg_refunded_used
    FROM order_items AS oi
    JOIN orders AS o ON o.order_id = oi.order_id
    JOIN products AS p ON p.product_id = oi.product_id
    GROUP BY o.platform;

CREATE OR REPLACE VIEW vw_product_average AS
SELECT oi.product_id, 
       p.product_name,
       ROUND(SUM(o.revenue) / COUNT(oi.order_id), 2) AS avg_rev,
       ROUND(SUM(o.shipping)/ COUNT(oi.order_id), 2) AS avg_ship,
       ROUND((SUM(o.revenue) - SUM(o.shipping) - SUM(oi.item_paid))
       / COUNT(oi.order_id), 2) AS avg_profit,
       ROUND(SUM(o.refunded)/ COUNT(oi.order_id), 2) AS avg_refunded,
       ROUND(SUM(o.refunded_used)/ COUNT(oi.order_id), 2) AS avg_refunded_used
    FROM order_items AS oi
    JOIN orders AS o ON o.order_id = oi.order_id
    JOIN products AS p ON p.product_id = oi.product_id
    GROUP BY oi.product_id, p.product_name;
