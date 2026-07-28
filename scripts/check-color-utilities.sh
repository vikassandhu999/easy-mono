#!/usr/bin/env bash
# A colour utility whose token has no `--color-*` alias is a SILENT no-op.
#
# HeroUI ships `--color-accent: var(--accent)` and friends, and that alias — not
# the `--accent` declaration — is what makes `text-accent` generate a rule. It
# ships no alias for a handful of its own vars. So an app can declare
# `--success-secondary: #127c4e`, write `text-success-secondary` in twelve
# places, and get inherited near-black in all twelve. Nothing builds red,
# nothing lints, and it does not read as "broken" on screen — it reads as
# "that text is dark". clientapp shipped exactly that on the chat "Online"
# badge, completed-set ticks, weight deltas, the membership badge and the
# workout finish banner.
#
# The fix is one line per token in the app's `@theme inline`:
#   --color-success-secondary: var(--success-secondary);
#
# Signature this looks for: the app theme defines `--NAME`, some TSX uses
# `text-NAME` / `bg-NAME` / `border-NAME` / `fill-NAME` / `stroke-NAME` / `ring-NAME`,
# and NOTHING defines `--color-NAME`. Only flags tokens the app itself declared,
# so ordinary utilities (`text-sm`, `border-2`, `bg-red-500`) can't false-positive.
set -uo pipefail
cd "$(dirname "$0")/.."

status=0

for APP in coachapp-v2 clientapp-v2; do
  SRC="frontend/apps/$APP/src"
  THEME="$SRC/index.css"
  [ -f "$THEME" ] || continue

  # Resolve the @heroui/styles the app actually loads — several versions can sit
  # in the pnpm store at once (3.0.2 and 3.2.1 both do here) and their aliases differ.
  HEROUI_DIST=$(cd "frontend/apps/$APP" 2>/dev/null && node -e '
    const p = require.resolve("@heroui/styles/package.json");
    process.stdout.write(require("node:path").dirname(p) + "/dist");
  ' 2>/dev/null)
  [ -d "$HEROUI_DIST" ] || continue

  # Tokens the app declares as bare custom properties (`--muted: #767b85`).
  APP_TOKENS=$(grep -ohE '^\s*--[a-zA-Z0-9_-]+\s*:' "$THEME" | tr -d ' \t:' | sed 's/^--//' | sort -u)

  # Every `--color-*` alias in play: HeroUI's stylesheet plus the app's own @theme.
  ALIASES=$(
    {
      grep -ohE -- '--color-[a-zA-Z0-9_-]+\s*:' "$HEROUI_DIST"/*.css 2>/dev/null
      grep -rohE -- '--color-[a-zA-Z0-9_-]+\s*:' "$HEROUI_DIST"/themes 2>/dev/null
      grep -ohE -- '^\s*--color-[a-zA-Z0-9_-]+\s*:' "$THEME"
    } | tr -d ' \t:' | sed 's/^--color-//' | sort -u
  )

  # Colour utilities actually written in the app's TSX. Comments are stripped
  # first — these files document CSS in docblocks ("border-radius:12px -> ..."),
  # which otherwise reads as a `border-radius` utility.
  STRIPPED=$(find "$SRC" -name '*.tsx' -exec cat {} + 2>/dev/null |
    perl -0pe 's{/\*.*?\*/}{}gs' | sed -E 's://.*::')
  USED=$(echo "$STRIPPED" | grep -ohE '\b(text|bg|border|fill|stroke|ring|from|via|to)-[a-z][a-z0-9-]*' |
    sed -E 's/^[a-z]+-//' | sort -u)

  DEAD=""
  while read -r name; do
    [ -z "$name" ] && continue
    echo "$APP_TOKENS" | grep -qxF "$name" || continue      # not an app theme token — ignore
    echo "$ALIASES" | grep -qxF "$name" && continue          # has an alias — resolves fine
    HITS=$(echo "$STRIPPED" | grep -cE "\b(text|bg|border|fill|stroke|ring|from|via|to)-$name\b" 2>/dev/null | tr -d ' ')
    DEAD="$DEAD  $name  (declared --$name, no --color-$name, $HITS use(s))\n"
  done <<< "$USED"

  if [ -n "$DEAD" ]; then
    echo "$APP: colour utilities that silently do nothing:"
    printf "%b" "$DEAD"
    echo "  Fix: add to the @theme inline block in $THEME —"
    echo "       --color-<name>: var(--<name>);"
    echo ""
    status=1
  fi
done

exit $status
