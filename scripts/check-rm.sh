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

# RM-025 — these nutrition factories insert default tenant graphs before
# ExMachina applies overrides, which leaks committed rows from sandbox:false tests.
hits=$(rg -n -g '*concurrency_test.exs' 'insert\(:(plan|meal|meal_item|plan_day|day_meal)' backend/test 2>/dev/null)
if [ -n "$hits" ]; then
  echo "FAIL RM-025 — side-effectful nutrition factory in a committed concurrency test (see docs/agents/recurring-mistakes.md)"
  echo "$hits" | head -10
  fail=1
fi

# RM-029 — generators are read/compile operations. Starting the supervision tree
# can run sweepers or external delivery workers against a developer database.
hits=$(rg -n 'Mix\.Task\.run\("app\.start"\)' backend/lib/mix/tasks -g '*gen*.ex' 2>/dev/null)
if [ -n "$hits" ]; then
  echo "FAIL RM-029 — generator starts the application (see docs/agents/recurring-mistakes.md)"
  echo "$hits" | head -10
  fail=1
fi
if ! rg -q 'openapi\.spec\.json --start-app=false' Justfile; then
  echo "FAIL RM-029 — just gen-api must pass --start-app=false (see docs/agents/recurring-mistakes.md)"
  fail=1
fi

# RM-030 — the adapter is the only seam where typed routes learn Easy-specific
# plugs, errors, pipelines, or domain modules.
hits=$(rg -n --pcre2 'Easy\.|EasyWeb\.(?!TypedRoute\b)' \
  backend/lib/easy_web/typed_route.ex backend/lib/easy_web/typed_route 2>/dev/null)
if [ -n "$hits" ]; then
  echo "FAIL RM-030 — typed-route core references application policy (see docs/agents/recurring-mistakes.md)"
  echo "$hits" | head -10
  fail=1
fi

# Hardcoded app paths rot into dead links on any route rename. Static paths use
# ROUTES.X; parameterized ones use generatePath(ROUTES.X, params). The api layer
# is unaffected (its paths start with /v1 and never sit in navigate/to/backticks
# matching these app segments).
check RM-102 "hardcoded route path (use ROUTES.X / generatePath(ROUTES.X, params))" \
  '(navigate\(|to=\{?)["'"'"'\`]/|\`/(library|clients|messages|settings|dashboard)[/$]' "$COACH"

check RM-101 "dead HeroUI v2 tokens (use accent/border/surface/muted)" \
  '(text|bg|border|divide)-(primary|divider|content[1-4]|foreground-[0-9]{2,3})[ "'"'"'\]]' "$COACH" "$CLIENT"

# ponytail: coachapp only — clientapp's active-workout.tsx has pre-existing hex debt; widen when cleaned
check RM-109 "literal hex colors in UI (use semantic tokens)" \
  '\[#[0-9a-fA-F]{3,8}\]|['"'"'"]#[0-9a-fA-F]{3,8}['"'"'"]' "$COACH"

check RM-121 "react-aria NumberField for numeric entry (use @/ui/number-input)" \
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

# RM-175 — a screen must not re-type `Page.Title`'s class string. Both plan
# builders carried a byte-identical copy of it, and because a copy freezes at
# the moment it was taken, both missed the mobile step Page.Title later grew
# (`type-metric` + `sm:type-display`): every plan title rendered at 27px on a
# 375px screen and truncated to "Test N…". Grep the pair that only Page.Title
# should own — `font-grotesk` next to `type-display` — outside page.tsx.
check RM-175 "hand-copied page title (use Page.Title; a copy cannot inherit the mobile step)" \
  'font-grotesk[^"]*type-display' "$COACH" -g '!**/page.tsx'

# RM-180 — `scale-100!` cannot cancel a vendor `transform: scale(...)`. Tailwind
# v4 compiles `scale-*` to the standalone `scale` property; HeroUI's press effect
# is `transform:scale(.98)`. Both apply and multiply, so the "kill switch" was a
# no-op on every browse row in the app. `transform-none!` is the one that works.
check RM-180 "scale-100! used to cancel a press effect (use transform-none!)" \
  ':scale-100!' "$COACH" "$CLIENT"

