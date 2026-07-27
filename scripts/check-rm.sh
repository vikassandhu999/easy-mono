#!/usr/bin/env bash
# Mechanical checks for docs/agents/recurring-mistakes.md entries.
# Each check greps for a forbidden pattern; any hit fails with the RM id to read.
# Add a check here when a ledger entry graduates from prose to machine rule.
set -u
cd "$(dirname "$0")/.."

fail=0
check() { # check <rm-id> <description> <rg-pattern> <path>...
  local id="$1" desc="$2" pattern="$3"
  shift 3
  local hits
  hits=$(rg -n --pcre2 -g '*.tsx' -g '*.ts' -g '!**/generated.ts' "$pattern" "$@")
  if [ -n "$hits" ]; then
    echo "FAIL $id — $desc (see docs/agents/recurring-mistakes.md)"
    echo "$hits" | head -10
    fail=1
  fi
}

COACH=frontend/apps/coachapp-v2/src
CLIENT=frontend/apps/clientapp-v2/src

check RM-101 "dead HeroUI v2 tokens (use accent/border/surface/muted)" \
  '(text|bg|border|divide)-(primary|divider|content[1-4]|foreground-[0-9]{2,3})[ "'"'"'\]]' "$COACH" "$CLIENT"

# ponytail: coachapp only — clientapp's active-workout.tsx has pre-existing hex debt; widen when cleaned
check RM-109 "literal hex colors in UI (use semantic tokens)" \
  '\[#[0-9a-fA-F]{3,8}\]|['"'"'"]#[0-9a-fA-F]{3,8}['"'"'"]' "$COACH"

check RM-121 "react-aria NumberField for numeric entry (use @/@components/number-input)" \
  '<NumberField' "$COACH"

# Only bg-foreground / text-background invert. border-foreground is a legitimate border color.
check RM-127 "theme-inverting dark cell (use bg-accent + text-accent-foreground)" \
  '(^|[ :"'"'"'\`])(bg-foreground|text-background)([ "'"'"'\`/]|$)' "$COACH"

# Status colors as body copy. Icons legitimately use text-danger/text-warning (non-text needs
# only 3:1), so this fires only when a status color sits on an element that also carries a
# text-size class — i.e. it is painting actual copy.
check RM-128 "status color on sized text (use text-<status>-soft-foreground for copy)" \
  '(?=.*\btext-(xs|sm|base|lg|xl)\b)(?=.*\btext-(danger|warning|success)[ "'"'"'\`])' "$COACH"

check RM-122 "(optional)/(required) in form labels (optional is implicit; required = isRequired)" \
  '\(optional\)|\(required\)' "$COACH"

check RM-123 "'Failed to load' copy (use \"Couldn't load X\" / shared ErrorState)" \
  'Failed to load' "$COACH"

check RM-124 "inline translateX(-50%) stacking with Tailwind translate utilities" \
  'translateX\(-?50%\)|translate\(-50%' "$COACH"

check RM-125 "centered-spinner idiom (use ListSkeleton/PageSkeleton)" \
  'justify-center py-20' "$COACH"

check RM-129 "non-bare Page.Content with className (use bare + Page.Frame; gutter doubles or width unbounds)" \
  '<Page\.Content className=' "$COACH"

# The ink-selected pill is `.toggle-button--ink` (always) / `--filter` (underline
# below sm). Five call sites had hand-assembled it and disagreed on the type step
# (11px vs 14px) and the selected foreground (`text-ink-foreground` vs
# `[color:white]`). Naming the variant only helps if re-assembling it fails.
check RM-136 "hand-assembled ink-selected pill (use .toggle-button--ink / --filter)" \
  'data-\[selected=true\]:bg-ink' "$COACH"

# A responsive pair with the SAME token on both sides is never a decision — it is
# the fossil of a step someone meant to add. `Page.Title` carried `type-metric
# sm:type-metric`, so every page title in the app rendered 22px at every width
# where the scale says desktop titles are 27px.
# -U (multiline) is required, not optional: the halves are usually separate string
# literals on separate lines inside one `cn()` or `+`-joined const, which is
# exactly how the Page.Title one survived a line-based grep. `[^;{}]` keeps the
# window inside a single className expression.
check RM-138 "responsive pair with the same type step on both sides (dead sm: — set the real step or drop it)" \
  '\btype-([a-z]+)\b[^;{}]{0,300}?\bsm:type-\1\b' "$COACH" -U

# `color` never needs an arbitrary value. A literal (`[color:white]`) cannot follow
# the theme at all; a token wrapped in one (`[color:var(--color-muted)]`) was a
# workaround for RM-134 — when sizes lived in `text-*`, `cn('text-eyebrow',
# 'text-muted')` dropped one, so the COLOUR got escalated to dodge the collision.
# Sizes are `type-*` now, so the collision cannot happen and `text-*` is correct.
# The escalation is not harmless: tailwind-merge cannot see `[color:…]` as a
# colour, so a base string carrying one is unoverridable by a call site.
check RM-137 "arbitrary-value color (use a text-* token; sizes are type-*, so there is no collision to dodge)" \
  '\[color:' "$COACH"

# The overlay gutter (16px) is pinned on the vendor dialogs in index.css. A
# call site may RELEASE it (`p-0`) to build band anatomy (title · body · dock),
# but restating or widening it re-opens the drift the pin closed.
check RM-141 "padding override on a vendor dialog (overlay gutter is the theme's; only the p-0 release is allowed)" \
  '(AlertDialog|Modal)\.Dialog[^>]{0,200}className="[^"]*\bp[xy]?-[1-9]' "$COACH" -U

if [ "$fail" -eq 0 ]; then echo "check-rm: all clean"; fi
exit $fail
