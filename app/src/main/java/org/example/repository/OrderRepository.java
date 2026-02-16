package org.example.repository;

import org.example.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data JPA repository for {@link Order} CRUD operations. */
public interface OrderRepository extends JpaRepository<Order, Integer> {
}
