package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Forward-geocodes order shipping locations via OpenStreetMap Nominatim.
 *
 * <p>{@link #geocode(String)} queries {@code {baseUrl}/search} and returns WGS-84
 * coordinates at scale 6, or {@link Optional#empty()} when the location is
 * unknown. Results are cached per trimmed location string, all HTTP requests are
 * throttled to at most one per second and sent with an identifying
 * {@code User-Agent}, and any error (transport, HTTP status, malformed body)
 * returns empty without being cached — callers must treat geocoding as
 * fail-soft. {@code null}, blank and {@code "TBD"} locations return empty
 * immediately without any HTTP request.</p>
 */
@Service
public class GeocodingService {

    /** WGS-84 coordinates of a geocoded location. */
    public record Coordinates(BigDecimal latitude, BigDecimal longitude) {}

    private static final Logger log = LoggerFactory.getLogger(GeocodingService.class);
    private static final String USER_AGENT =
            "cashflow-tracker/0.0.1 (order shipping-location geocoding)";
    private static final long MIN_INTERVAL_NANOS = 1_000_000_000L;

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final ConcurrentHashMap<String, Optional<Coordinates>> cache = new ConcurrentHashMap<>();
    private long lastRequestAt = -1;

    @Autowired
    public GeocodingService(RestTemplateBuilder builder,
                            @Value("${geocoding.base-url}") String baseUrl) {
        this(builder.connectTimeout(Duration.ofSeconds(5))
                .readTimeout(Duration.ofSeconds(5))
                .build(), baseUrl);
    }

    GeocodingService(RestTemplate restTemplate, String baseUrl) {
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl;
    }

    /**
     * Returns the coordinates of {@code location}, or empty when it cannot be
     * resolved. Never throws and never blocks on HTTP for {@code null}, blank
     * or {@code "TBD"} input.
     */
    public Optional<Coordinates> geocode(String location) {
        if (location == null) {
            return Optional.empty();
        }
        String trimmed = location.trim();
        if (trimmed.isEmpty() || trimmed.equalsIgnoreCase("TBD")) {
            return Optional.empty();
        }
        Optional<Coordinates> cached = cache.get(trimmed);
        if (cached != null) {
            return cached;
        }
        try {
            for (String candidate : candidates(trimmed)) {
                Optional<Coordinates> hit = search(candidate);
                if (hit.isPresent()) {
                    cache.put(trimmed, hit);
                    return hit;
                }
            }
            cache.put(trimmed, Optional.empty());
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Geocoding failed for location '{}': {}", trimmed, e.toString());
            return Optional.empty();
        }
    }

    /**
     * Query variants tried in order: the full string, the string with any
     * {@code N/A} segment removed, {@code first, last} when there are at least
     * three {@code ", "}-separated segments, and the string without its last
     * segment when there are at least two segments and the last looks like an
     * alpha-2/alpha-3 country code ({@code [A-Z]{2,3}}) — Nominatim does not
     * resolve those as free text. Duplicates are skipped.
     */
    private List<String> candidates(String location) {
        LinkedHashSet<String> candidates = new LinkedHashSet<>();
        candidates.add(location);
        String[] segments = location.split(", ");
        List<String> kept = new ArrayList<>();
        for (String segment : segments) {
            if (!segment.equalsIgnoreCase("N/A")) {
                kept.add(segment);
            }
        }
        if (!kept.isEmpty()) {
            candidates.add(String.join(", ", kept));
        }
        if (segments.length >= 3) {
            candidates.add(segments[0] + ", " + segments[segments.length - 1]);
        }
        if (segments.length >= 2 && segments[segments.length - 1].matches("[A-Z]{2,3}")) {
            candidates.add(String.join(", ", List.of(segments).subList(0, segments.length - 1)));
        }
        return List.copyOf(candidates);
    }

    private Optional<Coordinates> search(String candidate) {
        URI uri = UriComponentsBuilder.fromUriString(baseUrl)
                .path("/search")
                .queryParam("q", candidate)
                .queryParam("format", "jsonv2")
                .queryParam("limit", 1)
                .build().encode().toUri();
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT, USER_AGENT);
        JsonNode body = throttledExchange(uri, headers);
        if (body == null || !body.isArray() || body.isEmpty()) {
            return Optional.empty();
        }
        JsonNode first = body.get(0);
        BigDecimal latitude = new BigDecimal(first.get("lat").asText())
                .setScale(6, RoundingMode.HALF_UP);
        BigDecimal longitude = new BigDecimal(first.get("lon").asText())
                .setScale(6, RoundingMode.HALF_UP);
        return Optional.of(new Coordinates(latitude, longitude));
    }

    /** Issues the GET, first sleeping until at least one second has passed since the previous request left. */
    private synchronized JsonNode throttledExchange(URI uri, HttpHeaders headers) {
        if (lastRequestAt >= 0) {
            long elapsed = System.nanoTime() - lastRequestAt;
            if (elapsed < MIN_INTERVAL_NANOS) {
                try {
                    TimeUnit.NANOSECONDS.sleep(MIN_INTERVAL_NANOS - elapsed);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }
        try {
            return restTemplate.exchange(uri, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class)
                    .getBody();
        } finally {
            lastRequestAt = System.nanoTime();
        }
    }
}
