package org.example.service;

import org.example.entity.Product;
import org.example.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

/**
 * Business logic for product CRUD operations.
 *
 * <p>Thin service layer wrapping {@link ProductRepository}. Update operations
 * merge fields from the incoming entity onto the existing persisted entity
 * to preserve the auto-generated ID.</p>
 */
@Service
public class ProductService {

    private static final Set<String> VALID_KINDS = Set.of("business", "personal");
    private static final String DEFAULT_KIND = "business";

    private final ProductRepository repo;
    private final StatsCache statsCache;

    public ProductService(ProductRepository repo, StatsCache statsCache) {
        this.repo = repo;
        this.statsCache = statsCache;
    }

    public List<Product> findAll() {
        return repo.findAll();
    }

    public Product findById(Integer id) {
        return repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
    }

    public Product create(Product product) {
        product.setKind(normalizeKind(product.getKind()));
        Product saved = repo.save(product);
        statsCache.evictAfterCommit();
        return saved;
    }

    public Product update(Integer id, Product updated) {
        Product existing = findById(id);
        existing.setProductName(updated.getProductName());
        existing.setProductType(updated.getProductType());
        existing.setCost(updated.getCost());
        existing.setStockQuantity(updated.getStockQuantity());
        existing.setKind(normalizeKind(updated.getKind()));
        Product saved = repo.save(existing);
        statsCache.evictAfterCommit();
        return saved;
    }

    public void delete(Integer id) {
        repo.deleteById(id);
        statsCache.evictAfterCommit();
    }

    private static String normalizeKind(String kind) {
        if (kind == null || kind.isBlank()) return DEFAULT_KIND;
        if (!VALID_KINDS.contains(kind)) {
            throw new IllegalArgumentException("Invalid product kind: " + kind);
        }
        return kind;
    }
}
