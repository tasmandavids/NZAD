#!/usr/bin/env bash
# Merge a feature branch into main with an explicit merge commit (no fast-forward).
#
# Usage:
#   ./scripts/merge-to-main.sh cursor/my-feature-branch
#
# Requires a clean working tree on the source branch or the branch name as $1.

set -euo pipefail
cd "$(dirname "$0")/.."

BRANCH="${1:-}"
if [[ -z "$BRANCH" ]]; then
  echo "Usage: $0 <branch-to-merge>"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree is dirty — commit or stash changes first."
  exit 1
fi

if ! git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "Branch not found locally: $BRANCH"
  exit 1
fi

echo "Fetching latest from origin…"
git fetch origin main "$BRANCH"

git checkout main
git pull --ff-only origin main

echo "Merging $BRANCH into main (--no-ff)…"
git merge --no-ff "$BRANCH" -m "$(cat <<EOF
Merge branch '$BRANCH'

EOF
)"

echo "Pushing main…"
git push origin main

echo ""
echo "Done. main now includes $BRANCH with a merge commit."
echo "CI + Supabase sync will run on GitHub Actions."
