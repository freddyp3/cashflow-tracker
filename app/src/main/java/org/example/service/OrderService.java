package org.example.service;

import java.util.List;

import org.example.dto.OrderItemRequest;
import org.example.dto.OrderRequest;
import org.example.entity.Order;
import org.example.entity.OrderItem;
import org.example.entity.Product;
import org.example.repository.OrderRepository;
import org.example.repository.ProductRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public OrderService(OrderRepository orderRepo, ProductRepository productRepo) {
        this.orderRepo = orderRepo;
        this.productRepo = productRepo;
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
