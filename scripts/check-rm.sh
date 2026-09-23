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

check RM-101 "dead HeroUI v2 tokens (use accent/border/surface/muted)" \
  '(text|bg|border|divide)-(primary|divider|content[1-4]|foreground-[0-9]{2,3})[ "'"'"'\]]' "$CLIENT"

# RM-180 — `scale-100!` cannot cancel a vendor `transform: scale(...)`. Tailwind
# v4 compiles `scale-*` to the standalone `scale` property; HeroUI's press effect
# is `transform:scale(.98)`. Both apply and multiply, so the "kill switch" was a
# no-op on every browse row in the app. `transform-none!` is the one that works.
check RM-180 "scale-100! used to cancel a press effect (use transform-none!)" \
  ':scale-100!' "$CLIENT"

# RM-144 — apply the frontend boundary contract to every retained coach/client app.
if ! node scripts/check-frontend-shape.mjs \
  frontend/apps/coachapp frontend/apps/clientapp frontend/apps/clientapp-v2; then
  fail=1
fi

# RM-181 — a Button whose label hides at a breakpoint (`hidden sm:inline` span)
# is icon-only there and must carry a constant aria-label. Multi-line match:
# scan a Button's props+children up to the span, bailing at nested/closed Buttons.
hits=$(rg -nU --pcre2 -g '*.tsx' \
  '(?s)<Button\b(?:(?!<Button\b|</Button>|aria-label=).){0,400}?<span className="hidden (sm|md|lg):inline"' \
  "$CLIENT")
if [ -n "$hits" ]; then
  echo "FAIL RM-181 — breakpoint-hidden button label without aria-label (see docs/agents/recurring-mistakes.md)"
  echo "$hits" | head -10
  fail=1
fi

# RM-211 — socket creation stays synchronous for channel callers, but HTTP and
# the first handshake share one short-lived-token refresh owner and promise.
for socket_owner in "$CLIENT/api/socket.ts"; do
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
