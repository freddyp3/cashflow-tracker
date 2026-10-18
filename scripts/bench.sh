#!/usr/bin/env bash
# Benchmark: seed a synthetic dataset, run the API with the stats cache off and
# on, and write measured latencies + speedup into docs/benchmark.md.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

for cmd in docker java curl awk; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "bench.sh: '$cmd' is required" >&2
        exit 1
    fi
done

PORT=18080
N="${BENCH_N:-50}"
JAR="$ROOT/app/build/libs/app-0.0.1-SNAPSHOT.jar"
DOC="$ROOT/docs/benchmark.md"
PIDS=()

ENDPOINTS=(
    /api/stats/products
    /api/stats/platforms
    /api/stats/products-by-platform
    /api/stats/platform-month
    /api/stats/platform-day
    /api/stats/overall-month
    /api/stats/product-month
    /api/stats/product-day
    /api/stats/product-by-platform-month
    /api/stats/product-by-platform-day
)

cleanup() {
    for pid in "${PIDS[@]:-}"; do
        [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
    done
}
trap cleanup EXIT

psql_exec() {
    docker compose exec -T postgres psql -U postgres -d cashflow_tracker_db "$@"
}

wait_healthy() {
    local cid="$1" status
    for _ in $(seq 1 60); do
        status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || true)"
        [ "$status" = "healthy" ] || [ "$status" = "none" ] && return 0
        sleep 1
    done
    echo "bench.sh: $cid did not become healthy" >&2
    return 1
}

# Returns "$mean_ms $p50_ms" for a file of curl time_total seconds.
stats_of() {
    sort -n "$1" | awk '
        { a[NR] = $1; s += $1 }
        END {
            if (NR == 0) { print "0 0"; exit }
            p50 = (NR % 2) ? a[(NR+1)/2] : (a[NR/2] + a[NR/2+1]) / 2
            printf "%.1f %.1f", s / NR * 1000, p50 * 1000
        }'
}

# run_bench <cache-enabled> <output-dir>: starts the jar, measures all
# endpoints, leaves one <endpoint-slug>.times file per endpoint, kills the jar.
run_bench() {
    local enabled="$1"
    local outdir="$2"
    local log="/tmp/bench-app-$enabled.log"
    mkdir -p "$outdir"

    env DB_URL=jdbc:postgresql://localhost:5433/cashflow_tracker_db \
        DB_USER=postgres DB_PASSWORD=postgres \
        REDIS_HOST=localhost STATS_CACHE_ENABLED="$enabled" \
        java -jar "$JAR" --server.port="$PORT" >"$log" 2>&1 &
    local pid=$!
    PIDS+=("$pid")

    local ready=0
    for _ in $(seq 1 60); do
        if curl -sf -o /dev/null "http://localhost:$PORT/api/stats/platforms"; then
            ready=1
            break
        fi
        sleep 1
    done
    if [ "$ready" != "1" ]; then
        echo "bench.sh: app (cache=$enabled) did not come up; see $log" >&2
        return 1
    fi

    for ep in "${ENDPOINTS[@]}"; do
        local slug f
        slug="$(basename "$ep")"
        f="$outdir/$slug.times"
        : >"$f"
        for _ in 1 2 3; do curl -o /dev/null -s "http://localhost:$PORT$ep"; done
        for _ in $(seq 1 "$N"); do
            curl -o /dev/null -s -w '%{time_total}\n' "http://localhost:$PORT$ep" >>"$f"
        done
        echo "$ep measured (cache=$enabled)"
    done

    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    PIDS=("${PIDS[@]:0:${#PIDS[@]}-1}")
}

echo "==> starting postgres + redis"
docker compose up -d postgres redis >/dev/null
wait_healthy "$(docker compose ps -q postgres)"
wait_healthy "$(docker compose ps -q redis)"

echo "==> applying migrations if needed"
has_lat="$(psql_exec -Atc \
    "SELECT count(*) FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'latitude'")"
