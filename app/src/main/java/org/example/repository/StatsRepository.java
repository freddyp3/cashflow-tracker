package org.example.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * Repository for analytics queries using raw JDBC against PostgreSQL views.
 *
 * <p>Uses {@link JdbcTemplate} instead of JPA because the analytics views
 * ({@code vw_product_stats}, {@code vw_platform_stats}, etc.) don't map to
 * JPA entities. Returns results as {@code List<Map<String, Object>>} for
 * flexible JSON serialization.</p>
 *
 * <p>All country filters use {@code ILIKE} for case-insensitive matching against
 * the last segment of {@code shipping_location} (e.g. "Toronto, ON, Canada").</p>
 */
@Repository
public class StatsRepository {

    private final JdbcTemplate jdbc;

    public StatsRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ── Product Stats ──

    /** Aggregated product-level stats from the pre-computed {@code vw_product_stats} view. */
    public List<Map<String, Object>> getProductStats() {
        return jdbc.queryForList("SELECT * FROM vw_product_stats ORDER BY product_id");
    }

    /** Product stats filtered by country (ILIKE match on shipping_location). */
    public List<Map<String, Object>> getProductStatsByCountry(String country) {
        String sql = """
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
                   ROUND(SUM(b.shipping) / COUNT(*), 2) AS avg_shipping_per_unit,
                   ROUND(SUM(b.profit)/SUM(b.revenue), 2) AS product_profit_margin,
                   COUNT(*) AS units_sold
            FROM vw_product_base AS b
            WHERE b.shipping_location ILIKE '%' || ? || '%'
            GROUP BY 1, 2
            ORDER BY 1
            """;
        return jdbc.queryForList(sql, country);
    }

    // ── Platform Stats ──

    /** Aggregated platform-level stats from {@code vw_platform_stats}. */
    public List<Map<String, Object>> getPlatformStats() {
        return jdbc.queryForList("SELECT * FROM vw_platform_stats ORDER BY platform");
    }

    /** Platform stats filtered by country. Aggregates from {@code vw_base} with ILIKE filter. */
    public List<Map<String, Object>> getPlatformStatsByCountry(String country) {
        String sql = """
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
            WHERE b.shipping_location ILIKE '%' || ? || '%'
            GROUP BY b.platform
            ORDER BY b.platform
            """;
        return jdbc.queryForList(sql, country);
    }

    // ── Product by Platform Stats ──

    /**
     * Cross-tabulation of product stats by platform. Supports optional platform and country filters.
     * When country is provided, queries {@code vw_product_base} directly with dynamic SQL.
     */
    public List<Map<String, Object>> getProductByPlatformStats(String platform, String country) {
        StringBuilder sql = new StringBuilder("SELECT * FROM vw_product_by_platform_stats WHERE 1=1");
        java.util.List<Object> params = new java.util.ArrayList<>();

        if (platform != null) {
            sql.append(" AND platform = ?");
            params.add(platform);
        }

        if (country != null) {
            // Need to use the base query with country filter
            String filtered = """
                SELECT b.product_id, b.product_name, b.platform,
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
                WHERE b.shipping_location ILIKE '%' || ? || '%'
                """;
            params.clear();
            params.add(country);
            if (platform != null) {
                filtered += " AND b.platform = ?";
                params.add(platform);
            }
            filtered += " GROUP BY 1, 2, 3 ORDER BY 1, 3";
            return jdbc.queryForList(filtered, params.toArray());
        }

        sql.append(" ORDER BY product_id, platform");
        return jdbc.queryForList(sql.toString(), params.toArray());
    }

    // ── Time Series: Platform Month/Day ──

