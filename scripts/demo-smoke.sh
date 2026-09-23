#!/usr/bin/env bash
#
# Demo smoke test — run AFTER deploying the backend to confirm it's alive and
# correctly configured. The automated checks here catch infra/config breakage;
# the MANUAL gates at the end are the ones that actually make or break the demo.
#
# Usage:
#   BACKEND=https://easy-backend.fly.dev ./scripts/demo-smoke.sh
#
set -uo pipefail

BACKEND="${BACKEND:-https://easy-backend.fly.dev}"
pass=0; fail=0
ok()   { echo "  ✓ $1"; pass=$((pass+1)); }
bad()  { echo "  ✗ $1"; fail=$((fail+1)); }

echo "Smoke-testing backend: $BACKEND"
echo

echo "1. Health check"
if curl -fsS "$BACKEND/api/health" >/dev/null 2>&1; then ok "/api/health responds"; else bad "/api/health FAILED — backend down or wrong URL"; fi

echo "2. OpenAPI spec renders (proves the CURRENT app booted — a 404 here means a stale deploy)"
spec="$(curl -fsS "$BACKEND/api/openapi" 2>/dev/null)"
if [ -n "$spec" ]; then ok "/api/openapi renders"; else bad "/api/openapi FAILED — backend is down OR a stale deploy. Run: cd backend && just deploy"; fi

echo "3. Core coaching routes are deployed"
for route in /v1/coach/clients /v1/coach/training-plans /v1/coach/nutrition-plans /v1/coach/conversations; do
  status="$(curl -sS -o /dev/null -w '%{http_code}' "$BACKEND$route")"
  if [ "$status" = 403 ]; then ok "$route is deployed and requires sign-in"; else bad "$route returned $status (expected 403 without credentials)"; fi
done

echo
echo "Result: $pass passed, $fail failed."
echo
cat <<'GATES'
── MANUAL GATES (do these in a browser — they are the real demo blockers) ──
[ ] Sign up on the deployed coachapp with a REAL inbox → the OTP email arrives
    within seconds. (If not: Resend sending domain isn't verified, or RESEND_API_KEY
    is unset. This blocks the entire demo.)
[ ] Invite a client → the invite email link points at the DEPLOYED clientapp URL,
    NOT http://localhost:1314. (Fix: fly secrets set CLIENT_FRONTEND_URL=<clientapp URL>.)
[ ] Open each frontend → DevTools console shows NO "[config] VITE_API_BASE_URL…"
    error, and network calls hit the Fly backend (not localhost).
GATES
[ "$fail" -eq 0 ]
