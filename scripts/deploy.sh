#!/usr/bin/env bash
# MyTube deployment helper
# Usage: ./scripts/deploy.sh [migrate|check|all]

set -e

cd "$(dirname "$0")/.."

case "${1:-check}" in
  migrate)
    if [ -z "$DATABASE_URL" ]; then
      echo "Set DATABASE_URL first: export DATABASE_URL='postgresql://...'"
      exit 1
    fi
    echo "[deploy] Running database migrations..."
    cd backend && npm run db:migrate
    echo "[deploy] Migrations complete."
    ;;
  check)
    echo "[deploy] Building frontend..."
    npm run build
    echo "[deploy] Building backend..."
    npm run build:backend
    echo "[deploy] All builds OK."
    if [ -n "$DATABASE_URL" ]; then
      echo "[deploy] DATABASE_URL set - run './scripts/deploy.sh migrate' to migrate."
    fi
    ;;
  all)
    ./scripts/deploy.sh check
    if [ -n "$DATABASE_URL" ]; then
      ./scripts/deploy.sh migrate
    fi
    echo "[deploy] Ready. See docs/DEPLOY.md for next steps."
    ;;
  *)
    echo "Usage: $0 {migrate|check|all}"
    echo "  migrate - run DB migrations (requires DATABASE_URL)"
    echo "  check   - verify frontend + backend build"
    echo "  all     - check + migrate"
    exit 1
    ;;
esac
