package org.example.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;

/**
 * JPA entity mapped to the {@code order_items} table.
 *
 * <p>Represents a single line item within an {@link Order}, linking to a specific
 * {@link Product}. Each item tracks what the customer paid for it and the size variant.
 * Shipping and revenue are pro-rated across items in the database analytics views.</p>
 */
@Entity
@Table(name = "order_items")
public class OrderItem {

    /** Auto-generated primary key. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_item_id")
    private Integer orderItemId;

    /** Parent order. Lazy-loaded, excluded from JSON to prevent circular serialization. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnore
    private Order order;

    /** The product this item represents. Lazy-loaded. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** What the customer paid for this specific item in CAD. */
    @Column(name = "item_paid", precision = 10, scale = 2)
    private BigDecimal itemPaid = BigDecimal.ZERO;

    /** Size variant (e.g. "M", "L", "One Size"). */
    @Column(name = "item_size", length = 200)
    private String itemSize;

    /** Optional free-text note about this line item. */
    private String note;

    public OrderItem() {}

    public Integer getOrderItemId() { return orderItemId; }
    public void setOrderItemId(Integer orderItemId) { this.orderItemId = orderItemId; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public BigDecimal getItemPaid() { return itemPaid; }
    public void setItemPaid(BigDecimal itemPaid) { this.itemPaid = itemPaid; }

    public String getItemSize() { return itemSize; }
    public void setItemSize(String itemSize) { this.itemSize = itemSize; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
