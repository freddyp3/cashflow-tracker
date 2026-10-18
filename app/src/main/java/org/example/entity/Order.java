package org.example.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA entity mapped to the {@code orders} table.
 *
 * <p>Represents a customer order placed on a sales platform. Shipping and revenue
 * are stored in CAD (converted at entry time via {@link org.example.service.CurrencyService}),
 * while {@code refunded} and {@code refundedUsed} are stored in CNY.
 * An order contains one or more {@link OrderItem}s via a one-to-many cascade relationship.</p>
 *
 * <p>Disputed orders are excluded from analytics views in the database.</p>
 */
@Entity
@Table(name = "orders")
public class Order {

    /** Auto-generated primary key. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_id")
    private Integer orderId;

    /** Sales channel; canonical names include "Grailed", "In Person", "Website". */
    @Column(nullable = false, length = 30)
    private String platform;

    /** Shipping cost in CAD. Defaults to -1 to indicate unknown/pending. */
    @Column(precision = 10, scale = 2)
    private BigDecimal shipping = new BigDecimal("-1");

    /** Total revenue received in CAD. */
    @Column(precision = 10, scale = 2)
    private BigDecimal revenue = BigDecimal.ZERO;

    /** Amount refunded to customer in CNY (Chinese Yuan) — never CAD. */
    @Column(precision = 10, scale = 2)
    private BigDecimal refunded = BigDecimal.ZERO;

    /** Portion of the refund that was reused/recouped, in CNY. */
    @Column(name = "refunded_used", precision = 10, scale = 2)
    private BigDecimal refundedUsed = BigDecimal.ZERO;

    /** Customer's display name. Defaults to "TBD". */
    @Column(name = "customer_name", length = 200)
    private String customerName = "TBD";

    /** Shipping destination (format: "City, State, COUNTRY"). Country is extracted for filtering. */
    @Column(name = "shipping_location", length = 200)
    private String shippingLocation = "TBD";

    /** WGS-84 latitude of {@code shippingLocation}, geocoded on save; NULL when unknown. */
    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    /** WGS-84 longitude of {@code shippingLocation}, geocoded on save; NULL when unknown. */
    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    /** Whether this order is under dispute. Disputed orders are excluded from stats views. */
    @Column(nullable = false)
    private Boolean disputed = false;

    /** Whether this order is a draft. Draft orders are incomplete and excluded from stats views. */
    @Column(nullable = false)
    private Boolean draft = false;

    /** Date the order was placed. */
    @Column(name = "order_date")
    private LocalDate orderDate;

    /** Date the order was delivered to the customer. */
    @Column(name = "delivered_date")
    private LocalDate deliveredDate;

    /** Optional free-text note about the order. */
    private String note;

    /** Marketplace order number (e.g. the eBay order ID from a sale email). NULL for manual orders. */
    @Column(name = "external_ref", length = 100)
    private String externalRef;

    /**
     * Line items in this order. Cascade ALL ensures items are persisted/deleted with the order.
     * orphanRemoval ensures clearing the list deletes removed items from the database.
     */
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    public Order() {}

    public Integer getOrderId() { return orderId; }
    public void setOrderId(Integer orderId) { this.orderId = orderId; }

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

    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }

    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }

    public Boolean getDisputed() { return disputed; }
    public void setDisputed(Boolean disputed) { this.disputed = disputed; }

    public Boolean getDraft() { return draft; }
    public void setDraft(Boolean draft) { this.draft = draft; }

    public LocalDate getOrderDate() { return orderDate; }
    public void setOrderDate(LocalDate orderDate) { this.orderDate = orderDate; }

    public LocalDate getDeliveredDate() { return deliveredDate; }
    public void setDeliveredDate(LocalDate deliveredDate) { this.deliveredDate = deliveredDate; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getExternalRef() { return externalRef; }
    public void setExternalRef(String externalRef) { this.externalRef = externalRef; }

    public List<OrderItem> getItems() { return items; }
    public void setItems(List<OrderItem> items) { this.items = items; }
}
