package org.example.controller;

import org.example.repository.StatsRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for analytics endpoints backed by PostgreSQL views.
 *
 * <p>All endpoints return {@code List<Map<String, Object>>} for flexible JSON output.
 * Most support an optional {@code country} query parameter for filtering.
 * Time-series endpoints provide monthly and daily granularity.</p>
 *
 * <p>Endpoints:
 * <ul>
 *   <li>{@code GET /api/stats/products}                  - Product aggregates</li>
 *   <li>{@code GET /api/stats/platforms}                  - Platform aggregates</li>
 *   <li>{@code GET /api/stats/products-by-platform}       - Product x Platform cross-tab</li>
 *   <li>{@code GET /api/stats/platform-month}             - Platform time series (monthly)</li>
 *   <li>{@code GET /api/stats/platform-day}               - Platform time series (daily)</li>
 *   <li>{@code GET /api/stats/product-month}              - Product time series (monthly)</li>
 *   <li>{@code GET /api/stats/product-day}                - Product time series (daily)</li>
 *   <li>{@code GET /api/stats/product-by-platform-month}  - Product x Platform monthly</li>
 *   <li>{@code GET /api/stats/product-by-platform-day}    - Product x Platform daily</li>
 * </ul></p>
 */
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsRepository stats;

    public StatsController(StatsRepository stats) {
        this.stats = stats;
    }

    @GetMapping("/products")
    public List<Map<String, Object>> productStats(@RequestParam(required = false) String country) {
        return country != null ? stats.getProductStatsByCountry(country) : stats.getProductStats();
    }

    @GetMapping("/platforms")
    public List<Map<String, Object>> platformStats(@RequestParam(required = false) String country) {
        return country != null ? stats.getPlatformStatsByCountry(country) : stats.getPlatformStats();
    }

    @GetMapping("/products-by-platform")
    public List<Map<String, Object>> productByPlatformStats(
            @RequestParam(required = false) String platform,
            @RequestParam(required = false) String country) {
        return stats.getProductByPlatformStats(platform, country);
    }

    @GetMapping("/platform-month")
    public List<Map<String, Object>> platformMonth(
            @RequestParam(required = false) String platform,
            @RequestParam(required = false) String country) {
        return stats.getPlatformMonth(platform, country);
    }

    @GetMapping("/platform-day")
    public List<Map<String, Object>> platformDay(
            @RequestParam(required = false) String platform,
            @RequestParam(required = false) String country) {
        return stats.getPlatformDay(platform, country);
    }

    @GetMapping("/overall-month")
    public List<Map<String, Object>> overallMonth() {
        return stats.getOverallMonth();
    }

    @GetMapping("/product-month")
    public List<Map<String, Object>> productMonth(
            @RequestParam(required = false) Integer productId,
            @RequestParam(required = false) String country) {
        return stats.getProductMonth(productId, country);
    }

    @GetMapping("/product-day")
    public List<Map<String, Object>> productDay(
            @RequestParam(required = false) Integer productId,
            @RequestParam(required = false) String country) {
        return stats.getProductDay(productId, country);
    }

    @GetMapping("/product-by-platform-month")
    public List<Map<String, Object>> productByPlatformMonth(@RequestParam(required = false) String country) {
        return stats.getProductByPlatformMonth(country);
    }

    @GetMapping("/product-by-platform-day")
    public List<Map<String, Object>> productByPlatformDay(@RequestParam(required = false) String country) {
        return stats.getProductByPlatformDay(country);
    }
}
