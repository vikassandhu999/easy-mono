#!/usr/bin/env bash
# Every class selector the app's theme aims at a HeroUI component must actually
# exist in HeroUI's stylesheet.
#
# A wrong one fails SILENTLY: nothing builds red, nothing lints, the page simply
# keeps whatever it had. Three shipped that way — `.search-field-group` (really
# `.search-field__group`), `.tab` (`.tabs__tab`) and `.alert-dialog`
# (`.alert-dialog__dialog`). The last one left 14 dialogs with no width cap for
# two commits, because the class the rule targeted had never existed.
#
# HeroUI's names are BEM-ish (`block__element--modifier`); the ones we reach for
# are usually the `block__element` form, not the hyphenated guess.
set -uo pipefail
cd "$(dirname "$0")/.."

THEME=frontend/apps/coachapp-v2/src/index.css
# Resolve the version the APP actually loads. Several @heroui/styles versions
# can sit in the pnpm store at once (3.0.2 and 3.2.1 both do here), and their
# class names differ — picking the wrong one would make this check lie.
HEROUI=$(cd frontend/apps/coachapp-v2 2>/dev/null && node -e '
  const p = require.resolve("@heroui/styles/package.json");
  process.stdout.write(require("node:path").join(require("node:path").dirname(p), "dist", "components"));
' 2>/dev/null)
[ -d "$HEROUI" ] || HEROUI=$(find frontend/node_modules/.pnpm -type d -path '*@heroui/styles/dist/components' 2>/dev/null | sort -V | tail -1)

[ -f "$THEME" ] || { echo "check-theme-selectors: $THEME missing"; exit 0; }
if [ -z "$HEROUI" ]; then
  echo "check-theme-selectors: @heroui/styles not installed — skipping"
  exit 0
fi

# Class selectors the theme targets, taken from selector position only (start of
# line, before the `{`), so utilities inside declarations are not picked up.
SELECTORS=$(grep -oE '^\s*\.[a-z][a-z0-9_-]*' "$THEME" | tr -d ' \t' | sort -u)

# Every class HeroUI actually defines.
KNOWN=$(cat "$HEROUI"/*.css | grep -oE '\.[a-z][a-z0-9_-]*' | sort -u)

# App-owned classes live in the theme by design and are not HeroUI's to know.
OURS='^\.(segmented|tap-target|scrollbar-hide|heading|light|default|dark)$'

MISSING=""
while read -r sel; do
  [ -z "$sel" ] && continue
  echo "$sel" | grep -qE "$OURS" && continue
  echo "$KNOWN" | grep -qxF "$sel" || MISSING="$MISSING$sel\n"
done <<< "$SELECTORS"

if [ -n "$MISSING" ]; then
  echo "Theme selector(s) that match no HeroUI class:"
  printf "  %b" "$MISSING"
  echo ""
  echo "HeroUI uses BEM-ish names — check the real one in:"
  echo "  $HEROUI"
  echo "A rule on a class that does not exist changes nothing, and fails silently."
  exit 1
fi
exit 0
