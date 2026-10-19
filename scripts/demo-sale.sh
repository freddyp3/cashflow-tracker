#!/usr/bin/env bash
# Make a sale email "arrive" in the demo stack: copy the .eml into the
# worker's mounted inbox with a fresh timestamped name, then publish a
# Gmail-style push notification to the Pub/Sub emulator. With --gmail the
# same generated .eml is also delivered to a real Gmail inbox over SMTP
# (display surface only — the worker still reads the directory source).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
    set -a
    . ./.env
    set +a
fi

EMAIL="demo/emails/grailed-sale.eml"
KEEP_REF=0
GMAIL=0
NO_PUBLISH=0
EMULATOR="localhost:8085"
PROJECT="cashflow-local"
TOPIC="gmail-notifications"

while [ $# -gt 0 ]; do
    case "$1" in
        --email) EMAIL="$2"; shift 2 ;;
        --keep-ref) KEEP_REF=1; shift ;;
        --gmail) GMAIL=1; shift ;;
        --no-publish) NO_PUBLISH=1; shift ;;
        --emulator) EMULATOR="$2"; shift 2 ;;
        --project) PROJECT="$2"; shift 2 ;;
        --topic) TOPIC="$2"; shift 2 ;;
        *) echo "usage: $0 [--email path] [--keep-ref] [--gmail] [--no-publish] [--emulator host:port] [--project id] [--topic name]" >&2; exit 1 ;;
    esac
done

DEMO_GMAIL_TO="${DEMO_GMAIL_TO:-${DEMO_GMAIL_USER:-}}"
if [ "$GMAIL" -eq 1 ]; then
    if [ -z "${DEMO_GMAIL_USER:-}" ] || [ -z "${DEMO_GMAIL_APP_PASSWORD:-}" ]; then
        echo "usage: --gmail requires DEMO_GMAIL_USER and DEMO_GMAIL_APP_PASSWORD (in .env or the environment; see .env.example)" >&2
        exit 1
    fi
fi

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

if [ "$GMAIL" -eq 1 ]; then
    NETRC=""
    SMTP_OUT="${OUT}.smtp"
    cleanup() { [ -n "$NETRC" ] && rm -f "$NETRC"; rm -f "$SMTP_OUT"; }
    trap cleanup EXIT
    sed "s/^To: .*/To: ${DEMO_GMAIL_TO}/" "$OUT" > "$SMTP_OUT"
    NETRC=$(mktemp); chmod 600 "$NETRC"
    printf 'machine smtp.gmail.com login %s password %s\n' "$DEMO_GMAIL_USER" "$DEMO_GMAIL_APP_PASSWORD" > "$NETRC"
    if ! curl -sS --ssl-reqd --url 'smtps://smtp.gmail.com:465' --netrc-file "$NETRC" \
         --mail-from "$DEMO_GMAIL_USER" --mail-rcpt "$DEMO_GMAIL_TO" --upload-file "$SMTP_OUT"; then
        echo "gmail send failed (check DEMO_GMAIL_USER / DEMO_GMAIL_APP_PASSWORD; 2-Step Verification must be on)" >&2
        exit 1
    fi
fi

if [ "$NO_PUBLISH" -eq 0 ]; then
    DATA=$(printf '{"emailAddress":"seller@example.test","historyId":"%s"}' "$NAME" | base64 | tr -d '\n')
    curl -sf -X POST "http://${EMULATOR}/v1/projects/${PROJECT}/topics/${TOPIC}:publish" \
        -H 'Content-Type: application/json' \
        -d "{\"messages\":[{\"data\":\"${DATA}\"}]}"
fi

if [ "$GMAIL" -eq 1 ] && [ "$NO_PUBLISH" -eq 0 ]; then
    echo "Sent to ${DEMO_GMAIL_TO} and published notification for ${OUT} (listing ${REF})."
elif [ "$GMAIL" -eq 1 ]; then
    echo "Sent to ${DEMO_GMAIL_TO} (${OUT}, listing ${REF}; not published, --no-publish)."
elif [ "$NO_PUBLISH" -eq 1 ]; then
    echo "Wrote ${OUT} (listing ${REF}); not published (--no-publish)."
else
    echo "Published notification for ${OUT} (listing ${REF}). Watch: docker compose -p cashflow-demo logs -f worker"
fi
