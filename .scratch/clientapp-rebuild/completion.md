# Completion ledger

The full objective remains active. A scaffold, passing build, or browser-only flow does not complete the mobile rewrite.

| Requirement | Implementation | Verification / remaining evidence |
| --- | --- | --- |
| Instructions, coach decisions, backend inventory | Initial plan and controller inventory written | Context-level rules still verified per slice; graph timeout disclosed |
| React/strict TS/Vite/Router/Query/RHF/shadcn/typed API/Biome | Foundation implemented | App build, Biome, shape checks pass; user chose current typed-route contracts |
| Capacitor iOS/Android foundation | Both debug builds and authenticated runtime checks pass | iPhone 17 simulator and API 36 Android emulator; app branding pending |
| Authenticated native workflow before screen expansion | Verified on both platforms | Invite, OTP/native keyboard, profile draft recovery, save, background/resume, restart/read-back and durable sign-out |
| Join, sign in, intake | Invitation, sign-in and intake form implemented | Browser auth/form recovery and iOS workflow pass; native photo upload and offline snapshots remain |
| Today | Pending | Server-owned date, pending work, coverage, empty/error states |
| Training execution | Pending | Set targets/results, drafts, active-session recovery, finish/history |
| Nutrition | Pending | Alternatives, portions, server totals, revision conflict/retry, save/reload |
| Forms/check-ins/photos | Mobile list, all question types, draft/revision recovery and saved reader implemented | Real backend browser flow passes, including photo upload/download retries and competing submissions; iOS draft/save/denial recovery passes. Native upload and offline detail snapshots remain |
| Messaging/attachments | Pending | History, read/send, loss/retry/deduplication, media |
| History/progress | Pending | Server paging/filtering/trends, reader returns |
| Account/preferences | Contact details implemented; preferences pending | Names/phone save and draft reload; drafts survive login expiry and stay isolated across clients; logout clears private drafts; delayed-save logout regression passes |
| Shared cursor lists | Assignment contract, hooks and shared list UI implemented | Router isolation/count/cursor checks and real 22-request browser retry/return flow pass; other resources remain |
| Cached reading/drafts | Profile/form drafts and photo blobs implemented | Account isolation, logout cleanup and restart recovery verified; durable query snapshots/offline reads remain |
| Native keyboard/safe areas/back/lifecycle/deep links | Foundation exercised on simulator and emulator | Cold links, native input, Android back, background/resume and force-stop recovery pass; physical-device checks remain |
| Camera/photo/notifications | Native picker adapter and recovery intent implemented | iOS denial and Android gallery cancellation pass; selection/upload, limited access and process-death recovery unverified; notification API/provider gap |
| Mobile browser verification | Auth/account/forms pass at 375px and 768px; forms also at 1280px | One mobile screen, including tablet use; header and content capped at 480px. Remaining workflows pending |
| Physical devices and human usability | External validation pending | Separate observations by real clients and device/platform |
| Coherent checkpoint commits | Foundation committed as `e4cfa92` | Continue committing verified slices; no push, deployment, or store publication |

## Evidence log

2026-09-19: clean initial git status. No `frontend/apps/clientapp` exists. No v2 implementation or screen was read. Read coachapp engineering primitives and decisions. `xcodebuild -version`: 26.2. Unsandboxed `xcrun simctl list devices available`: iOS 26.3 iPhone/iPad runtimes. `sdkmanager --list_installed`: no installed packages. Local API health check on port 4000: connection refused. `mix openapi.spec.json` succeeds outside sandbox but exposes only 11 auth/webhook paths because client routes use typed controllers. Contract decision requested from user.

2026-09-19 foundation checkpoint: see [auth/native evidence](auth-native.md). User selected typed routes, authorized coachapp pattern reuse, requested autonomous defaults, and clarified mobile-only screens. Browser build/lint/shape and real auth/account scenarios pass. Both native debug builds pass. iPhone 17 XCTest passes; Android emulator images failed extraction twice for insufficient space. Backend precommit passes 1,795 tests against an isolated local PostgreSQL instance. The existing Docker database returned an I/O error and remains an external environment issue. No native or browser test implies usability validation.

2026-09-19 draft recovery: a new real-API browser regression first reproduced loss of unsaved details after rejected refresh. Draft keys now use the verified client profile ID, while reads/writes and server responses retain session-generation guards. Expiry preserves drafts; explicit sign-out deletes them. The regression passes at 375px and 768px, including switching to another client and back. iPhone XCTest also passes with an unsaved draft restored after process termination, followed by save/read-back and durable sign-out (`evidence/ios-drafts.json`). Full backend precommit again passes 1,795 tests; frontend build, Biome, and shape checks pass. Graph reference/coverage lookup again returned `backend_timeout`; direct source and bounded reference search were used.

2026-09-19 assignment-list prerequisite: current typed-route contract now returns cursor pages with filtered server counts and pending/history/purpose filters. The existing `CursorPage` implementation supplies newest timestamp/ID order and continuation after a deleted anchor. All 21 assignment router tests pass; regenerated client types and hooks compile. Full backend precommit passes 1,799 tests. The first full run hit a PostgreSQL disk-full error; removing the task-installed unused Android emulator package freed about 1.1 GB, the isolated database recovered, and the full rerun passed. Android SDK build tools remain installed; runtime still needs a system image and adequate space. No intake/check-in screen is marked delivered by this contract checkpoint.

2026-09-19 forms slice: see [forms evidence](forms.md). Full backend precommit passes 1,802 tests, including revision conflict and frozen weight-unit behavior. The browser verifies all question types, durable photo retry, stale-form reconciliation, safe lost-response recovery, competing submissions, 22-request cursor pagination and logout cleanup. iPhone tests verify draft/save/restart and photo-denial recovery. Native startup now resolves cold-launch links before rendering authentication guards, after the first Android run reproduced a lost invitation. Local draft writes expose pending/saved/error feedback; a process-stop test caught an outstanding last-keystroke write. Android emulator installation succeeded after disk space became available. Its full runtime suite now passes invitation/auth, native keyboard input, profile draft/save, background/resume/back, gallery cancellation, form draft/save/restart and durable logout. Android writes now acknowledge disk persistence, and sign-out waits for cleanup with an explicit failure/retry boundary. No real object-storage or device-usability claim is made.
