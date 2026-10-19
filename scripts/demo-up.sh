#!/usr/bin/env bash
# Bring up the isolated demo stack (project "cashflow-demo": seeded dummy
# data + worker reading .eml files from demo/inbox).
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose -p cashflow-demo -f docker-compose.yml -f docker-compose.demo.yml"

if [ "${1:-}" = "--fresh" ]; then
    echo "Removing the cashflow-demo project's containers and volumes (fresh seed)…"
    $COMPOSE down -v
fi

if ! $COMPOSE up -d --build --wait; then
    cat >&2 <<'EOF'
demo stack failed to start. If the error is a port conflict (3000/5433/6379/
8080/8085/8090), stop the default project first: docker compose down
EOF
    exit 1
fi

cat <<'EOF'
Demo stack is up:
  UI:     http://localhost:3000
  API:    http://localhost:8080/api/health
  Worker: http://localhost:8090/health
Next: ./scripts/demo-sale.sh
EOF
