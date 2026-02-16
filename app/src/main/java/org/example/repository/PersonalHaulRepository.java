package org.example.repository;

import org.example.entity.PersonalHaul;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;

/** Spring Data JPA repository for {@link PersonalHaul}. Keyed by {@link OffsetDateTime} timestamp. */
public interface PersonalHaulRepository extends JpaRepository<PersonalHaul, OffsetDateTime> {
}
