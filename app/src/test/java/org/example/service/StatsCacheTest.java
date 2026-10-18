package org.example.service;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.config.CacheConfig.StatsCacheProperties;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class StatsCacheTest {

    private static final TypeReference<List<Map<String, Object>>> ROWS = new TypeReference<>() {};

    private StatsCache cache(StringRedisTemplate redis, boolean enabled) {
        return new StatsCache(redis, new ObjectMapper(),
                new StatsCacheProperties(enabled, Duration.ofMinutes(10)));
    }

    @Test
    void redisFailureFallsBackToLoaderExactlyOnce() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        when(redis.opsForValue()).thenThrow(new RedisConnectionFailureException("redis is down"));

        AtomicInteger loads = new AtomicInteger();
        List<Map<String, Object>> value = cache(redis, true).cached("stats:v1:platforms:-", ROWS,
                () -> {
                    loads.incrementAndGet();
                    return List.of(Map.of("platform", "Grailed"));
                });

        assertEquals(1, loads.get());
        assertEquals(List.of(Map.of("platform", "Grailed")), value);
    }

    @Test
    void disabledCacheNeverTouchesRedis() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);

        List<Map<String, Object>> value = cache(redis, false).cached("stats:v1:platforms:-", ROWS,
                () -> List.of(Map.of("platform", "Depop")));

        assertEquals(List.of(Map.of("platform", "Depop")), value);
        verifyNoInteractions(redis);
    }

    @Test
    void keyJoinsEndpointAndParamsWithDashForNull() {
        assertEquals("stats:v1:platform-month:-|Canada",
                StatsCache.key("platform-month", null, "Canada"));
        assertEquals("stats:v1:platforms:-", StatsCache.key("platforms", new Object[] {null}));
        assertEquals("stats:v1:overall-month:", StatsCache.key("overall-month"));
    }
}
