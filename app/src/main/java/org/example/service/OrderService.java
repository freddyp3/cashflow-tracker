package org.example.service;

import java.util.List;
import java.util.Objects;

import org.example.dto.OrderItemRequest;
import org.example.dto.OrderRequest;
import org.example.entity.Order;
import org.example.entity.OrderItem;
import org.example.entity.Product;
import org.example.repository.OrderRepository;
import org.example.repository.ProductRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Business logic for order CRUD operations.
 *
 * <p>Handles creation and updates of orders with their nested line items.
 * All mutating methods are {@code @Transactional} to ensure atomicity.
 * On update, existing items are cleared (triggering orphanRemoval) and
 * replaced with the new set from the request.</p>
 *
 * <p>Platform values are normalised to their canonical spelling
 * ({@link PlatformService}) on every write, and a new or changed
 * {@code shippingLocation} is geocoded to WGS-84 coordinates
 * ({@link GeocodingService}); a geocoding failure never fails the save.</p>
 */
@Service
public class OrderService {

    private final OrderRepository orderRepo;
    private final ProductRepository productRepo;
    private final GeocodingService geocodingService;
    private final PlatformService platformService;
    private final TransactionTemplate txTemplate;
    private final StatsCache statsCache;

    public OrderService(OrderRepository orderRepo, ProductRepository productRepo,
                        GeocodingService geocodingService, PlatformService platformService,
                        PlatformTransactionManager txManager, StatsCache statsCache) {
        this.orderRepo = orderRepo;
        this.productRepo = productRepo;
        this.geocodingService = geocodingService;
        this.platformService = platformService;
        this.txTemplate = new TransactionTemplate(txManager);
        this.statsCache = statsCache;
    }

    // added by me
    public List<Order> findAll(String sort) {
        if ("orderDate".equals(sort)) {
            return orderRepo.findAll(Sort.by(Sort.Direction.DESC, "orderDate"));
        }
        return orderRepo.findAll();
    }

    public Order findById(Integer id) {
        return orderRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
    }

    @Transactional
    public Order create(OrderRequest req) {
        Order order = new Order();
        applyFields(order, req);
        addItems(order, req.getItems());
        Order saved = orderRepo.save(order);
        statsCache.evictAfterCommit();
        return saved;
    }

    @Transactional
    public Order update(Integer id, OrderRequest req) {
        Order order = findById(id);
        applyFields(order, req);
        order.getItems().clear();
        addItems(order, req.getItems());
        Order saved = orderRepo.save(order);
        statsCache.evictAfterCommit();
        return saved;
    }

    @Transactional
    public void delete(Integer id) {
        orderRepo.deleteById(id);
        statsCache.evictAfterCommit();
    }

    /** Result of {@link #upsertByExternalRef}: the saved order plus whether it was newly created. */
    public record UpsertResult(Order order, boolean created) {}

    /**
     * Creates or updates the order identified by {@code (platform, externalRef)}.
     *
     * <p>Not {@code @Transactional} itself: each attempt runs inside a
     * {@link TransactionTemplate} so a unique-index collision rolls back its own
     * transaction. If a concurrent request inserts the row first, the first
     * attempt fails with {@link DataIntegrityViolationException} and exactly one
     * retry runs, which then finds and updates the committed row. Any other
     * exception propagates.</p>
     *
     * <p>The path parameters are authoritative: the body's {@code platform} is
     * ignored and the order's platform is always set from {@code platform}.</p>
     */
    public UpsertResult upsertByExternalRef(String platform, String externalRef, OrderRequest req) {
        platform = platformService.normalise(platform);
        UpsertResult result;
        try {
            result = attemptUpsert(platform, externalRef, req);
        } catch (DataIntegrityViolationException e) {
            result = attemptUpsert(platform, externalRef, req);
        }
        statsCache.evictAfterCommit();
        return result;
    }

    /** One transactional create-or-update attempt for {@link #upsertByExternalRef}. */
    private UpsertResult attemptUpsert(String platform, String externalRef, OrderRequest req) {
        return txTemplate.execute(status -> {
            var existing = orderRepo.findByPlatformAndExternalRef(platform, externalRef);
            if (existing.isPresent()) {
                Order order = existing.get();
                applyFields(order, req);
                order.setPlatform(platform);
                order.getItems().clear();
                addItems(order, req.getItems());
                return new UpsertResult(orderRepo.save(order), false);
            }
            Order order = new Order();
            applyFields(order, req);
            order.setPlatform(platform);
            order.setExternalRef(externalRef);
            addItems(order, req.getItems());
            return new UpsertResult(orderRepo.save(order), true);
        });
    }

    /** Copies all scalar fields from the DTO onto the entity. */
    private void applyFields(Order order, OrderRequest req) {
        order.setPlatform(platformService.normalise(req.getPlatform()));
        order.setShipping(req.getShipping());
        order.setRevenue(req.getRevenue());
        order.setRefunded(req.getRefunded());
        order.setRefundedUsed(req.getRefundedUsed());
        order.setCustomerName(req.getCustomerName());
        String newLocation = req.getShippingLocation();
        boolean locationChanged = !Objects.equals(order.getShippingLocation(), newLocation);
        order.setShippingLocation(newLocation);
        order.setDisputed(req.getDisputed());
        order.setDraft(req.getDraft());
        if (Boolean.TRUE.equals(req.getDraft()) && (req.getPlatform() == null || req.getPlatform().isBlank())) {
            order.setPlatform("");
        }
        order.setOrderDate(req.getOrderDate());
        order.setDeliveredDate(req.getDeliveredDate());
        order.setNote(req.getNote());
        if (req.getLatitude() != null && req.getLongitude() != null) {
            order.setLatitude(req.getLatitude());
            order.setLongitude(req.getLongitude());
        } else if (locationChanged || order.getLatitude() == null) {
            var coords = geocodingService.geocode(newLocation);
            order.setLatitude(coords.map(GeocodingService.Coordinates::latitude).orElse(null));
            order.setLongitude(coords.map(GeocodingService.Coordinates::longitude).orElse(null));
        }
    }

    /** Resolves product references and adds OrderItem entities to the order. */
    private void addItems(Order order, List<OrderItemRequest> items) {
        if (items == null) return;
        for (OrderItemRequest itemReq : items) {
            Product product = productRepo.findById(itemReq.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + itemReq.getProductId()));
            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setItemPaid(itemReq.getItemPaid());
            item.setItemSize(itemReq.getItemSize());
            item.setNote(itemReq.getNote());
            order.getItems().add(item);
        }
    }
}
