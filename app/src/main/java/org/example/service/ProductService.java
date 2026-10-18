package org.example.service;

import org.example.entity.Product;
import org.example.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Business logic for product CRUD operations.
 *
 * <p>Thin service layer wrapping {@link ProductRepository}. Update operations
 * merge fields from the incoming entity onto the existing persisted entity
 * to preserve the auto-generated ID.</p>
 */
@Service
public class ProductService {

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
        Product saved = repo.save(existing);
        statsCache.evictAfterCommit();
        return saved;
    }

    public void delete(Integer id) {
        repo.deleteById(id);
        statsCache.evictAfterCommit();
    }
}
