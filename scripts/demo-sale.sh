#!/usr/bin/env bash
# Make a sale email "arrive" in the demo stack: copy the .eml into the
# worker's mounted inbox with a fresh timestamped name, then publish a
# Gmail-style push notification to the Pub/Sub emulator.
set -euo pipefail
cd "$(dirname "$0")/.."

EMAIL="demo/emails/grailed-sale.eml"
KEEP_REF=0
EMULATOR="localhost:8085"
PROJECT="cashflow-local"
TOPIC="gmail-notifications"

while [ $# -gt 0 ]; do
    case "$1" in
        --email) EMAIL="$2"; shift 2 ;;
        --keep-ref) KEEP_REF=1; shift ;;
        --emulator) EMULATOR="$2"; shift 2 ;;
        --project) PROJECT="$2"; shift 2 ;;
        --topic) TOPIC="$2"; shift 2 ;;
        *) echo "usage: $0 [--email path] [--keep-ref] [--emulator host:port] [--project id] [--topic name]" >&2; exit 1 ;;
    esac
done

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
NAME="${STAMP}-grailed"
OUT="demo/inbox/${NAME}.eml"
REF="204817365"
if [ "$KEEP_REF" -eq 0 ]; then
    REF=$((RANDOM % 900000000 + 100000000))
fi

mkdir -p demo/inbox
NOW=$(date -u '+%a, %d %b %Y %H:%M:%S +0000')
sed -e "s/^Date: .*/Date: ${NOW}/" \
    -e "s/Listing ID: 204817365/Listing ID: ${REF}/" \
    -e "s/<20260925181452\.demo0001@grailed\.com>/<${STAMP}@grailed.com>/" \
    "$EMAIL" > "$OUT"

DATA=$(printf '{"emailAddress":"seller@example.test","historyId":"%s"}' "$NAME" | base64 | tr -d '\n')
curl -sf -X POST "http://${EMULATOR}/v1/projects/${PROJECT}/topics/${TOPIC}:publish" \
    -H 'Content-Type: application/json' \
    -d "{\"messages\":[{\"data\":\"${DATA}\"}]}"

echo "Published notification for ${OUT} (listing ${REF}). Watch: docker compose -p cashflow-demo logs -f worker"