# RM-144 — the frontend tree has three kinds of directory (api/, ui/, one per
# route group) and the arrows point one way: feature -> ui -> api. A feature's
# `.ts` files are its public surface; its `.tsx` is private. See
# check-frontend-shape.mjs, which replaces the older "lib/ is the public
# surface" convention — the rule now rides on the file extension, so there is
# no folder to get wrong.
if ! node scripts/check-frontend-shape.mjs "$(dirname "$COACH")" "$(dirname "$CLIENT")"; then
  fail=1
fi

# RM-181 — a Button whose label hides at a breakpoint (`hidden sm:inline` span)
# is icon-only there and must carry a constant aria-label. Multi-line match:
# scan a Button's props+children up to the span, bailing at nested/closed Buttons.
hits=$(rg -nU --pcre2 -g '*.tsx' \
  '(?s)<Button\b(?:(?!<Button\b|</Button>|aria-label=).){0,400}?<span className="hidden (sm|md|lg):inline"' \
  "$COACH" "$CLIENT")
if [ -n "$hits" ]; then
  echo "FAIL RM-181 — breakpoint-hidden button label without aria-label (see docs/agents/recurring-mistakes.md)"
  echo "$hits" | head -10
  fail=1
fi

# RM-205 — centered picker dialogs share one width, and their selectable
# collections use collection semantics rather than row-shaped Buttons.
if ! rg -q 'size="md"' "$COACH/ui/picker-modal.tsx" || rg -q '\bwide\??\b|size=\{' "$COACH/ui/picker-modal.tsx"; then
  echo "FAIL RM-205 — PickerModal must own the single md desktop width (see docs/agents/recurring-mistakes.md)"
  fail=1
fi
check RM-205 "button-mapped picker collection (use ListBox/ListBox.Item)" \
  'role="group"|button--row' \
  "$COACH/ui/search-picker-sheet.tsx" "$COACH/ui/client-picker.tsx"
for picker in \
  "$COACH/ui/client-search-modal.tsx" \
  "$COACH/ui/conversation-inbox-list.tsx" \
  "$COACH/ui/client-picker.tsx"; do
  if ! rg -q 'className="sticky top-0 z-10 bg-surface pb-2 pt-2"' "$picker"; then
    echo "FAIL RM-205 — picker search must use the stable sticky search band (see docs/agents/recurring-mistakes.md)"
    echo "$picker"
    fail=1
  fi
done

# RM-206 — overlay motion is one theme rule. KeyboardSheet names its two theme
# hooks and carries only dynamic viewport geometry; call sites never restate
# animation, transition, or duration choices.
for selector in \
  '.modal__container[data-entering]' \
  '.alert-dialog__container[data-entering]' \
  '.keyboard-sheet__panel[data-entering]'; do
  if ! rg -Fq "$selector" "$COACH/index.css"; then
    echo "FAIL RM-206 — missing central overlay motion selector: $selector (see docs/agents/recurring-mistakes.md)"
    fail=1
  fi
done
if ! rg -q 'keyboard-sheet__backdrop' "$COACH/ui/keyboard-sheet.tsx" || \
   ! rg -q 'keyboard-sheet__panel' "$COACH/ui/keyboard-sheet.tsx"; then
  echo "FAIL RM-206 — KeyboardSheet must use the theme's motion hooks (see docs/agents/recurring-mistakes.md)"
  fail=1
fi
check RM-206 "call-site overlay motion (use the central theme rules)" \
  '(AlertDialog|Modal)\.(Backdrop|Container|Dialog)[^>]{0,200}className="[^"]*(animate-|transition-|duration-)' \
  "$COACH" -U
check RM-206 "KeyboardSheet-local motion (use keyboard-sheet theme hooks)" \
  'isEntering|isExiting|transition-(opacity|transform)|duration-[0-9]+' \
  "$COACH/ui/keyboard-sheet.tsx"

# RM-207 — the responsive create/edit body is a UI primitive, not a Tailwind
# recipe for every caller to reassemble. FormPanel is the only owner.
check RM-207 "hand-assembled responsive form body (use FormPanel)" \
  "sm:rounded-card[^\"']{0,160}sm:border[^\"']{0,160}sm:bg-surface[^\"']{0,160}sm:p-6" \
  "$COACH" -g '!**/form-panel.tsx'

