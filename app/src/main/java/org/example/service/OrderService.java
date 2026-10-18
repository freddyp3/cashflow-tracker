package org.example.service;

import java.util.List;

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
 */
@Service
public class OrderService {

    private final OrderRepository orderRepo;
    private final ProductRepository productRepo;
    private final TransactionTemplate txTemplate;

    public OrderService(OrderRepository orderRepo, ProductRepository productRepo,
                        PlatformTransactionManager txManager) {
        this.orderRepo = orderRepo;
        this.productRepo = productRepo;
        this.txTemplate = new TransactionTemplate(txManager);
    }

    public List<Order> findAll() {
        return orderRepo.findAll();
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
        return orderRepo.save(order);
    }

    @Transactional
    public Order update(Integer id, OrderRequest req) {
        Order order = findById(id);
        applyFields(order, req);
        order.getItems().clear();
        addItems(order, req.getItems());
        return orderRepo.save(order);
    }

    @Transactional
    public void delete(Integer id) {
        orderRepo.deleteById(id);
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
        try {
            return attemptUpsert(platform, externalRef, req);
        } catch (DataIntegrityViolationException e) {
            return attemptUpsert(platform, externalRef, req);
        }
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
        order.setPlatform(req.getPlatform());
        order.setShipping(req.getShipping());
        order.setRevenue(req.getRevenue());
        order.setRefunded(req.getRefunded());
        order.setRefundedUsed(req.getRefundedUsed());
        order.setCustomerName(req.getCustomerName());
        order.setShippingLocation(req.getShippingLocation());
        order.setDisputed(req.getDisputed());
        order.setDraft(req.getDraft());
        if (Boolean.TRUE.equals(req.getDraft()) && (req.getPlatform() == null || req.getPlatform().isBlank())) {
            order.setPlatform("");
        }
        order.setOrderDate(req.getOrderDate());
        order.setDeliveredDate(req.getDeliveredDate());
        order.setNote(req.getNote());
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
