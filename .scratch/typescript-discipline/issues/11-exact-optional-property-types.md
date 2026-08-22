# 11 — Enable `exactOptionalPropertyTypes` in both apps

**What to build:** Ticket 10 assessed `exactOptionalPropertyTypes` and deferred it. Turn the flag on in both apps' `tsconfig.app.json` and clear the fallout so optional-field bags cannot quietly accept `undefined` where the contract wants a missing key.

**Blocked by:** 10

**Status:** resolved

## Answer

Enabled `exactOptionalPropertyTypes` in both apps' `tsconfig.app.json`. Cleared baseline fallout (179 coach / 21 client) via: conditional spreads / omit-key at HeroUI and openapi-fetch boundaries; owned optional props widened to `T | undefined` where undefined is intentional (`InfiniteItemsQuery`, `ViewShell`, `Page`, `BrowseListBox`, form wrappers, `PhotoThumb`, `TodayEntry`, …); typed `omitUndefined` in coach `api/shared`; API query objects no longer pass explicit `undefined`. Documented the rule in `frontend/AGENTS.md`. Both apps `build` + `check` clean; `just check-rm` clean.

- [x] `frontend/apps/coachapp-v2/tsconfig.app.json` sets `"exactOptionalPropertyTypes": true`. Baseline at deferral: **179** `tsc` errors.
- [x] `frontend/apps/clientapp-v2/tsconfig.app.json` sets `"exactOptionalPropertyTypes": true`. Baseline at deferral: **21** `tsc` errors.
- [x] Fixes prefer constructive modeling (omit the key, or type the prop as `T | undefined` only when `undefined` is intentional) over casts.
- [x] Both apps `build` + `check` clean; `just check-rm` clean.