# RM-209 — the accepted workbench variants deliberately have different
# anatomy. These anchors prevent them from being flattened back into the
# generic queue row / loose-card layouts that clipped or lost hierarchy.
onboarding_view="$COACH/workbench/onboarding-view.tsx"
programming_view="$COACH/workbench/programming-view.tsx"
replies_view="$COACH/workbench/replies-view.tsx"
workbench_screen="$COACH/workbench/workbench-screen.tsx"
if rg -q "from './queue-row'" "$onboarding_view" || \
   ! rg -Fq 'grid-cols-[auto_minmax(0,1fr)]' "$onboarding_view" || \
   ! rg -Fq 'toolbar={<ProgrammingToolbar />}' "$workbench_screen" || \
   ! rg -Fq 'items-stretch' "$programming_view" || \
   ! rg -Fq 'programmingGroupDescription' "$programming_view" || \
   rg -q '<span className="truncate">\{primary\.detail\}</span>' "$programming_view" || \
   ! rg -Fq 'grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' "$replies_view" || \
   rg -q '<Surface className="grid min-h-0 flex-1 grid-cols-\[minmax\(0,2fr\)_minmax\(0,3fr\)\]' "$replies_view" || \
   rg -q 'Waiting is separate from read state|Opening this pane marked messages read' "$replies_view"; then
  echo "FAIL RM-209 — locked workbench queue anatomy drifted (see docs/agents/recurring-mistakes.md)"
  fail=1
fi

# RM-210 — a breaking vocabulary cutover includes internal URL/view state.
# Onboarding is the only production name; `new` survives only in locked evidence.
workbench_queues="$COACH/workbench/queues.ts"
if rg -q "WorkbenchQueueId.*'new'|id: 'new'" "$workbench_queues"; then
  echo "FAIL RM-210 — production workbench state still exposes the retired new queue name"
  fail=1
fi

# RM-212 — grouped queue rendering must not classify an absent page before
# loading/error feedback has passed through the canonical list wrapper.
if ! rg -Fq 'if (list.isLoading || list.isError)' "$programming_view" || \
   ! rg -Fq 'ariaLabel="Programming queue"' "$programming_view"; then
  echo "FAIL RM-212 — Programming grouping must surface loading/error before empty classification"
  fail=1
fi

# RM-213 — the Replies task pane only has meaning when a queue row exists.
if ! rg -Fq 'if (!selected)' "$replies_view" || \
   ! rg -Fq 'return queue;' "$replies_view"; then
  echo "FAIL RM-213 — Replies must not render a task-pane instruction without a selected row"
  fail=1
fi

# RM-214 — Unclassified vs required-plan debt is one classification helper.
# Presentation (roster, chips, edit warning) must call it, not re-derive from
# plan-name absence.
client_lib="$COACH/clients/client.ts"
client_list_item="$COACH/workbench/client-list-item.tsx"
if ! rg -Fq 'export function isUnclassified' "$client_lib" || \
   ! rg -Fq 'export function needsRequiredPlan' "$client_lib" || \
   ! rg -Fq 'isUnclassified(client)' "$client_list_item" || \
   ! rg -Fq 'needsRequiredPlan(client)' "$client_list_item" || \
   ! rg -Fq 'isUnclassified(client)' "$COACH/clients/client-status-chips.tsx" || \
   ! rg -Fq 'isUnclassified(client)' "$COACH/clients/edit-client.tsx"; then
  echo "FAIL RM-214 — roster must distinguish Unclassified clients from required-plan debt"
  fail=1
fi

# RM-215 — service choices are content cards, not one-line control-height
# toggles. Release the theme's fixed ToggleButton height so both text lines fit.
required_services_field="$COACH/clients/client-required-services-field.tsx"
if ! rg -Fq 'className={`toggle-button--row rounded-card border p-4 outline-none' "$required_services_field" || \
   ! rg -Fq ':not(.toggle-button--row)' "$COACH/index.css" || \
   ! rg -Fq '.toggle-button--row {' "$COACH/index.css"; then
  echo "FAIL RM-215 — required-service cards must release ToggleButton's fixed height"
  fail=1
fi

# RM-216 — Service type locks every identity control through one helper, and
# every draft commit clears stale builder validation.
checkin_builder="$COACH/library/checkins/checkin-builder.tsx"
if ! rg -Fq 'export function questionIdentityLocked' "$COACH/library/checkins/question-type-meta.ts" || \
   [ "$(rg -Fc 'isDisabled={locked}' "$checkin_builder")" -lt 2 ] || \
   ! rg -qU 'const commitSections[^}]+setError\(null\);[^}]+setSections' "$checkin_builder"; then
  echo "FAIL RM-216 — Service type must stay locked and stale builder errors must clear on draft edits"
  fail=1
