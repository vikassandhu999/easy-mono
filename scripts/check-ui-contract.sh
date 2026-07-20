#!/usr/bin/env bash
# UI-CONTRACT §5 grep gate (design-handoff/UI-CONTRACT.md).
# Checks .tsx files for forbidden patterns: style={{}}, onClick, hex colors,
# px/rem arbitrary values, numbered color scales, HeroUI v2 imports, NumberField.
#
# Usage:
#   ./scripts/check-ui-contract.sh file1.tsx file2.tsx   # explicit files
#   ./scripts/check-ui-contract.sh                        # files changed vs main
#
# UI-CONTRACT §1 allows a single genuinely dynamic style value case-by-case
# (e.g. a ratio-bar flexGrow). Mark the approved line with a trailing
# `/* ui-contract-allow */` comment to exempt it.
#
# ponytail: scoped to changed files, not the whole tree — legacy code has ~175
# pre-existing hits; widen to a full-tree gate once the port sweep is done.
set -uo pipefail
cd "$(dirname "$0")/.."

APP=frontend/apps/coachapp-v2/src
# Wrappers that legitimately contain the banned identifiers internally:
ALLOWLIST='@components/number-input|@components/form-fields/form-number-field|builder-kit/keyboard-sheet'

if [ $# -gt 0 ]; then
  FILES="$*"
else
  # Nearest branch point: prefer base-design's merge-base over main's when it is newer,
  # so a port branch is only checked on ITS changes, not all of base-design's.
  BASE=${UI_CONTRACT_BASE:-}
  if [ -z "$BASE" ]; then
    BASE=$(git merge-base main HEAD 2>/dev/null || echo HEAD)
    B2=$(git merge-base base-design HEAD 2>/dev/null || true)
    if [ -n "$B2" ] && git merge-base --is-ancestor "$BASE" "$B2" 2>/dev/null; then BASE=$B2; fi
  fi
  FILES=$(git diff --name-only "$BASE" -- "$APP" | grep '\.tsx$' || true)
fi

FILES=$(echo "$FILES" | tr ' ' '\n' | grep -vE "$ALLOWLIST" | while read -r f; do [ -f "$f" ] && echo "$f"; done || true)
[ -z "$FILES" ] && exit 0

OUT=$(echo "$FILES" | xargs rg -n --no-messages \
  -e 'style=\{\{' \
  -e 'onClick=' \
  -e '#[0-9a-fA-F]{3,8}\b' \
  -e '\[[0-9.]+(px|rem|em)\]' \
  -e '(bg|text|border|ring)-(primary|neutral|default|success|warning|danger)-[0-9]{2,3}' \
  -e '@nextui-org/' -e 'HeroUIProvider' -e 'framer-motion' \
  -e '\bNumberField\b' \
  | grep -v 'ui-contract-allow' \
  || true)

if [ -n "$OUT" ]; then
  echo "$OUT"
  echo ""
  echo "UI-CONTRACT violation — see design-handoff/UI-CONTRACT.md §1/§5. Use tokens/components, not raw styles."
  exit 1
fi
exit 0
