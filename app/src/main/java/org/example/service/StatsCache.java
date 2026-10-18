package org.example.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.example.config.CacheConfig.StatsCacheProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.util.CloseableIterator;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Redis-backed cache for {@code GET /api/stats/*} JSON responses.
 *
 * <p>Responses are stored as their JSON body under {@code stats:v1:<endpoint>:<params>}
 * with a TTL, and the whole {@code stats:v1:*} namespace is evicted on any
 * order or product write. Redis being unreachable degrades to uncached
 * database reads — it never produces an error response.</p>
 *
 * <p>JSON is serialised with a copy of the Spring {@link ObjectMapper}
 * configured with {@code USE_BIG_DECIMAL_FOR_FLOATS}, so a cached body
 * deserialises into the same {@code List<Map<String, Object>>} shape (numbers
 * as {@code BigDecimal}, dates as {@code yyyy-MM-dd} strings) and re-serialises
 * byte-identically to the uncached response.</p>
 */
@Service
public class StatsCache {

    private static final Logger log = LoggerFactory.getLogger(StatsCache.class);
    private static final String PREFIX = "stats:v1:";
    private static final long WARN_INTERVAL_NANOS = 60_000_000_000L;

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final boolean enabled;
    private final Duration ttl;
    private final AtomicLong lastWarnAt = new AtomicLong();

    public StatsCache(StringRedisTemplate redis, ObjectMapper objectMapper,
                      StatsCacheProperties props) {
        this.redis = redis;
        this.objectMapper = objectMapper.copy()
                .configure(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS, true);
        this.enabled = props.enabled();
        this.ttl = props.ttl();
    }

    /**
     * Builds a cache key: {@code stats:v1:<endpoint>:<p1>|<p2>|...} where null
     * parameters render as {@code -}.
     */
    public static String key(String endpoint, Object... params) {
        StringBuilder sb = new StringBuilder(PREFIX).append(endpoint).append(':');
        for (int i = 0; i < params.length; i++) {
            if (i > 0) {
                sb.append('|');
            }
            sb.append(params[i] == null ? "-" : params[i]);
        }
        return sb.toString();
    }

    /**
     * Returns the cached value for {@code key}, computing and storing it via
     * {@code loader} on a miss. Falls back to {@code loader} on any Redis or
     * JSON failure and when the cache is disabled.
     */
    public <T> T cached(String key, TypeReference<T> type, Supplier<T> loader) {
        if (!enabled) {
            return loader.get();
        }
        try {
            String json = redis.opsForValue().get(key);
            if (json != null) {
                return objectMapper.readValue(json, type);
            }
            T value = loader.get();
            redis.opsForValue().set(key, objectMapper.writeValueAsString(value), ttl);
            return value;
        } catch (DataAccessException | JsonProcessingException e) {
            warnRateLimited("stats cache unavailable; serving uncached", e);
            return loader.get();
        }
    }

    /** Deletes every key under {@code stats:v1:*} via SCAN (never KEYS). Fail-soft. */
    public void evictAll() {
        if (!enabled) {
            return;
        }
        try {
            redis.execute((RedisCallback<Void>) connection -> {
                ScanOptions options = ScanOptions.scanOptions()
                        .match(PREFIX + "*").count(500).build();
                List<byte[]> batch = new ArrayList<>();
                try (CloseableIterator<byte[]> it = connection.keyCommands().scan(options)) {
                    while (it.hasNext()) {
                        batch.add(it.next());
                        if (batch.size() == 500) {
                            connection.keyCommands().del(batch.toArray(new byte[0][]));
                            batch.clear();
                        }
                    }
                }
                if (!batch.isEmpty()) {
                    connection.keyCommands().del(batch.toArray(new byte[0][]));
                }
                return null;
            });
        } catch (DataAccessException e) {
            warnRateLimited("stats cache eviction failed", e);
        }
    }

    /**
     * Evicts after the current transaction commits when one is active
     * (so a rolled-back write never evicts), else evicts immediately.
     * Call this from every mutating service method.
     */
    public void evictAfterCommit() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    evictAll();
                }
            });
        } else {
            evictAll();
        }
    }

    private void warnRateLimited(String message, Exception e) {
        long now = System.nanoTime();
        long last = lastWarnAt.get();
        if (now - last >= WARN_INTERVAL_NANOS && lastWarnAt.compareAndSet(last, now)) {
            log.warn("{}: {}", message, e.toString());
        }
    }
}
