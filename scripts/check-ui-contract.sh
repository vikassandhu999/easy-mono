#!/usr/bin/env bash
# UI-CONTRACT §5 grep gate (design-handoff/UI-CONTRACT.md).
# Checks .tsx files for forbidden patterns: style={{}}, onClick, hex colors,
# px/rem arbitrary values, numbered color scales, HeroUI v2 imports, NumberField.
# Also enforces the theme freeze: index.css may not gain new scale tokens.
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
THEME=$APP/index.css
# Wrappers that legitimately contain the banned identifiers internally:
ALLOWLIST='@components/number-input|@components/form-fields/form-number-field|builder-kit/keyboard-sheet'

# Nearest branch point: prefer base-design's merge-base over main's when it is newer,
# so a port branch is only checked on ITS changes, not all of base-design's.
BASE=${UI_CONTRACT_BASE:-}
if [ -z "$BASE" ]; then
  BASE=$(git merge-base main HEAD 2>/dev/null || echo HEAD)
  B2=$(git merge-base base-design HEAD 2>/dev/null || true)
  if [ -n "$B2" ] && git merge-base --is-ancestor "$BASE" "$B2" 2>/dev/null; then BASE=$B2; fi
fi

# --- Theme freeze -----------------------------------------------------------
# The token scale is CLOSED (design-pro SKILL.md §1.0 / §5 rung 3). A port snaps
# to an existing token or stops and proposes a new one; it never registers one
# itself. Without this check the §1 px-literal ban does not remove per-screen
# pixel values, it only *relocates* them into the theme — which is exactly how
# this file grew 81 -> 164 tokens across nine screen ports.
# Deliberate scale change: run with UI_CONTRACT_SKIP_THEME=1, in its own commit.
# Scoped to HEAD, not the branch base: the question is "does THIS change add a
# token", so a long-lived port branch is not re-flagged for scale work already
# committed. Compares token NAMES, so reordering/comment churn is free.
if [ -z "${UI_CONTRACT_SKIP_THEME:-}" ] && [ -f "$THEME" ]; then
  names() { grep -oE '^[[:space:]]*--(text|radius|tracking|leading|color)-[a-z0-9-]+' | tr -d ' ' | sort -u; }
  WAS=$(git show "HEAD:$THEME" 2>/dev/null | names || true)
  NOW=$(names < "$THEME")
  ADDED=$(comm -13 <(echo "$WAS") <(echo "$NOW"))
  if [ -n "$ADDED" ]; then
    echo "$ADDED" | sed 's/^/  + /'
    echo ""
    echo "THEME FROZEN — this diff adds token(s) to $THEME."
    echo "The scale is closed. Snap to the nearest existing token, or propose the"
    echo "new one in the port ticket for the user to land in its own commit."
    echo "Deliberate scale change? UI_CONTRACT_SKIP_THEME=1 ./scripts/check-ui-contract.sh"
    exit 1
  fi
fi

if [ $# -gt 0 ]; then
  FILES="$*"
else
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
  `# Tailwind's stock type/radius ramps are a SECOND design system: text-sm is` \
  `# 14px, rounded-xl is 12px. Using them silently opts a screen out of the` \
  `# scale. Use the tokens (text-body, rounded-panel, ...). rounded-none is a` \
  `# real 0 and stays legal.` \
  -e '\b(text-(xs|sm|base|lg|xl|[2-9]xl)|rounded-(sm|md|lg|xl|[2-9]xl|full))\b' \
  `# Quarter-step spacing is a prototype pixel wearing Tailwind syntax — the` \
  `# px-literal ban never inspected it, so 36 distinct steps accumulated.` \
  `# Native 0.5 and 1.5 are fine; everything else snaps to an integer step.` \
  -e '(^|[^\w-])-?(gap|gap-x|gap-y|p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|space-x|space-y)-([2-9][0-9]*\.5|[0-9]+\.(25|75))\b' \
  | grep -v 'ui-contract-allow' \
  || true)

if [ -n "$OUT" ]; then
  echo "$OUT"
  echo ""
  echo "UI-CONTRACT violation — see design-handoff/UI-CONTRACT.md §1/§5. Use tokens/components, not raw styles."
  exit 1
fi
exit 0