if [ "$has_lat" = "0" ]; then
    psql_exec -f - < app/database/migrations/002_external_ref.sql
    psql_exec -f - < app/database/migrations/003_coordinates_platforms.sql
fi

echo "==> loading seed data"
psql_exec -f - < scripts/seed.sql >/dev/null

echo "==> building jar"
./gradlew :app:bootJar -q
if [ ! -f "$JAR" ]; then
    echo "bench.sh: expected jar not found at $JAR" >&2
    ls app/build/libs >&2 || true
    exit 1
fi

PRODUCTS="$(psql_exec -Atc 'SELECT count(*) FROM products')"
ORDERS="$(psql_exec -Atc 'SELECT count(*) FROM orders')"
ITEMS="$(psql_exec -Atc 'SELECT count(*) FROM order_items')"

TMP="$(mktemp -d)"
echo "==> uncached run (STATS_CACHE_ENABLED=false, N=$N)"
run_bench false "$TMP/uncached"

echo "==> flushing redis, cached run (STATS_CACHE_ENABLED=true)"
docker compose exec -T redis redis-cli FLUSHDB >/dev/null
run_bench true "$TMP/cached"

JVM_VERSION="$(java -version 2>&1 | head -1)"
MACHINE="$(uname -m)"
CPU="$(sysctl -n machdep.cpu.brand_string 2>/dev/null || uname -p)"
DATE="$(date +%Y-%m-%d)"

{
    echo "# Stats endpoint cache benchmark"
    echo
    echo "- Date: $DATE"
    echo "- Dataset: $ORDERS orders, $ITEMS order_items, $PRODUCTS products"
    echo "- JVM: $JVM_VERSION"
    echo "- Requests per endpoint: $N (after 3 warm-up)"
    echo "- Machine: $MACHINE / $CPU"
    echo
    echo '| Endpoint | Uncached mean ms | Uncached p50 ms | Cached mean ms | Cached p50 ms | Speedup (mean) |'
    echo '|----------|------------------|-----------------|----------------|---------------|----------------|'
} > "$DOC"

declare -a ROWS=()
TOTAL_UN=0
TOTAL_CA=0
for ep in "${ENDPOINTS[@]}"; do
    slug="$(basename "$ep")"
    read -r un_mean un_p50 <<<"$(stats_of "$TMP/uncached/$slug.times")"
    read -r ca_mean ca_p50 <<<"$(stats_of "$TMP/cached/$slug.times")"
    speedup="$(awk -v u="$un_mean" -v c="$ca_mean" 'BEGIN { printf "%.1f", (c > 0) ? u / c : 0 }')"
    TOTAL_UN="$(awk -v t="$TOTAL_UN" -v v="$un_mean" 'BEGIN { print t + v }')"
    TOTAL_CA="$(awk -v t="$TOTAL_CA" -v v="$ca_mean" 'BEGIN { print t + v }')"
    ROWS+=("| $ep | $un_mean | $un_p50 | $ca_mean | $ca_p50 | ${speedup}x |")
done

for row in "${ROWS[@]}"; do
    echo "$row" >> "$DOC"
done
OVERALL="$(awk -v u="$TOTAL_UN" -v c="$TOTAL_CA" 'BEGIN { printf "%.1f", (c > 0) ? u / c : 0 }')"
{
    echo
    echo "**Overall speedup (sum of means): ${OVERALL}x**"
    echo
    echo '## Method'
    echo
    echo 'Synthetic dataset (`scripts/seed.sql`) loaded into the compose postgres;'
    echo 'the same jar ran twice on port 18080 with `STATS_CACHE_ENABLED=false`'
    echo 'then `true` (after `FLUSHDB`). Each endpoint got 3 warm-up requests,'
    echo 'then N timed requests via `curl -w %{time_total}`; mean and p50 reported.'
    echo
    echo '## Caveats'
    echo
    echo 'Localhost single client, sequential requests, no concurrent writes;'
    echo 'worker write traffic is not simulated.'
} >> "$DOC"

echo
cat "$DOC"
echo "==> wrote $DOC"
