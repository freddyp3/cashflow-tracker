package org.example.repository;

import java.util.Optional;

import org.example.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data JPA repository for {@link Order} CRUD operations. */
public interface OrderRepository extends JpaRepository<Order, Integer> {

    /** Looks up an order by its marketplace identity {@code (platform, external_ref)}. */
    Optional<Order> findByPlatformAndExternalRef(String platform, String externalRef);
}
