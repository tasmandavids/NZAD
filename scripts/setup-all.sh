#!/usr/bin/env bash
# One command: remote migrations + seed (+ local if Docker is running).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Olune full database setup ==="
echo ""

bash scripts/db-sync.sh "$@" || {
  echo ""
  echo "Remote/local sync failed. If you lack CLI credentials, either:"
  echo "  1. Add GitHub secrets and run the 'Supabase Database Sync' workflow, or"
  echo "  2. Paste supabase/RUN_IN_DASHBOARD.sql into Supabase → SQL Editor"
  exit 1
}

echo ""
echo "=== Seeding test admin ==="
npm run seed:platform-admin

echo ""
echo "=== Done ==="
echo "  Email:    platform-admin@olune.test"
echo "  Password: testadmin123"
echo "  Console:  /platform and /portal/admin"