    /** Platform revenue/cost/profit grouped by month. Supports optional platform and country filters. */
    public List<Map<String, Object>> getPlatformMonth(String platform, String country) {
        StringBuilder sql = new StringBuilder();
        java.util.List<Object> params = new java.util.ArrayList<>();

        if (country != null) {
            sql.append("""
                SELECT b.platform,
                       DATE_TRUNC('month', b.order_date)::date AS month,
                       SUM(b.total_cost) AS month_cost,
                       SUM(b.revenue) AS month_revenue,
                       SUM(b.profit) AS month_profit,
                       SUM(b.item_count) AS month_units_sold
                FROM vw_base AS b
                WHERE b.shipping_location ILIKE '%' || ? || '%'
                """);
            params.add(country);
            if (platform != null) {
                sql.append(" AND b.platform = ?");
                params.add(platform);
            }
            sql.append(" GROUP BY 1, 2 ORDER BY 1, 2");
        } else {
            sql.append("SELECT * FROM vw_platform_month");
            if (platform != null) {
                sql.append(" WHERE platform = ?");
                params.add(platform);
            }
            sql.append(" ORDER BY platform, month");
        }
        return jdbc.queryForList(sql.toString(), params.toArray());
    }

    /** Platform revenue/cost/profit grouped by day. Supports optional platform and country filters. */
    public List<Map<String, Object>> getPlatformDay(String platform, String country) {
        StringBuilder sql = new StringBuilder();
        java.util.List<Object> params = new java.util.ArrayList<>();

        if (country != null) {
            sql.append("""
                SELECT b.platform,
                       DATE_TRUNC('day', b.order_date)::date AS day,
                       SUM(b.total_cost) AS day_cost,
                       SUM(b.revenue) AS day_revenue,
                       SUM(b.profit) AS day_profit,
                       SUM(b.item_count) AS day_units_sold
                FROM vw_base AS b
                WHERE b.shipping_location ILIKE '%' || ? || '%'
                """);
            params.add(country);
            if (platform != null) {
                sql.append(" AND b.platform = ?");
                params.add(platform);
            }
            sql.append(" GROUP BY 1, 2 ORDER BY 1, 2");
        } else {
            sql.append("SELECT * FROM vw_platform_day");
            if (platform != null) {
                sql.append(" WHERE platform = ?");
                params.add(platform);
            }
            sql.append(" ORDER BY platform, day");
        }
        return jdbc.queryForList(sql.toString(), params.toArray());
    }

    // ── Time Series: Product Month/Day ──

    /** Product revenue/cost/profit grouped by month. Supports optional productId and country filters. */
    public List<Map<String, Object>> getProductMonth(Integer productId, String country) {
        StringBuilder sql = new StringBuilder();
        java.util.List<Object> params = new java.util.ArrayList<>();

        if (country != null) {
            sql.append("""
                SELECT b.product_id, b.product_name,
                       DATE_TRUNC('month', b.order_date)::date AS month,
                       SUM(b.total_cost) AS month_cost,
                       SUM(b.revenue) AS month_revenue,
                       SUM(b.profit) AS month_profit,
                       COUNT(*) AS month_units_sold
                FROM vw_product_base AS b
                WHERE b.shipping_location ILIKE '%' || ? || '%'
                """);
            params.add(country);
            if (productId != null) {
                sql.append(" AND b.product_id = ?");
                params.add(productId);
            }
            sql.append(" GROUP BY 1, 2, 3 ORDER BY 1, 3");
        } else {
            sql.append("SELECT * FROM vw_product_month");
            if (productId != null) {
                sql.append(" WHERE product_id = ?");
                params.add(productId);
            }
            sql.append(" ORDER BY product_id, month");
        }
        return jdbc.queryForList(sql.toString(), params.toArray());
    }

