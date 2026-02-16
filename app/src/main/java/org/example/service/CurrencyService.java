package org.example.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fetches live currency exchange rates to CAD using the Frankfurter API.
 *
 * <p>Results are cached in-memory with a 1-hour TTL using a thread-safe
 * {@link ConcurrentHashMap}. Returns {@code BigDecimal.ONE} for CAD-to-CAD
 * without making an API call.</p>
 *
 * <p>Used by the frontend's order form to convert USD/EUR/GBP/CNY amounts
 * to CAD before submission.</p>
 */
@Service
public class CurrencyService {

    private static final String API_URL = "https://api.frankfurter.app/latest?from=%s&to=CAD";
    private static final long CACHE_TTL_MS = 3600_000; // 1 hour

    private final RestTemplate restTemplate = new RestTemplate();
    private final Map<String, CachedRate> cache = new ConcurrentHashMap<>();

    public BigDecimal getRate(String fromCurrency) {
        String key = fromCurrency.toUpperCase();
        if ("CAD".equals(key)) {
            return BigDecimal.ONE;
        }

        CachedRate cached = cache.get(key);
        if (cached != null && !cached.isExpired()) {
            return cached.rate;
        }

        String url = String.format(API_URL, key);
        JsonNode response = restTemplate.getForObject(url, JsonNode.class);
        BigDecimal rate = new BigDecimal(response.get("rates").get("CAD").asText());
        cache.put(key, new CachedRate(rate, Instant.now()));
        return rate;
    }

    private static class CachedRate {
        final BigDecimal rate;
        final Instant fetchedAt;

        CachedRate(BigDecimal rate, Instant fetchedAt) {
            this.rate = rate;
            this.fetchedAt = fetchedAt;
        }

        boolean isExpired() {
            return Instant.now().toEpochMilli() - fetchedAt.toEpochMilli() > CACHE_TTL_MS;
        }
    }
}
