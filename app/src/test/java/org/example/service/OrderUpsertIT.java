package org.example.service;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.example.AbstractPostgresIT;
import org.example.dto.OrderItemRequest;
import org.example.dto.OrderRequest;
import org.example.dto.OrderResponse;
import org.example.service.OrderService.UpsertResult;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration test for {@link OrderService#upsertByExternalRef} against a real
 * PostgreSQL container, covering create, update and the concurrent-insert race
 * behind the unique {@code (platform, external_ref)} index.
 *
 * <p>Truncates orders/items/products before and after the class (with
 * {@code RESTART IDENTITY}) so it never disturbs {@code StatsViewsIT}'s
 * hard-coded row IDs regardless of test-class ordering.</p>
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class OrderUpsertIT extends AbstractPostgresIT {

    @Autowired
    private OrderService service;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeAll
    void seed() {
        jdbc.update("TRUNCATE order_items, orders, products RESTART IDENTITY CASCADE");
        jdbc.update("INSERT INTO products (product_name, product_type, cost, stock_quantity) VALUES (?, ?, ?, ?)",
                "Penguin Shirt", "Shirts", new BigDecimal("50"), 10);
    }

    @AfterAll
    void cleanup() {
        jdbc.update("TRUNCATE order_items, orders, products RESTART IDENTITY CASCADE");
    }

    private static OrderRequest request(String platform, String revenue) {
        OrderRequest req = new OrderRequest();
        req.setPlatform(platform);
        req.setRevenue(new BigDecimal(revenue));
        OrderItemRequest item = new OrderItemRequest();
        item.setProductId(1);
        item.setItemPaid(new BigDecimal("50"));
        req.setItems(List.of(item));
        return req;
    }

    private Integer rowCount(String platform, String ref) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM orders WHERE platform = ? AND external_ref = ?",
                Integer.class, platform, ref);
    }

    @Test
    void firstPutCreates() {
        UpsertResult result = service.upsertByExternalRef("eBay", "EB-1001", request("IGNORED", "100"));

        assertTrue(result.created());
        assertEquals("eBay", result.order().getPlatform());
        assertEquals("EB-1001", result.order().getExternalRef());
        assertEquals(1, rowCount("eBay", "EB-1001"));

        OrderResponse response = OrderResponse.from(result.order());
        assertEquals("EB-1001", response.getExternalRef());
    }

    @Test
    void secondPutUpdatesSameRow() {
        UpsertResult first = service.upsertByExternalRef("eBay", "EB-1002", request("IGNORED", "100"));
        assertTrue(first.created());

        UpsertResult second = service.upsertByExternalRef("eBay", "EB-1002", request("IGNORED", "150"));

        assertFalse(second.created());
        assertEquals(first.order().getOrderId(), second.order().getOrderId());
        assertEquals(0, new BigDecimal("150").compareTo(second.order().getRevenue()));
        assertEquals(1, rowCount("eBay", "EB-1002"));
    }

    @Test
    void concurrentPutsYieldOneRow() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            for (int i = 0; i < 5; i++) {
                String ref = "EB-RACE-" + i;
                CountDownLatch ready = new CountDownLatch(2);
                CountDownLatch go = new CountDownLatch(1);

                Future<UpsertResult> a = pool.submit(() -> {
                    ready.countDown();
                    go.await();
                    return service.upsertByExternalRef("eBay", ref, request("IGNORED", "100"));
                });
                Future<UpsertResult> b = pool.submit(() -> {
                    ready.countDown();
                    go.await();
                    return service.upsertByExternalRef("eBay", ref, request("IGNORED", "200"));
                });

                assertTrue(ready.await(10, TimeUnit.SECONDS));
                go.countDown();

                UpsertResult ra = a.get(30, TimeUnit.SECONDS);
                UpsertResult rb = b.get(30, TimeUnit.SECONDS);

                assertEquals(1, rowCount("eBay", ref), "race " + ref + " produced duplicate rows");
                assertEquals(1, (ra.created() ? 1 : 0) + (rb.created() ? 1 : 0),
                        "race " + ref + " must yield exactly one created result");
            }
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void migrationIsIdempotent() throws Exception {
        String sql = Files.readString(Path.of("database", "migrations", "002_external_ref.sql"));
        jdbc.execute(sql);

        Integer count = jdbc.queryForObject(
                "SELECT count(*) FROM information_schema.columns "
                        + "WHERE table_name = 'orders' AND column_name = 'external_ref'",
                Integer.class);
        assertEquals(1, count);
    }
}
