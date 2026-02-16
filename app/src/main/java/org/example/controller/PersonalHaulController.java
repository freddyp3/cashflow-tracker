package org.example.controller;

import org.example.entity.PersonalHaul;
import org.example.service.PersonalHaulService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * REST controller for personal haul cash flow entries.
 *
 * <p>Endpoints:
 * <ul>
 *   <li>{@code GET    /api/personal-hauls}                    - List all entries</li>
 *   <li>{@code POST   /api/personal-hauls}                    - Create entry (201, timestamp auto-generated)</li>
 *   <li>{@code DELETE /api/personal-hauls?entryTime=...}      - Delete by ISO-8601 timestamp (204)</li>
 * </ul></p>
 */
@RestController
@RequestMapping("/api/personal-hauls")
public class PersonalHaulController {

    private final PersonalHaulService service;

    public PersonalHaulController(PersonalHaulService service) {
        this.service = service;
    }

    @GetMapping
    public List<PersonalHaul> getAll() {
        return service.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PersonalHaul create(@RequestBody PersonalHaul haul) {
        return service.create(haul.getFlowType(), haul.getAmount(), haul.getNote());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestParam String entryTime) {
        service.delete(OffsetDateTime.parse(entryTime));
    }
}
