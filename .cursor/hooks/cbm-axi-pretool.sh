#!/usr/bin/env bash
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PAYLOAD="$(cat || true)"
[[ -z "$PAYLOAD" ]] && exit 0
TEXT="$(
  printf '%s' "$PAYLOAD" | "$ROOT/hooks/pretool-augment.sh" PreToolUse 2>/dev/null \
    | python3 -c 'import json,sys
raw=sys.stdin.read().strip()
if not raw:
  raise SystemExit(0)
try:
  d=json.loads(raw)
  print(d.get("hookSpecificOutput",{}).get("additionalContext","") or "")
except Exception:
  pass
' || true
)"
[[ -z "${TEXT}" ]] && exit 0
python3 -c 'import json,sys; print(json.dumps({"agent_message":sys.argv[1],"permission":"allow"}))' "$TEXT" 2>/dev/null || true
exit 0
