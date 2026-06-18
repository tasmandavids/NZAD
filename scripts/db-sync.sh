#!/usr/bin/env bash
# Apply Olune migrations locally (Docker) and to linked Supabase remote.
#
# Prerequisites (.env.local):
#   SUPABASE_ACCESS_TOKEN   — from https://supabase.com/dashboard/account/tokens
#   SUPABASE_DB_PASSWORD    — Database password (Project Settings → Database)
#
# Optional:
#   SUPABASE_PROJECT_REF    — defaults to wnoxcwihrzbxvogvmhqv from config.toml
#
# Usage:
#   ./scripts/db-sync.sh           # remote + local (if Docker running)
#   ./scripts/db-sync.sh --remote  # Supabase cloud only
#   ./scripts/db-sync.sh --local   # local Supabase only

set -euo pipefail
cd "$(dirname "$0")/.."

REMOTE_ONLY=false
LOCAL_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --remote) REMOTE_ONLY=true ;;
    --local)  LOCAL_ONLY=true ;;
  esac
done

# Load env from .env.local when present
if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-wnoxcwihrzbxvogvmhqv}"

push_remote() {
  echo "── Remote Supabase ($PROJECT_REF) ──"

  if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    echo "Missing SUPABASE_ACCESS_TOKEN — run: npx supabase login"
    echo "  or add SUPABASE_ACCESS_TOKEN to .env.local"
    return 1
  fi

  export SUPABASE_ACCESS_TOKEN

  if [[ ! -f supabase/.temp/project-ref ]]; then
    echo "Linking project…"
    if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
      npx supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD" --yes
    else
      npx supabase link --project-ref "$PROJECT_REF" --yes
    fi
  fi

  echo "Pushing migrations…"
  if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
    npx supabase db push --linked --password "$SUPABASE_DB_PASSWORD" --yes
  else
    npx supabase db push --linked --yes
  fi

  echo "Remote migration status:"
  npx supabase migration list --linked
}

push_local() {
  echo "── Local Supabase (Docker) ──"

  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker not installed — skip local, or install Docker Desktop and re-run."
    return 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running — start Docker Desktop and re-run."
    return 1
  fi

  if ! npx supabase status >/dev/null 2>&1; then
    echo "Starting local Supabase…"
    npx supabase start
  fi

  echo "Resetting local DB (applies all migrations + seed.sql)…"
  npx supabase db reset --yes

  echo "Local migration status:"
  npx supabase migration list --local
}

FAIL=0

if [[ "$LOCAL_ONLY" == true ]]; then
  push_local || FAIL=1
elif [[ "$REMOTE_ONLY" == true ]]; then
  push_remote || FAIL=1
else
  push_remote || FAIL=1
  echo ""
  push_local || echo "(Local sync skipped — see message above.)"
fi

if [[ "$FAIL" -ne 0 ]]; then
  exit 1
fi

echo ""
echo "Done."
