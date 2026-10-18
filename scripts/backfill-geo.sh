#!/usr/bin/env bash
# Backfills orders.latitude / orders.longitude for all distinct shipping
# locations via the same candidate rules as GeocodingService, against a real
# database. Applies migrations 002 + 003 first (both idempotent). Throttled to
# one request per ~1.1 s with an identifying User-Agent.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MIGRATIONS_DIR="${REPO_ROOT}/app/database/migrations"
GEOCODING_URL="${GEOCODING_URL:-https://nominatim.openstreetmap.org}"
USER_AGENT='cashflow-tracker/0.0.1 (order shipping-location geocoding)'

YES=0
for arg in "$@"; do
    case "$arg" in
        --yes) YES=1 ;;
        *) echo "usage: DB_URL=jdbc:postgresql://host:port/dbname $0 [--yes]" >&2; exit 2 ;;
    esac
done

if [ -z "${DB_URL:-}" ]; then
    echo "error: DB_URL is not set (e.g. DB_URL=jdbc:postgresql://localhost:5432/cashflow_tracker_db)" >&2
    exit 2
fi

URI="${DB_URL#jdbc:}"
DBNAME="${URI##*/}"
DBNAME="${DBNAME%%\?*}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

echo "Back up the database first:"
echo "  pg_dump \"${URI}\" -Fc -f backup-${DBNAME}-${STAMP}.dump"
if [ "$YES" -ne 1 ]; then
    read -r -p "Dump taken? [y/N] " answer
    if [ "$answer" != "y" ]; then
        echo "aborted — take the dump, then re-run" >&2
        exit 3
    fi
fi

echo "Applying idempotent migrations 002_external_ref.sql and 003_coordinates_platforms.sql"
psql -v ON_ERROR_STOP=1 -X -q "${URI}" -f "${MIGRATIONS_DIR}/002_external_ref.sql"
psql -v ON_ERROR_STOP=1 -X -q "${URI}" -f "${MIGRATIONS_DIR}/003_coordinates_platforms.sql"

LOCATIONS=()
while IFS= read -r line; do
    LOCATIONS+=("$line")
done < <(psql -v ON_ERROR_STOP=1 -X -q -At "${URI}" -c "
    SELECT DISTINCT shipping_location
    FROM orders
    WHERE shipping_location IS NOT NULL
      AND shipping_location <> 'TBD'
      AND btrim(shipping_location) <> ''
      AND latitude IS NULL
    ORDER BY 1")

# Prints the deduplicated candidate queries for a location, one per line:
# the full string, the string with any ", "-separated N/A segment removed,
# "first, last" when there are at least three segments, and all segments but
# the last when the last looks like an alpha-2/alpha-3 country code.
candidates() {
    local loc="$1"
    local sep=$'\x1f'
    local -a segs kept out
    IFS="${sep}" read -r -a segs <<< "${loc//, /${sep}}"
    out+=("${loc}")
    kept=()
    local s removed=0
    for s in "${segs[@]}"; do
        if [ "$(printf '%s' "$s" | tr '[:lower:]' '[:upper:]')" = "N/A" ]; then
            removed=1
        else
            kept+=("$s")
        fi
    done
    if [ "$removed" -eq 1 ] && [ "${#kept[@]}" -gt 0 ]; then
        local joined=""
        for s in "${kept[@]}"; do
            joined="${joined:+$joined, }$s"
        done
        out+=("$joined")
    fi
    if [ "${#segs[@]}" -ge 3 ]; then
        out+=("${segs[0]}, ${segs[$((${#segs[@]} - 1))]}")
    fi
    local last="${segs[$((${#segs[@]} - 1))]}"
    if [ "${#segs[@]}" -ge 2 ] && [[ "$last" =~ ^[A-Z]{2,3}$ ]]; then
        local without_last="" i
        for ((i = 0; i < ${#segs[@]} - 1; i++)); do
            without_last="${without_last:+$without_last, }${segs[$i]}"
        done
        out+=("$without_last")
    fi
    printf '%s\n' "${out[@]}" | awk '!seen[$0]++'
}

total=0
geocoded=0
missed=0
for loc in "${LOCATIONS[@]}"; do
    [ -n "$loc" ] || continue
    total=$((total + 1))
    hit=""
    while IFS= read -r candidate; do
        response="$(curl -sS -G --data-urlencode "q=${candidate}" \
            -H "User-Agent: ${USER_AGENT}" \
            "${GEOCODING_URL}/search?format=jsonv2&limit=1" || true)"
        sleep 1.1
        latlon="$(printf '%s' "$response" | jq -r '.[0] // empty | "\(.lat) \(.lon)"' 2>/dev/null || true)"
        if [ -n "$latlon" ]; then
            hit="$latlon"
            break
        fi
    done < <(candidates "$loc")
    if [ -n "$hit" ]; then
        lat="${hit%% *}"
        lon="${hit##* }"
        printf "UPDATE orders SET latitude = :'lat', longitude = :'lon' WHERE shipping_location = :'loc';\n" \
            | psql -v ON_ERROR_STOP=1 -X -q "${URI}" \
                -v loc="$loc" -v lat="$lat" -v lon="$lon"
        echo "OK ${lat} ${lon}  ${loc}"
        geocoded=$((geocoded + 1))
    else
        echo "MISS  ${loc}"
        missed=$((missed + 1))
    fi
done

echo "locations=${total} geocoded=${geocoded} missed=${missed}"
remaining="$(psql -v ON_ERROR_STOP=1 -X -q -At "${URI}" -c \
    "SELECT count(DISTINCT shipping_location) FROM orders WHERE latitude IS NULL AND shipping_location <> 'TBD'")"
echo "still-ungeocoded distinct locations: ${remaining}"

if [ "$missed" -gt 0 ]; then
    exit 1
fi
exit 0
