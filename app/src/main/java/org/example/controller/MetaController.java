package org.example.controller;

import org.example.repository.StatsRepository;
import org.example.service.PlatformService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for metadata used by frontend filter dropdowns.
 *
 * <p>Endpoints:
 * <ul>
 *   <li>{@code GET /api/meta/platforms}  - Distinct platform names</li>
 *   <li>{@code GET /api/meta/countries}  - Distinct country names (extracted from shipping_location)</li>
 * </ul></p>
 */
@RestController
@RequestMapping("/api/meta")
public class MetaController {

    private final StatsRepository stats;
    private final PlatformService platformService;

    public MetaController(StatsRepository stats, PlatformService platformService) {
        this.stats = stats;
        this.platformService = platformService;
    }

    @GetMapping("/platforms")
    public List<String> platforms() {
        return platformService.allPlatforms();
    }

    @GetMapping("/countries")
    public List<String> countries() {
        return stats.getDistinctCountries();
    }
}
