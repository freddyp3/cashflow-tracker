package org.example.repository;

import org.example.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data JPA repository for {@link Product} CRUD operations. */
public interface ProductRepository extends JpaRepository<Product, Integer> {
}