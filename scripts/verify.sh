#!/usr/bin/env bash
# Full verification gate: frontend, backend, worker.
# Exit 0 only if every layer passes. Prints a PASS/FAIL summary at the end.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

FRONTEND_RESULT="SKIPPED"
BACKEND_RESULT="SKIPPED"
WORKER_RESULT="SKIPPED"

run_layer() {
    local name="$1"; shift
    echo ""
    echo "======================================================================"
    echo "  $name"
    echo "======================================================================"
    local result="PASS"
    "$@" || result="FAIL"
    case "$name" in
        Frontend)   FRONTEND_RESULT="$result" ;;
        Backend)    BACKEND_RESULT="$result" ;;
        Worker)     WORKER_RESULT="$result" ;;
    esac
}

print_summary() {
    echo ""
    echo "======================================================================"
    echo "  SUMMARY"
    echo "======================================================================"
    echo "  Frontend:   $FRONTEND_RESULT"
    echo "  Backend:    $BACKEND_RESULT"
    echo "  Worker:     $WORKER_RESULT"
    if [ "$FRONTEND_RESULT" != "PASS" ] || [ "$BACKEND_RESULT" != "PASS" ] || [ "$WORKER_RESULT" != "PASS" ]; then
        exit 1
    fi
}
trap 'print_summary' EXIT

run_layer Frontend bash -c '
set -e
cd "'"$ROOT"'/frontend"
[ -d node_modules ] || npm ci
npm run lint
npx tsc -b
npm run test:run
'

run_layer Backend bash -c '
set -e
cd "'"$ROOT"'"
./gradlew :app:test
'

run_layer Worker bash -c '
set -e
cd "'"$ROOT"'"
docker compose up -d pubsub-emulator
docker compose run --rm worker-test
'
