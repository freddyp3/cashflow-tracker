package org.example.repository;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

import org.example.AbstractPostgresIT;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Integration test for partition 19: the personal_hauls table is gone and
 * products.kind ('business'/'personal') excludes personal products and their
 * orders from every analytics view.
 *
 * <p>Seed: one business product and one personal product, each sold once on a
 * unique platform in the same month. The shared test container may hold seed
 * data from other IT classes, so every assertion filters by this suite's
 * unique platform/product names.</p>
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PersonalProductsIT extends AbstractPostgresIT {

    private static final String PLATFORM = "P19 Test Platform";
    private static final String BUSINESS_PRODUCT = "P19 Business Widget";
    private static final String PERSONAL_PRODUCT = "P19 Personal Hoodie";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private DataSource dataSource;

    @BeforeAll
    void seed() {
        jdbc.update("TRUNCATE order_items, orders, products RESTART IDENTITY CASCADE");
        jdbc.update("INSERT INTO products (product_name, product_type, cost, stock_quantity) VALUES (?, ?, ?, ?)",
                BUSINESS_PRODUCT, "Widgets", new BigDecimal("50"), 1);
        jdbc.update("INSERT INTO products (product_name, product_type, cost, stock_quantity, kind) VALUES (?, ?, ?, ?, ?)",
                PERSONAL_PRODUCT, "Hoodies", BigDecimal.ZERO, 0, "personal");
        int businessProductId = jdbc.queryForObject(
                "SELECT product_id FROM products WHERE product_name = ?", Integer.class, BUSINESS_PRODUCT);
        int personalProductId = jdbc.queryForObject(
                "SELECT product_id FROM products WHERE product_name = ?", Integer.class, PERSONAL_PRODUCT);

        jdbc.update("INSERT INTO orders (platform, shipping, revenue, shipping_location, order_date) VALUES (?, ?, ?, ?, ?)",
                PLATFORM, new BigDecimal("10"), new BigDecimal("100"), "Toronto, ON, Canada", java.sql.Date.valueOf("2024-01-15"));
        int businessOrderId = jdbc.queryForObject(
                "SELECT order_id FROM orders WHERE platform = ? AND revenue = 100", Integer.class, PLATFORM);
        jdbc.update("INSERT INTO order_items (order_id, product_id, item_paid) VALUES (?, ?, ?)",
                businessOrderId, businessProductId, new BigDecimal("50"));

        jdbc.update("INSERT INTO orders (platform, shipping, revenue, shipping_location, order_date) VALUES (?, ?, ?, ?, ?)",
                PLATFORM, BigDecimal.ZERO, new BigDecimal("80"), "Vancouver, BC, Canada", java.sql.Date.valueOf("2024-01-20"));
        int personalOrderId = jdbc.queryForObject(
                "SELECT order_id FROM orders WHERE platform = ? AND revenue = 80", Integer.class, PLATFORM);
        jdbc.update("INSERT INTO order_items (order_id, product_id, item_paid) VALUES (?, ?, ?)",
                personalOrderId, personalProductId, new BigDecimal("60"));
    }

    @AfterAll
    void cleanup() {
        jdbc.update("TRUNCATE order_items, orders, products RESTART IDENTITY CASCADE");
    }

    private static void assertMoneyEquals(String expected, Object actual) {
        assertEquals(0, new BigDecimal(expected).compareTo((BigDecimal) actual),
                "expected " + expected + " but was " + actual);
    }

    @Test
    void personalHaulsTableDoesNotExist() {
        String regclass = jdbc.queryForObject(
                "SELECT to_regclass('public.personal_hauls')", String.class);
        assertNull(regclass);
    }

    @Test
    void kindDefaultsToBusiness() {
        assertEquals("business", jdbc.queryForObject(
                "SELECT kind FROM products WHERE product_name = ?", String.class, BUSINESS_PRODUCT));
    }

    @Test
    void invalidKindViolatesCheck() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "INSERT INTO products (product_name, cost, kind) VALUES (?, ?, ?)",
                "P19 Bad Kind Product", new BigDecimal("10"), "other"));
    }

    @Test
    void vwBaseExcludesPersonalOrders() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT * FROM vw_base WHERE platform = ?", PLATFORM);
        assertEquals(1, rows.size());
        assertMoneyEquals("100", rows.get(0).get("revenue"));
    }

    @Test
    void vwProductBaseExcludesPersonalProducts() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT * FROM vw_product_base WHERE product_name LIKE 'P19%'");
        assertEquals(1, rows.size());
        assertEquals(BUSINESS_PRODUCT, rows.get(0).get("product_name"));
    }

    @Test
    void vwPlatformStatsExcludesPersonal() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT * FROM vw_platform_stats WHERE platform = ?", PLATFORM);
        assertEquals(1, rows.size());
        assertMoneyEquals("100", rows.get(0).get("platform_revenue"));
        assertEquals(1, ((Number) rows.get(0).get("units_sold")).intValue());
    }

    @Test
    void vwProductStatsExcludesPersonal() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT * FROM vw_product_stats WHERE product_name LIKE 'P19%'");
        assertEquals(1, rows.size());
        assertEquals(BUSINESS_PRODUCT, rows.get(0).get("product_name"));
        assertMoneyEquals("100", rows.get(0).get("product_total_revenue"));
    }

    @Test
    void vwPlatformMonthExcludesPersonal() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT * FROM vw_platform_month WHERE platform = ?", PLATFORM);
        assertEquals(1, rows.size());
        assertMoneyEquals("100", rows.get(0).get("month_revenue"));
        assertEquals(1, ((Number) rows.get(0).get("month_units_sold")).intValue());
    }

    @Test
    void migrations004And005AreIdempotent() throws Exception {
        for (String name : List.of("004_drop_personal_hauls.sql", "005_product_kind.sql")) {
            String sql = Files.readString(Path.of("database", "migrations", name));
            try (var conn = dataSource.getConnection();
                 var stmt = conn.createStatement()) {
                stmt.execute(sql);
                stmt.execute(sql);
            }
        }
    }
}