fi

# RM-217 — the ClientApp fill/review route uses stable loading geometry and
# the shared retryable page-error surface.
fill_checkin="$CLIENT/checkins/fill-checkin.tsx"
if ! rg -Fq "import ErrorState from '@/ui/error-state'" "$fill_checkin" || \
   ! rg -Fq 'Skeleton className=' "$fill_checkin" || \
   ! rg -Fq 'onRetry={() => refetch()}' "$fill_checkin"; then
  echo "FAIL RM-217 — ClientApp check-in detail must keep skeleton and retryable error states"
  fail=1
fi

# RM-218 — completed client forms keep their Intake/Check-in vocabulary.
if ! rg -Fq '${purposeLabel(assignment.purpose)} submitted' "$fill_checkin"; then
  echo "FAIL RM-218 — completed Intake review must not claim a Check-in was submitted"
  fail=1
fi

# RM-219 — shared queue facts wrap on mobile and truncate only on desktop.
queue_row="$COACH/workbench/queue-row.tsx"
if ! rg -Fq 'whitespace-normal type-eyebrow leading-tight text-muted sm:truncate' "$queue_row"; then
  echo "FAIL RM-219 — mobile queue rows must not clip their actionable absolute fact"
  fail=1
fi

# RM-220 — long row identity text stays inside its minmax track instead of
# painting under the action and snooze controls on narrow screens.
if ! rg -Fq 'flex min-w-0 flex-col overflow-hidden' "$queue_row" || \
   ! rg -Fq 'block min-w-0 max-w-full truncate type-body' "$queue_row"; then
  echo "FAIL RM-220 — queue identity text must stay contained beside mobile controls"
  fail=1
fi

# RM-211 — socket creation stays synchronous for channel callers, but HTTP and
# the first handshake share one short-lived-token refresh owner and promise.
for socket_owner in "$COACH/api/socket.ts" "$CLIENT/api/socket.ts"; do
  api_dir=${socket_owner%/socket.ts}
  client_owner="$api_dir/client.ts"
  refresh_owner="$api_dir/token-refresh.ts"
  if ! rg -Fq "from '@/api/token-refresh'" "$socket_owner" || \
     ! rg -Fq "from '@/api/token-refresh'" "$client_owner" || \
     ! rg -Fq '/v1/auth/token' "$refresh_owner" || \
     rg -Fq '/v1/auth/token' "$socket_owner" || \
     rg -Fq '/v1/auth/token' "$client_owner"; then
    echo "FAIL RM-211 — HTTP and socket must share one token refresh owner: $api_dir"
    fail=1
  fi
  if ! rg -qU 'refreshTokenIfStale\(\)\.finally\(\(\) => \{[[:space:]]+if \(socket === nextSocket\) \{[[:space:]]+nextSocket\.connect\(\)' "$socket_owner"; then
    echo "FAIL RM-211 — first socket connect must wait for token refresh: $socket_owner"
    fail=1
  fi
done

# RM-302 — a local .claude/skills/<name> shadows the plugin skill of the same
# name and silently goes stale. Skills the mattpocock-skills plugin provides must
# never be vendored into this repo.
for s in code-review codebase-design diagnosing-bugs domain-modeling grilling handoff \
         implement prototype research resolving-merge-conflicts tdd to-spec to-tickets \
         triage wayfinder wizard writing-for-agents; do
  if [ -d ".claude/skills/$s" ]; then
    echo "FAIL RM-302 — .claude/skills/$s shadows the mattpocock-skills plugin skill (see docs/agents/recurring-mistakes.md)"
    fail=1
  fi
done

# RM-303 — the superpowers plugin and its docs/superpowers/ convention are retired.
# AGENTS.md and the ledger name it to ban it; those two are the only allowed mentions.
hits=$(rg -n --glob '!docs/archive/**' --glob '!scripts/check-rm.sh' \
  --glob '!docs/agents/recurring-mistakes.md' --glob '!AGENTS.md' 'superpowers' . 2>/dev/null)
if [ -n "$hits" ]; then
  echo "FAIL RM-303 — superpowers reference outside .scratch/archive (see docs/agents/recurring-mistakes.md)"
  echo "$hits" | head -10
  fail=1
fi

if [ "$fail" -eq 0 ]; then echo "check-rm: all clean"; fi
exit $fail
