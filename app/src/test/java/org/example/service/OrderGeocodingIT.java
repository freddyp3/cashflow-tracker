package org.example.service;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import org.example.AbstractPostgresIT;
import org.example.dto.OrderItemRequest;
import org.example.dto.OrderRequest;
import org.example.entity.Order;
import org.example.service.GeocodingService.Coordinates;
import org.example.service.OrderService.UpsertResult;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

/**
 * Integration test for geocoding-on-save and platform normalisation in
 * {@link OrderService} against a real PostgreSQL container, with
 * {@link GeocodingService} mocked so no request ever leaves the JVM.
 *
 * <p>Truncates orders/items/products before and after the class (with
 * {@code RESTART IDENTITY}) so it never disturbs {@code StatsViewsIT}'s
 * hard-coded row IDs regardless of test-class ordering.</p>
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class OrderGeocodingIT extends AbstractPostgresIT {

    private static final Coordinates TORONTO =
            new Coordinates(new BigDecimal("43.653200"), new BigDecimal("-79.383200"));
    private static final Coordinates GENEVA =
            new Coordinates(new BigDecimal("46.204400"), new BigDecimal("6.143200"));

    @Autowired
    private OrderService service;

    @Autowired
    private JdbcTemplate jdbc;

    @MockitoBean
    private GeocodingService geocoder;

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

    private static OrderRequest request(String platform, String location) {
        OrderRequest req = new OrderRequest();
        req.setPlatform(platform);
        req.setRevenue(new BigDecimal("100"));
        req.setShippingLocation(location);
        OrderItemRequest item = new OrderItemRequest();
        item.setProductId(1);
        item.setItemPaid(new BigDecimal("50"));
        req.setItems(List.of(item));
        return req;
    }

    @Test
    void createGeocodesNewLocation() {
        when(geocoder.geocode("Toronto, ON, CAN")).thenReturn(Optional.of(TORONTO));

        Order saved = service.create(request("eBay", "Toronto, ON, CAN"));

        verify(geocoder).geocode("Toronto, ON, CAN");
        assertEquals(0, TORONTO.latitude().compareTo(saved.getLatitude()));
        assertEquals(0, TORONTO.longitude().compareTo(saved.getLongitude()));
    }

    @Test
    void unchangedLocationIsNotGeocodedAgain() {
        when(geocoder.geocode("Toronto, ON, CAN")).thenReturn(Optional.of(TORONTO));
        Order saved = service.create(request("eBay", "Toronto, ON, CAN"));
        verify(geocoder).geocode("Toronto, ON, CAN");

        OrderRequest sameLocation = request("eBay", "Toronto, ON, CAN");
        sameLocation.setRevenue(new BigDecimal("150"));
        Order updated = service.update(saved.getOrderId(), sameLocation);

        verifyNoMoreInteractions(geocoder);
        assertEquals(0, TORONTO.latitude().compareTo(updated.getLatitude()));
        assertEquals(0, TORONTO.longitude().compareTo(updated.getLongitude()));
    }

    @Test
    void changedLocationIsGeocodedAgain() {
        when(geocoder.geocode("Toronto, ON, CAN")).thenReturn(Optional.of(TORONTO));
        when(geocoder.geocode("Geneva, CHE")).thenReturn(Optional.of(GENEVA));
        Order saved = service.create(request("eBay", "Toronto, ON, CAN"));

        Order updated = service.update(saved.getOrderId(), request("eBay", "Geneva, CHE"));

        verify(geocoder).geocode("Geneva, CHE");
        assertEquals(0, GENEVA.latitude().compareTo(updated.getLatitude()));
        assertEquals(0, GENEVA.longitude().compareTo(updated.getLongitude()));
    }

    @Test
    void explicitCoordinatesSkipGeocoding() {
        OrderRequest req = request("eBay", "Toronto, ON, CAN");
        req.setLatitude(new BigDecimal("43.700000"));
        req.setLongitude(new BigDecimal("-79.400000"));

        Order saved = service.create(req);

        verify(geocoder, never()).geocode(anyString());
        assertEquals(0, new BigDecimal("43.700000").compareTo(saved.getLatitude()));
        assertEquals(0, new BigDecimal("-79.400000").compareTo(saved.getLongitude()));
    }

    @Test
    void geocodingFailureSavesWithNullCoordinates() {
        when(geocoder.geocode("Nowhere Fake Place, ZZ, XXX")).thenReturn(Optional.empty());

        Order saved = service.create(request("eBay", "Nowhere Fake Place, ZZ, XXX"));

        assertNull(saved.getLatitude());
        assertNull(saved.getLongitude());
        assertNull(jdbc.queryForObject(
                "SELECT latitude FROM orders WHERE order_id = ?",
                BigDecimal.class, saved.getOrderId()));
    }

    @Test
    void platformIsNormalisedOnCreate() {
        Order saved = service.create(request("GRAILED", "TBD"));

        assertEquals("Grailed", saved.getPlatform());
        assertEquals("Grailed", jdbc.queryForObject(
                "SELECT platform FROM orders WHERE order_id = ?",
                String.class, saved.getOrderId()));
    }

    @Test
    void upsertNormalisesPlatformBeforeLookup() {
        UpsertResult first = service.upsertByExternalRef("grailed", "ref-1", request("IGNORED", "TBD"));
        assertTrue(first.created());
        assertEquals("Grailed", first.order().getPlatform());

        UpsertResult second = service.upsertByExternalRef("GRAILED", "ref-1", request("IGNORED", "TBD"));

        Integer count = jdbc.queryForObject(
                "SELECT count(*) FROM orders WHERE external_ref = 'ref-1'", Integer.class);
        assertEquals(1, count);
        assertEquals("Grailed", jdbc.queryForObject(
                "SELECT platform FROM orders WHERE external_ref = 'ref-1'", String.class));
        assertEquals(first.order().getOrderId(), second.order().getOrderId());
    }

    @Test
    void migration003IsIdempotent() throws Exception {
        String sql = Files.readString(Path.of("database", "migrations", "003_coordinates_platforms.sql"));
        jdbc.execute(sql);
        jdbc.execute(sql);

        Integer count = jdbc.queryForObject(
                "SELECT count(*) FROM information_schema.columns "
                        + "WHERE table_name = 'orders' AND column_name IN ('latitude', 'longitude') "
                        + "AND numeric_precision = 9 AND numeric_scale = 6",
                Integer.class);
        assertEquals(2, count);
    }
}
