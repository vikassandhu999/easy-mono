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
  hits=$(rg -n -g '*.tsx' -g '*.ts' -g '!**/generated.ts' "$pattern" "$@")
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

check RM-122 "(optional)/(required) in form labels (optional is implicit; required = isRequired)" \
  '\(optional\)|\(required\)' "$COACH"

check RM-123 "'Failed to load' copy (use \"Couldn't load X\" / shared ErrorState)" \
  'Failed to load' "$COACH"

check RM-124 "inline translateX(-50%) stacking with Tailwind translate utilities" \
  'translateX\(-?50%\)|translate\(-50%' "$COACH"

check RM-125 "centered-spinner idiom (use ListSkeleton/PageSkeleton)" \
  'justify-center py-20' "$COACH"

if [ "$fail" -eq 0 ]; then echo "check-rm: all clean"; fi
exit $fail
