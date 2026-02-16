package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Inbound DTO for creating or updating an order via {@code POST /api/orders}
 * or {@code PUT /api/orders/{id}}.
 *
 * <p>All monetary values should already be converted to CAD by the frontend.
 * Contains a nested list of {@link OrderItemRequest}s for the line items.</p>
 */
public class OrderRequest {
    private String platform;
    private BigDecimal shipping = BigDecimal.ZERO;
    private BigDecimal revenue = BigDecimal.ZERO;
    private BigDecimal refunded = BigDecimal.ZERO;
    private BigDecimal refundedUsed = BigDecimal.ZERO;
    private String customerName = "TBD";
    private String shippingLocation = "TBD";
    private Boolean disputed = false;
    private LocalDate orderDate;
    private LocalDate deliveredDate;
    private String note;
    private List<OrderItemRequest> items;

    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }

    public BigDecimal getShipping() { return shipping; }
    public void setShipping(BigDecimal shipping) { this.shipping = shipping; }

    public BigDecimal getRevenue() { return revenue; }
    public void setRevenue(BigDecimal revenue) { this.revenue = revenue; }

    public BigDecimal getRefunded() { return refunded; }
    public void setRefunded(BigDecimal refunded) { this.refunded = refunded; }

    public BigDecimal getRefundedUsed() { return refundedUsed; }
    public void setRefundedUsed(BigDecimal refundedUsed) { this.refundedUsed = refundedUsed; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getShippingLocation() { return shippingLocation; }
    public void setShippingLocation(String shippingLocation) { this.shippingLocation = shippingLocation; }

    public Boolean getDisputed() { return disputed; }
    public void setDisputed(Boolean disputed) { this.disputed = disputed; }

    public LocalDate getOrderDate() { return orderDate; }
    public void setOrderDate(LocalDate orderDate) { this.orderDate = orderDate; }

    public LocalDate getDeliveredDate() { return deliveredDate; }
    public void setDeliveredDate(LocalDate deliveredDate) { this.deliveredDate = deliveredDate; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public List<OrderItemRequest> getItems() { return items; }
    public void setItems(List<OrderItemRequest> items) { this.items = items; }
}
