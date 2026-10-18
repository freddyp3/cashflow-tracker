package org.example.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for the stats-response Redis cache.
 *
 * <p>The {@link org.springframework.data.redis.core.StringRedisTemplate} bean
 * is auto-configured by Spring Boot; this class only registers the
 * {@code cache.stats.*} properties consumed by {@link org.example.service.StatsCache}.</p>
 */
@Configuration
@EnableConfigurationProperties(CacheConfig.StatsCacheProperties.class)
public class CacheConfig {

    /**
     * {@code cache.stats.enabled} toggles the cache entirely (fail-soft to
     * uncached reads when false); {@code cache.stats.ttl} bounds staleness.
     */
    @ConfigurationProperties(prefix = "cache.stats")
    public record StatsCacheProperties(boolean enabled, Duration ttl) {}
}
