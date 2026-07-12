---
name: verify
description: Build/launch/drive recipe for verifying coachapp-v2 changes in a real browser
---

# Verifying coachapp-v2 in the running app

## Launch
- Backend usually already runs on :4000 (`lsof -iTCP:4000 -sTCP:LISTEN`); if not, `just backend`.
- Frontend: `cd frontend && pnpm dev:coachapp` (background). Default port 2021; if the user's own server holds it, vite falls back to 2022 — read the task output for the actual URL. Kill YOUR vite PID afterwards, not by `pkill -f vite` (the user's server matches the same pattern).

## Login
- Coach with the most seed data: `admin@example.com` (also `sea.snake@example.com`). Dev OTP is always `123456`.
- Flow: email → Continue → type `123456` into the OTP boxes → Verify.

## Drive
- Claude-in-Chrome tools work; batch actions with `browser_batch`.
- `resize_window` FAILS if the Chrome window is macOS-fullscreen ("bounds must be at least 50% within visible screen space") and `window.open` popups are blocked. Mobile-viewport workaround that works: via `javascript_tool`, clear the body and insert a same-origin 375px iframe pointing at the app — CSS media queries respond to iframe width and the auth cookie is shared. Read the iframe's URL with `contentDocument.location`.
- Synthetic wheel/drag does NOT scroll horizontal tab strips; set `el.scrollLeft` via JS instead.
- Screenshots right after a click can capture stale hover styling — zoom or re-shoot before calling an active-state bug.

## Useful checks
- Dev DB queries: from `backend/`, `mix run -e '...'` with `import Ecto.Query` (table is `users`, plural).
- Console: `read_console_messages` with `onlyErrors: true`.
