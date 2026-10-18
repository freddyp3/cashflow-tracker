# Stats endpoint cache benchmark

- Date: 2026-10-17
- Dataset: 20000 orders, 50000 order_items, 40 products
- JVM: openjdk version "21.0.12.1" 2026-08-18 LTS
- Requests per endpoint: 50 (after 3 warm-up)
- Machine: arm64 / Apple M3 Pro

| Endpoint | Uncached mean ms | Uncached p50 ms | Cached mean ms | Cached p50 ms | Speedup (mean) |
|----------|------------------|-----------------|----------------|---------------|----------------|
| /api/stats/products | 88.1 | 87.7 | 2.1 | 2.0 | 42.0x |
| /api/stats/platforms | 50.2 | 49.8 | 1.7 | 1.7 | 29.5x |
| /api/stats/products-by-platform | 93.8 | 93.4 | 2.1 | 2.0 | 44.7x |
| /api/stats/platform-month | 51.6 | 51.1 | 1.7 | 1.7 | 30.4x |
| /api/stats/platform-day | 60.6 | 60.5 | 4.4 | 4.3 | 13.8x |
| /api/stats/overall-month | 48.1 | 48.2 | 1.4 | 1.4 | 34.4x |
| /api/stats/product-month | 80.2 | 79.9 | 2.0 | 2.0 | 40.1x |
| /api/stats/product-day | 98.4 | 98.1 | 9.1 | 8.9 | 10.8x |
| /api/stats/product-by-platform-month | 92.6 | 92.2 | 2.8 | 2.8 | 33.1x |
| /api/stats/product-by-platform-day | 103.5 | 99.0 | 10.0 | 9.8 | 10.3x |

**Overall speedup (sum of means): 20.6x**

## Method

Synthetic dataset (`scripts/seed.sql`) loaded into the compose postgres;
the same jar ran twice on port 18080 with `STATS_CACHE_ENABLED=false`
then `true` (after `FLUSHDB`). Each endpoint got 3 warm-up requests,
then N timed requests via `curl -w %{time_total}`; mean and p50 reported.

## Caveats

Localhost single client, sequential requests, no concurrent writes;
worker write traffic is not simulated.
