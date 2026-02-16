package org.example.dto;

import org.example.entity.Order;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Outbound DTO returned from order endpoints.
 *
 * <p>Mirrors the {@link Order} entity but includes denormalized product names
 * in each {@link OrderItemResponse} for frontend convenience. Created via
 * the static {@link #from(Order)} factory method.</p>
 */
public class OrderResponse {
    private Integer orderId;
    private String platform;
    private BigDecimal shipping;
    private BigDecimal revenue;
    private BigDecimal refunded;
    private BigDecimal refundedUsed;
    private String customerName;
    private String shippingLocation;
    private Boolean disputed;
    private LocalDate orderDate;
    private LocalDate deliveredDate;
    private String note;
    private List<OrderItemResponse> items;

    public static OrderResponse from(Order order) {
        OrderResponse r = new OrderResponse();
        r.orderId = order.getOrderId();
        r.platform = order.getPlatform();
        r.shipping = order.getShipping();
        r.revenue = order.getRevenue();
        r.refunded = order.getRefunded();
        r.refundedUsed = order.getRefundedUsed();
        r.customerName = order.getCustomerName();
        r.shippingLocation = order.getShippingLocation();
        r.disputed = order.getDisputed();
        r.orderDate = order.getOrderDate();
        r.deliveredDate = order.getDeliveredDate();
        r.note = order.getNote();
        r.items = order.getItems().stream()
                .map(OrderItemResponse::from)
                .toList();
        return r;
    }

    public Integer getOrderId() { return orderId; }
    public String getPlatform() { return platform; }
    public BigDecimal getShipping() { return shipping; }
    public BigDecimal getRevenue() { return revenue; }
    public BigDecimal getRefunded() { return refunded; }
    public BigDecimal getRefundedUsed() { return refundedUsed; }
    public String getCustomerName() { return customerName; }
    public String getShippingLocation() { return shippingLocation; }
    public Boolean getDisputed() { return disputed; }
    public LocalDate getOrderDate() { return orderDate; }
    public LocalDate getDeliveredDate() { return deliveredDate; }
    public String getNote() { return note; }
    public List<OrderItemResponse> getItems() { return items; }
}
