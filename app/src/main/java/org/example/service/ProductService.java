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

    public ProductService(ProductRepository repo) {
        this.repo = repo;
    }

    public List<Product> findAll() {
        return repo.findAll();
    }

    public Product findById(Integer id) {
        return repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
    }

    public Product create(Product product) {
        return repo.save(product);
    }

    public Product update(Integer id, Product updated) {
        Product existing = findById(id);
        existing.setProductName(updated.getProductName());
        existing.setProductType(updated.getProductType());
        existing.setCost(updated.getCost());
        existing.setStockQuantity(updated.getStockQuantity());
        return repo.save(existing);
    }

    public void delete(Integer id) {
        repo.deleteById(id);
    }
}