    /** Product revenue/cost/profit grouped by day. Supports optional productId and country filters. */
    public List<Map<String, Object>> getProductDay(Integer productId, String country) {
        StringBuilder sql = new StringBuilder();
        java.util.List<Object> params = new java.util.ArrayList<>();

        if (country != null) {
            sql.append("""
                SELECT b.product_id, b.product_name,
                       DATE_TRUNC('day', b.order_date)::date AS day,
                       SUM(b.total_cost) AS day_cost,
                       SUM(b.revenue) AS day_revenue,
                       SUM(b.profit) AS day_profit,
                       COUNT(*) AS day_units_sold
                FROM vw_product_base AS b
                WHERE b.shipping_location ILIKE '%' || ? || '%'
                """);
            params.add(country);
            if (productId != null) {
                sql.append(" AND b.product_id = ?");
                params.add(productId);
            }
            sql.append(" GROUP BY 1, 2, 3 ORDER BY 1, 3");
        } else {
            sql.append("SELECT * FROM vw_product_day");
            if (productId != null) {
                sql.append(" WHERE product_id = ?");
                params.add(productId);
            }
            sql.append(" ORDER BY product_id, day");
        }
        return jdbc.queryForList(sql.toString(), params.toArray());
    }

    // ── Time Series: Product by Platform Month/Day ──

    /** Product-by-platform time series grouped by month. */
    public List<Map<String, Object>> getProductByPlatformMonth(String country) {
        if (country != null) {
            String sql = """
                SELECT b.product_id, b.product_name, b.platform,
                       DATE_TRUNC('month', b.order_date)::date AS month,
                       SUM(b.total_cost) AS month_cost,
                       SUM(b.revenue) AS month_revenue,
                       SUM(b.profit) AS month_profit,
                       COUNT(*) AS month_units_sold
                FROM vw_product_base AS b
                WHERE b.shipping_location ILIKE '%' || ? || '%'
                GROUP BY 1, 2, 3, 4 ORDER BY 1, 3, 4
                """;
            return jdbc.queryForList(sql, country);
        }
        return jdbc.queryForList("SELECT * FROM vw_product_by_platform_month ORDER BY product_id, platform, month");
    }

    /** Product-by-platform time series grouped by day. */
    public List<Map<String, Object>> getProductByPlatformDay(String country) {
        if (country != null) {
            String sql = """
                SELECT b.product_id, b.product_name, b.platform,
                       DATE_TRUNC('day', b.order_date)::date AS day,
                       SUM(b.total_cost) AS day_cost,
                       SUM(b.revenue) AS day_revenue,
                       SUM(b.profit) AS day_profit,
                       COUNT(*) AS day_units_sold
                FROM vw_product_base AS b
                WHERE b.shipping_location ILIKE '%' || ? || '%'
                GROUP BY 1, 2, 3, 4 ORDER BY 1, 3, 4
                """;
            return jdbc.queryForList(sql, country);
        }
        return jdbc.queryForList("SELECT * FROM vw_product_by_platform_day ORDER BY product_id, platform, day");
    }

    // ── Overall Time Series ──

    /** Overall monthly revenue/cost/profit across all platforms and products. Used by the home page chart. */
    public List<Map<String, Object>> getOverallMonth() {
        return jdbc.queryForList("""
            SELECT DATE_TRUNC('month', b.order_date)::date AS month,
                   SUM(b.total_cost) AS month_cost,
                   SUM(b.revenue) AS month_revenue,
                   SUM(b.profit) AS month_profit,
                   SUM(b.item_count) AS month_units_sold
            FROM vw_base AS b
            GROUP BY 1
            ORDER BY 1
            """);
    }

    // ── Meta (for filter dropdowns) ──

    /** Returns distinct platform names for frontend filter dropdowns. */
    public List<String> getDistinctPlatforms() {
        return jdbc.queryForList(
            "SELECT DISTINCT platform FROM orders ORDER BY platform",
            String.class
        );
    }

    /** Extracts distinct country names from the last segment of shipping_location (split by comma). */
    public List<String> getDistinctCountries() {
        return jdbc.queryForList(
            """
            SELECT DISTINCT TRIM(SPLIT_PART(shipping_location, ', ',
                ARRAY_LENGTH(STRING_TO_ARRAY(shipping_location, ', '), 1))) AS country
            FROM orders
            WHERE shipping_location != 'TBD'
            ORDER BY country
            """,
            String.class
        );
    }
}
