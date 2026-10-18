package org.example.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.example.AbstractPostgresIT;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration test exercising every analytics view in
 * {@code app/database/create_views.sql} through {@link StatsRepository}
 * against a real PostgreSQL container.
 *
 * <p>Synthetic seed data: 2 products, 2 valid orders across 2 platforms and
 * 2 countries, plus 1 disputed and 1 draft order (both revenue 999) that must
 * be excluded from every view.</p>
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class StatsViewsIT extends AbstractPostgresIT {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private StatsRepository stats;

    @BeforeAll
    void seed() {
        jdbc.update("INSERT INTO products (product_name, product_type, cost, stock_quantity) VALUES (?, ?, ?, ?)",
                "Penguin Shirt", "Shirts", new BigDecimal("50"), 1);
        jdbc.update("INSERT INTO products (product_name, product_type, cost, stock_quantity) VALUES (?, ?, ?, ?)",
                "Tiger Hoodie", "Hoodies", new BigDecimal("80"), 1);

        jdbc.update("INSERT INTO orders (platform, shipping, revenue, shipping_location, order_date) VALUES (?, ?, ?, ?, ?)",
                "Grailed", new BigDecimal("10"), new BigDecimal("100"), "Toronto, ON, Canada", java.sql.Date.valueOf("2024-01-15"));
        jdbc.update("INSERT INTO order_items (order_id, product_id, item_paid) VALUES (?, ?, ?)",
                1, 1, new BigDecimal("50"));

        jdbc.update("INSERT INTO orders (platform, shipping, revenue, shipping_location, order_date) VALUES (?, ?, ?, ?, ?)",
                "Depop", new BigDecimal("5"), new BigDecimal("60"), "New York, NY, USA", java.sql.Date.valueOf("2024-01-20"));
        jdbc.update("INSERT INTO order_items (order_id, product_id, item_paid) VALUES (?, ?, ?)",
                2, 2, new BigDecimal("80"));

        jdbc.update("INSERT INTO orders (platform, shipping, revenue, shipping_location, disputed, order_date) VALUES (?, ?, ?, ?, ?, ?)",
                "Grailed", BigDecimal.ZERO, new BigDecimal("999"), "Toronto, ON, Canada", true, java.sql.Date.valueOf("2024-01-25"));
        jdbc.update("INSERT INTO order_items (order_id, product_id, item_paid) VALUES (?, ?, ?)",
                3, 1, new BigDecimal("999"));

        jdbc.update("INSERT INTO orders (platform, shipping, revenue, shipping_location, draft, order_date) VALUES (?, ?, ?, ?, ?, ?)",
                "Depop", BigDecimal.ZERO, new BigDecimal("999"), "New York, NY, USA", true, java.sql.Date.valueOf("2024-01-26"));
        jdbc.update("INSERT INTO order_items (order_id, product_id, item_paid) VALUES (?, ?, ?)",
                4, 2, new BigDecimal("999"));
    }

    private static void assertMoneyEquals(String expected, Object actual) {
        assertEquals(0, new BigDecimal(expected).compareTo((BigDecimal) actual),
                "expected " + expected + " but was " + actual);
    }

    private static void assertNo999Revenue(List<Map<String, Object>> rows) {
        for (Map<String, Object> row : rows) {
            for (Map.Entry<String, Object> e : row.entrySet()) {
                if (e.getKey().contains("revenue") && e.getValue() instanceof BigDecimal bd) {
                    assertTrue(bd.compareTo(new BigDecimal("999")) != 0,
                            "disputed/draft revenue leaked into " + e.getKey());
                }
            }
        }
    }

    @Test
    void getProductStats() {
        List<Map<String, Object>> rows = stats.getProductStats();
        assertFalse(rows.isEmpty());
        assertNo999Revenue(rows);
    }

    @Test
    void getProductStatsByCountry() {
        List<Map<String, Object>> rows = stats.getProductStatsByCountry("Canada");
        assertFalse(rows.isEmpty());
        assertNo999Revenue(rows);
    }

    @Test
    void getPlatformStats() {
        List<Map<String, Object>> rows = stats.getPlatformStats();
        assertFalse(rows.isEmpty());
        assertNo999Revenue(rows);
        Map<String, Object> grailed = rows.stream()
                .filter(r -> "Grailed".equals(r.get("platform")))
                .findFirst().orElseThrow();
        assertMoneyEquals("100", grailed.get("platform_revenue"));
        assertMoneyEquals("40", grailed.get("platform_profit"));
    }

    @Test
    void getPlatformStatsByCountry() {
        List<Map<String, Object>> rows = stats.getPlatformStatsByCountry("Canada");
        assertFalse(rows.isEmpty());
        assertNo999Revenue(rows);
    }

    @Test
    void getProductByPlatformStats() {
        List<Map<String, Object>> rows = stats.getProductByPlatformStats(null, null);
        assertFalse(rows.isEmpty());
        assertNo999Revenue(rows);
    }

    @Test
    void getPlatformMonth() {
        List<Map<String, Object>> rows = stats.getPlatformMonth(null, null);
        assertFalse(rows.isEmpty());
        assertNo999Revenue(rows);
    }

    @Test
    void getPlatformDay() {
        List<Map<String, Object>> rows = stats.getPlatformDay(null, null);
        assertFalse(rows.isEmpty());
        assertNo999Revenue(rows);
    }

    @Test
    void getProductMonth() {
        List<Map<String, Object>> rows = stats.getProductMonth(null, null);
        assertFalse(rows.isEmpty());
        assertNo999Revenue(rows);
    }

    @Test
    void getProductDay() {
        List<Map<String, Object>> rows = stats.getProductDay(null, null);
        assertFalse(rows.isEmpty());
        assertNo999Revenue(rows);
    }

    @Test
    void getProductByPlatformMonth() {
        List<Map<String, Object>> rows = stats.getProductByPlatformMonth(null);
        assertFalse(rows.isEmpty());
        assertNo999Revenue(rows);
    }

    @Test
    void getProductByPlatformDay() {
        List<Map<String, Object>> rows = stats.getProductByPlatformDay(null);
        assertFalse(rows.isEmpty());
        assertNo999Revenue(rows);
    }

    @Test
    void getOverallMonth() {
        List<Map<String, Object>> rows = stats.getOverallMonth();
        assertFalse(rows.isEmpty());
        assertNo999Revenue(rows);
    }

    @Test
    void getDistinctPlatforms() {
        List<String> platforms = stats.getDistinctPlatforms();
        assertTrue(platforms.contains("Grailed"));
        assertTrue(platforms.contains("Depop"));
    }

    @Test
    void getDistinctCountries() {
        List<String> countries = stats.getDistinctCountries();
        assertTrue(countries.contains("Canada"));
        assertTrue(countries.contains("USA"));
    }

    @Test
    void allTwelveViewsExist() {
        List<String> views = jdbc.queryForList(
                "SELECT viewname FROM pg_views WHERE schemaname = 'public'", String.class);
        Set<String> expected = Set.of(
                "vw_counts", "vw_base", "vw_product_base",
                "vw_product_stats", "vw_platform_stats", "vw_product_by_platform_stats",
                "vw_platform_month", "vw_product_month", "vw_product_by_platform_month",
                "vw_platform_day", "vw_product_day", "vw_product_by_platform_day");
        assertEquals(expected, views.stream().collect(Collectors.toSet()));
    }
}
