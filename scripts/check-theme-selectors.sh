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
#
# `<vendor-block>--<name>` is deliberate, not a typo: HeroUI's own variants are
# BEM modifier classes that set the block's `--<block>-*` custom properties
# (`.toggle-button--ghost`), so an app variant follows the same convention. The
# check that matters for these is still enforced — the BLOCK must exist, so
# `.toggle-buton--ink` is still caught. Only the modifier is app-owned.
OURS='^\.(eyebrow|segmented|tap-target|scrollbar-hide|heading|light|default|dark)$'
APP_MODIFIERS='^\.[a-z][a-z0-9-]*--(ink|filter|tab|row|outline|weekday|builder)$'

MISSING=""
while read -r sel; do
  [ -z "$sel" ] && continue
  echo "$sel" | grep -qE "$OURS" && continue
  # An app-owned BEM modifier is allowed, but only on a block HeroUI really has.
  if echo "$sel" | grep -qE "$APP_MODIFIERS"; then
    BLOCK=${sel%--*}
    echo "$KNOWN" | grep -qxF "$BLOCK" || MISSING="$MISSING$sel (no such block: $BLOCK)\n"
    continue
  fi
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

# Same failure mode, other half of a rule: `var(--nope)` with no fallback is
# invalid at computed-value time, so the declaration is dropped and the property
# inherits. Nothing builds red. `9149cfd8` renamed the type scale `--text-*` ->
# `--type-*` and left one `var(--text-eyebrow)` behind, which silently unset the
# segmented control's font size.
TW_THEME=$(find frontend/node_modules/.pnpm -type f -path '*/tailwindcss/theme.css' 2>/dev/null | sort -V | tail -1)
DEFINED=$(
  {
    grep -ohE -- '^\s*--[a-zA-Z0-9_-]+' "$THEME"
    grep -rohE -- '^\s*--[a-zA-Z0-9_-]+\s*:' "$(dirname "$HEROUI")" 2>/dev/null | tr -d ':'
    [ -n "$TW_THEME" ] && grep -ohE -- '^\s*--[a-zA-Z0-9_-]+\s*:' "$TW_THEME" | tr -d ':'
  } | tr -d ' \t' | sort -u
)
DANGLING=$(grep -ohE -- 'var\(--[a-zA-Z0-9_-]+\s*\)' "$THEME" | grep -oE -- '\--[a-zA-Z0-9_-]+' | sort -u |
  while read -r v; do echo "$DEFINED" | grep -qxF -- "$v" || echo "$v"; done)

if [ -n "$DANGLING" ]; then
  echo "Theme references custom propert(ies) nothing defines:"
  printf "  %s\n" $DANGLING
  echo ""
  echo "var(--x) with no fallback drops the whole declaration — the property"
  echo "silently inherits instead. Fix the name, or give it a fallback."
  exit 1
fi
exit 0
