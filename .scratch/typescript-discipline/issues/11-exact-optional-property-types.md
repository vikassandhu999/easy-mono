# 11 — Enable `exactOptionalPropertyTypes` in both apps

**What to build:** Ticket 10 assessed `exactOptionalPropertyTypes` and deferred it. Turn the flag on in both apps' `tsconfig.app.json` and clear the fallout so optional-field bags cannot quietly accept `undefined` where the contract wants a missing key.

**Blocked by:** 10

**Status:** ready-for-agent

- [ ] `frontend/apps/coachapp-v2/tsconfig.app.json` sets `"exactOptionalPropertyTypes": true`. Baseline at deferral: **179** `tsc` errors.
- [ ] `frontend/apps/clientapp-v2/tsconfig.app.json` sets `"exactOptionalPropertyTypes": true`. Baseline at deferral: **21** `tsc` errors.
- [ ] Fixes prefer constructive modeling (omit the key, or type the prop as `T | undefined` only when `undefined` is intentional) over casts.
- [ ] Both apps `build` + `check` clean; `just check-rm` clean.
