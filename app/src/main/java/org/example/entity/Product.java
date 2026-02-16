package org.example.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

/**
 * JPA entity mapped to the {@code products} table.
 *
 * <p>Represents a product in the catalog. Products are sourced from suppliers
 * with costs tracked in Chinese Yuan (CNY). Each product can appear in
 * multiple {@link OrderItem}s across different orders.</p>
 */
@Entity
@Table(name = "products")
public class Product {

    /** Auto-generated primary key. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id")
    private Integer productId;

    /** Unique display name for the product (e.g. "National Geographic Penguin Shirt"). */
    @Column(name = "product_name", nullable = false, unique = true, length = 50)
    private String productName;

    /** Category grouping (e.g. "Shirts", "Accessories"). Nullable. */
    @Column(name = "product_type", length = 40)
    private String productType;

    /** Supplier cost in CNY. Used in profit calculations in database views. */
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal cost;

    /** Current inventory count. Defaults to 0. */
    @Column(name = "stock_quantity")
    private Integer stockQuantity = 0;

    public Product() {}

    public Integer getProductId() { return productId; }
    public void setProductId(Integer productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getProductType() { return productType; }
    public void setProductType(String productType) { this.productType = productType; }

    public BigDecimal getCost() { return cost; }
    public void setCost(BigDecimal cost) { this.cost = cost; }

    public Integer getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(Integer stockQuantity) { this.stockQuantity = stockQuantity; }
}