package org.example.controller;

import org.example.entity.Product;
import org.example.service.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for product CRUD operations.
 *
 * <p>Endpoints:
 * <ul>
 *   <li>{@code GET    /api/products}      - List all products</li>
 *   <li>{@code GET    /api/products/{id}}  - Get product by ID</li>
 *   <li>{@code POST   /api/products}      - Create a new product (201)</li>
 *   <li>{@code PUT    /api/products/{id}}  - Update an existing product</li>
 *   <li>{@code DELETE /api/products/{id}}  - Delete a product (204)</li>
 * </ul></p>
 */
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    @GetMapping
    public List<Product> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Product getById(@PathVariable Integer id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Product create(@RequestBody Product product) {
        return service.create(product);
    }

    @PutMapping("/{id}")
    public Product update(@PathVariable Integer id, @RequestBody Product product) {
        return service.update(id, product);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Integer id) {
        service.delete(id);
    }
}