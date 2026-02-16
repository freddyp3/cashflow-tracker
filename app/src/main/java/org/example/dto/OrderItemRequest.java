package org.example.dto;

import java.math.BigDecimal;

/**
 * Inbound DTO for a single line item within an {@link OrderRequest}.
 *
 * <p>References a product by ID and specifies what the customer paid (in CAD),
 * the size variant, and an optional note.</p>
 */
public class OrderItemRequest {
    private Integer productId;
    private BigDecimal itemPaid = BigDecimal.ZERO;
    private String itemSize;
    private String note;

    public Integer getProductId() { return productId; }
    public void setProductId(Integer productId) { this.productId = productId; }

    public BigDecimal getItemPaid() { return itemPaid; }
    public void setItemPaid(BigDecimal itemPaid) { this.itemPaid = itemPaid; }

    public String getItemSize() { return itemSize; }
    public void setItemSize(String itemSize) { this.itemSize = itemSize; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
