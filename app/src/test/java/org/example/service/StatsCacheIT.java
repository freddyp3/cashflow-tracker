package org.example.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import org.example.AbstractPostgresIT;
import org.example.dto.OrderItemRequest;
import org.example.dto.OrderRequest;
import org.example.entity.Product;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * End-to-end tests for the stats Redis cache: hits serve stale bodies until an
 * order or product write evicts the whole {@code stats:v1:*} namespace, and
 * cached bodies are byte-identical to uncached ones.
 */
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class StatsCacheIT extends AbstractPostgresIT {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private OrderService orderService;

    @Autowired
    private ProductService productService;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private StringRedisTemplate redis;

    private String bodyA;

    @BeforeAll
    void seed() {
        truncateAll();
        Product product = new Product();
        product.setProductName("Cache Test Jacket");
        product.setProductType("Jackets");
        product.setCost(new BigDecimal("200"));
        productService.create(product);
        orderService.create(orderReq(new BigDecimal("100")));
    }

    @AfterAll
    void cleanup() {
        truncateAll();
    }

    private void truncateAll() {
        jdbc.execute("TRUNCATE order_items, orders, products RESTART IDENTITY CASCADE");
    }

    private static OrderRequest orderReq(BigDecimal revenue) {
        OrderItemRequest item = new OrderItemRequest();
        item.setProductId(1);
        item.setItemPaid(new BigDecimal("60"));
        item.setItemSize("M");

        OrderRequest req = new OrderRequest();
        req.setPlatform("Grailed");
        req.setRevenue(revenue);
        req.setShipping(new BigDecimal("10"));
        req.setCustomerName("Cache Buyer");
        req.setShippingLocation("TBD");
        req.setOrderDate(LocalDate.of(2025, 1, 15));
        req.setItems(List.of(item));
        return req;
    }

    private String getBody(String path) throws Exception {
        return mvc.perform(get(path)).andReturn().getResponse().getContentAsString();
    }

    private Set<String> statsKeys() {
        return redis.keys("stats:v1:*");
    }

    @Test
    @Order(1)
    void secondCallServedFromRedis() throws Exception {
        bodyA = getBody("/api/stats/platforms");
        assertEquals(Boolean.TRUE, redis.hasKey("stats:v1:platforms:-"));

        Integer oid = jdbc.queryForObject(
                "INSERT INTO orders (platform, shipping, revenue, refunded, refunded_used,"
                        + " customer_name, shipping_location, disputed, draft, order_date)"
                        + " VALUES ('Depop', 5, 50, 0, 0, 'Direct Buyer', 'TBD', false, false, '2025-01-15')"
                        + " RETURNING order_id",
                Integer.class);
        jdbc.update("INSERT INTO order_items (order_id, product_id, item_paid) VALUES (?, 1, 30)", oid);

        assertEquals(bodyA, getBody("/api/stats/platforms"));
    }

    @Test
    @Order(2)
    void orderCreateEvicts() throws Exception {
        orderService.create(orderReq(new BigDecimal("100")));
        assertTrue(statsKeys().isEmpty());
        assertNotEquals(bodyA, getBody("/api/stats/platforms"));
    }

    @Test
    @Order(3)
    void orderUpdateDeleteAndUpsertEvict() throws Exception {
        Integer anyOrder = jdbc.queryForObject("SELECT order_id FROM orders LIMIT 1", Integer.class);

        getBody("/api/stats/platforms");
        OrderRequest changed = orderReq(new BigDecimal("999"));
        orderService.update(anyOrder, changed);
        assertTrue(statsKeys().isEmpty());

        getBody("/api/stats/platforms");
        orderService.delete(anyOrder);
        assertTrue(statsKeys().isEmpty());

        getBody("/api/stats/platforms");
        orderService.upsertByExternalRef("Grailed", "ref-x", orderReq(new BigDecimal("80")));
        assertTrue(statsKeys().isEmpty());
    }

    @Test
    @Order(4)
    void productWriteEvicts() throws Exception {
        getBody("/api/stats/platforms");
        Product updated = new Product();
        updated.setProductName("Cache Test Jacket v2");
        updated.setProductType("Jackets");
        updated.setCost(new BigDecimal("210"));
        productService.update(1, updated);
        assertTrue(statsKeys().isEmpty());

        getBody("/api/stats/platforms");
        Product unused = new Product();
        unused.setProductName("Never Sold Widget");
        unused.setProductType("Accessories");
        unused.setCost(new BigDecimal("50"));
        Product saved = productService.create(unused);
        assertTrue(statsKeys().isEmpty());

        getBody("/api/stats/platforms");
        productService.delete(saved.getProductId());
        assertTrue(statsKeys().isEmpty());
    }

    @Test
    @Order(5)
    void cachedBodyIsByteIdentical() throws Exception {
        for (String path : List.of("/api/stats/platform-month", "/api/stats/products")) {
            assertEquals(getBody(path), getBody(path));
        }
    }

    @Test
    @Order(6)
    void queryParamsAreInKey() throws Exception {
        mvc.perform(get("/api/stats/platforms").param("country", "Canada"));
        assertEquals(Boolean.TRUE, redis.hasKey("stats:v1:platforms:Canada"));
    }
}
