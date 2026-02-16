package org.example.controller;

import org.example.dto.OrderRequest;
import org.example.dto.OrderResponse;
import org.example.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for order CRUD operations.
 *
 * <p>Returns {@link OrderResponse} DTOs (not raw entities) to include
 * denormalized product names in each line item. Create/update accept
 * {@link OrderRequest} with nested item arrays.</p>
 *
 * <p>Endpoints:
 * <ul>
 *   <li>{@code GET    /api/orders}      - List all orders with items</li>
 *   <li>{@code GET    /api/orders/{id}}  - Get order by ID</li>
 *   <li>{@code POST   /api/orders}      - Create order with items (201)</li>
 *   <li>{@code PUT    /api/orders/{id}}  - Update order (replaces all items)</li>
 *   <li>{@code DELETE /api/orders/{id}}  - Delete order and items (204)</li>
 * </ul></p>
 */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    @GetMapping
    public List<OrderResponse> getAll() {
        return service.findAll().stream()
                .map(OrderResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public OrderResponse getById(@PathVariable Integer id) {
        return OrderResponse.from(service.findById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@RequestBody OrderRequest request) {
        return OrderResponse.from(service.create(request));
    }

    @PutMapping("/{id}")
    public OrderResponse update(@PathVariable Integer id, @RequestBody OrderRequest request) {
        return OrderResponse.from(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Integer id) {
        service.delete(id);
    }
}
