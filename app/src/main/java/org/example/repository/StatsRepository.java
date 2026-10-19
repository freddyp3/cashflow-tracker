package org.example.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
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

    private static final String COUNTRY_FILTER = " WHERE b.shipping_location ILIKE '%' || ? || '%'";

    /** Aggregate columns for product-level groupings over {@code vw_product_base} (one row per sold item). */
    private static final String PRODUCT_AGGREGATES = """
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
            COUNT(*) AS units_sold""";

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
        return jdbc.queryForList(
            "SELECT b.product_id, b.product_name, " + PRODUCT_AGGREGATES
                + " FROM vw_product_base AS b" + COUNTRY_FILTER
                + " GROUP BY 1, 2 ORDER BY 1",
            country);
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
            """ + COUNTRY_FILTER + " GROUP BY b.platform ORDER BY b.platform";
        return jdbc.queryForList(sql, country);
    }

    // ── Product by Platform Stats ──

    /**
     * Cross-tabulation of product stats by platform. Supports optional platform and country filters.
     * When country is provided, queries {@code vw_product_base} directly with dynamic SQL.
     */
    public List<Map<String, Object>> getProductByPlatformStats(String platform, String country) {
        if (country != null) {
            String sql = "SELECT b.product_id, b.product_name, b.platform, " + PRODUCT_AGGREGATES
                    + " FROM vw_product_base AS b" + COUNTRY_FILTER;
            List<Object> params = new ArrayList<>();
            params.add(country);
            if (platform != null) {
                sql += " AND b.platform = ?";
                params.add(platform);
            }
            sql += " GROUP BY 1, 2, 3 ORDER BY 1, 3";
            return jdbc.queryForList(sql, params.toArray());
        }

        String sql = "SELECT * FROM vw_product_by_platform_stats WHERE 1=1";
        List<Object> params = new ArrayList<>();
        if (platform != null) {
            sql += " AND platform = ?";
            params.add(platform);
        }
        sql += " ORDER BY product_id, platform";
        return jdbc.queryForList(sql, params.toArray());
    }

    // ── Time Series ──

    /**
     * One family of time-series views. {@code viewOrderBy} is a format string whose
     * single {@code %s} is the period column.
     */
    private record Series(String viewPrefix, String baseView, String entityColumns, String unitsExpr,
                          String filterColumn, String groupBy, String liveOrderBy, String viewOrderBy) {}

    private static final Series PLATFORM = new Series("vw_platform_", "vw_base", "b.platform",
            "SUM(b.item_count)", "platform", "1, 2", "1, 2", "platform, %s");
    private static final Series PRODUCT = new Series("vw_product_", "vw_product_base", "b.product_id, b.product_name",
            "COUNT(*)", "product_id", "1, 2, 3", "1, 3", "product_id, %s");
    private static final Series PRODUCT_BY_PLATFORM = new Series("vw_product_by_platform_", "vw_product_base",
            "b.product_id, b.product_name, b.platform", "COUNT(*)", null, "1, 2, 3, 4", "1, 3, 4", "product_id, platform, %s");

    /**
     * Revenue/cost/profit/units for {@code series} bucketed by {@code period} ("month" or "day").
     * Without a country filter reads the pre-computed {@code vw_<series>_<period>} view; with one,
     * aggregates the base view live. {@code filterValue} (platform or product id) is optional.
     */
    private List<Map<String, Object>> timeSeries(Series s, String period, Object filterValue, String country) {
        StringBuilder sql = new StringBuilder();
        List<Object> params = new ArrayList<>();
        if (country != null) {
            sql.append("SELECT ").append(s.entityColumns())
               .append(", DATE_TRUNC('").append(period).append("', b.order_date)::date AS ").append(period)
               .append(", SUM(b.total_cost) AS ").append(period).append("_cost")
               .append(", SUM(b.revenue) AS ").append(period).append("_revenue")
               .append(", SUM(b.profit) AS ").append(period).append("_profit")
               .append(", ").append(s.unitsExpr()).append(" AS ").append(period).append("_units_sold")
               .append(" FROM ").append(s.baseView()).append(" AS b").append(COUNTRY_FILTER);
            params.add(country);
            if (filterValue != null) {
                sql.append(" AND b.").append(s.filterColumn()).append(" = ?");
                params.add(filterValue);
            }
            sql.append(" GROUP BY ").append(s.groupBy()).append(" ORDER BY ").append(s.liveOrderBy());
        } else {
            sql.append("SELECT * FROM ").append(s.viewPrefix()).append(period);
            if (filterValue != null) {
                sql.append(" WHERE ").append(s.filterColumn()).append(" = ?");
                params.add(filterValue);
            }
            sql.append(" ORDER BY ").append(s.viewOrderBy().formatted(period));
        }
        return jdbc.queryForList(sql.toString(), params.toArray());
    }

    /** Platform revenue/cost/profit grouped by month. Supports optional platform and country filters. */
    public List<Map<String, Object>> getPlatformMonth(String platform, String country) {
        return timeSeries(PLATFORM, "month", platform, country);
    }

    /** Platform revenue/cost/profit grouped by day. Supports optional platform and country filters. */
    public List<Map<String, Object>> getPlatformDay(String platform, String country) {
        return timeSeries(PLATFORM, "day", platform, country);
    }

    /** Product revenue/cost/profit grouped by month. Supports optional productId and country filters. */
    public List<Map<String, Object>> getProductMonth(Integer productId, String country) {
        return timeSeries(PRODUCT, "month", productId, country);
    }

    /** Product revenue/cost/profit grouped by day. Supports optional productId and country filters. */
    public List<Map<String, Object>> getProductDay(Integer productId, String country) {
        return timeSeries(PRODUCT, "day", productId, country);
    }

    /** Product-by-platform time series grouped by month. */
    public List<Map<String, Object>> getProductByPlatformMonth(String country) {
        return timeSeries(PRODUCT_BY_PLATFORM, "month", null, country);
    }

    /** Product-by-platform time series grouped by day. */
    public List<Map<String, Object>> getProductByPlatformDay(String country) {
        return timeSeries(PRODUCT_BY_PLATFORM, "day", null, country);
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
