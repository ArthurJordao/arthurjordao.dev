#!/usr/bin/env bash
# Compares the routes built under dist/ against scripts/expected-routes.txt.
set -euo pipefail

DIST="${1:-dist}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXPECTED_FILE="$HERE/expected-routes.txt"

if [ ! -d "$DIST" ]; then
  echo "FAIL: '$DIST' does not exist - run 'npm run build' first" >&2
  exit 1
fi

actual="$(mktemp)"
expected="$(mktemp)"
trap 'rm -f "$actual" "$expected"' EXIT

find "$DIST" -name index.html \
  | sed -e "s|^$DIST||" -e "s|/index.html$|/|" \
  | sort > "$actual"

grep -v '^#' "$EXPECTED_FILE" | grep -v '^[[:space:]]*$' | sort > "$expected"

if diff -u --label expected "$expected" --label actual "$actual"; then
  echo "OK: $(wc -l < "$actual" | tr -d ' ') routes, all expected"
else
  echo "FAIL: routes diverge ('-' = expected but missing, '+' = built but unexpected)" >&2
  exit 1
fi
