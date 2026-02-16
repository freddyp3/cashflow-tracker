package org.example.dto;

import org.example.entity.OrderItem;
import java.math.BigDecimal;

/**
 * Outbound DTO for a single line item within an {@link OrderResponse}.
 *
 * <p>Includes the denormalized {@code productName} from the related
 * {@link org.example.entity.Product} so the frontend doesn't need a separate lookup.</p>
 */
public class OrderItemResponse {
    private Integer orderItemId;
    private Integer productId;
    private String productName;
    private BigDecimal itemPaid;
    private String itemSize;
    private String note;

    public static OrderItemResponse from(OrderItem item) {
        OrderItemResponse r = new OrderItemResponse();
        r.orderItemId = item.getOrderItemId();
        r.productId = item.getProduct().getProductId();
        r.productName = item.getProduct().getProductName();
        r.itemPaid = item.getItemPaid();
        r.itemSize = item.getItemSize();
        r.note = item.getNote();
        return r;
    }

    public Integer getOrderItemId() { return orderItemId; }
    public Integer getProductId() { return productId; }
    public String getProductName() { return productName; }
    public BigDecimal getItemPaid() { return itemPaid; }
    public String getItemSize() { return itemSize; }
    public String getNote() { return note; }
}
