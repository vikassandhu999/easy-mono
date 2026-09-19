# Completion ledger

The full objective remains active. A scaffold, passing build, or browser-only flow does not complete the mobile rewrite.

| Requirement | Implementation | Verification / remaining evidence |
| --- | --- | --- |
| Instructions, coach decisions, backend inventory | Initial plan and controller inventory written | Context-level rules still verified per slice; graph timeout disclosed |
| React/strict TS/Vite/Router/Query/RHF/shadcn/typed API/Biome | Foundation implemented | App build, Biome, shape checks pass; user chose current typed-route contracts |
| Capacitor iOS/Android foundation | Both debug builds pass | iOS runtime verified; Android image installation fails for lack of disk space; app branding pending |
| Authenticated native workflow before screen expansion | iOS verified; Android environment dependency | iPhone XCTest verifies invite, OTP, profile save, background/resume, restart/read-back, sign-out. Android runtime remains unverified |
| Join, sign in, intake | Invitation and sign-in implemented; intake pending | Browser auth/save/draft/failure recovery and iOS workflow pass; broader auth edge-case audit remains |
| Today | Pending | Server-owned date, pending work, coverage, empty/error states |
| Training execution | Pending | Set targets/results, drafts, active-session recovery, finish/history |
| Nutrition | Pending | Alternatives, portions, server totals, revision conflict/retry, save/reload |
| Forms/check-ins/photos | Pending | All supported question types, photo permissions/uploads, duplicate recovery |
| Messaging/attachments | Pending | History, read/send, loss/retry/deduplication, media |
| History/progress | Pending | Server paging/filtering/trends, reader returns |
| Account/preferences | Contact details implemented; preferences pending | Names/phone save and draft reload; drafts survive login expiry and stay isolated across clients; logout clears private drafts; delayed-save logout regression passes |
| Shared cursor lists | Pending | Backend gaps recorded in workflows.md; multiple pages and retry |
| Cached reading/drafts | Pending | Per-workflow offline policy in plan.md; restart and account switching |
| Native keyboard/safe areas/back/lifecycle/deep links | Pending | Simulator/emulator runtime evidence required |
| Camera/photo/notifications | Pending | Notification API/provider gap; contextual permissions and denial recovery |
| Mobile browser verification | Auth/account pass at 375px and 768px | User explicitly requires mobile-only screens, including tablets; other workflows pending |
| Physical devices and human usability | External validation pending | Separate observations by real clients and device/platform |
| Coherent checkpoint commits | Foundation committed as `e4cfa92` | Continue committing verified slices; no push, deployment, or store publication |

## Evidence log

2026-09-19: clean initial git status. No `frontend/apps/clientapp` exists. No v2 implementation or screen was read. Read coachapp engineering primitives and decisions. `xcodebuild -version`: 26.2. Unsandboxed `xcrun simctl list devices available`: iOS 26.3 iPhone/iPad runtimes. `sdkmanager --list_installed`: no installed packages. Local API health check on port 4000: connection refused. `mix openapi.spec.json` succeeds outside sandbox but exposes only 11 auth/webhook paths because client routes use typed controllers. Contract decision requested from user.

2026-09-19 foundation checkpoint: see [auth/native evidence](auth-native.md). User selected typed routes, authorized coachapp pattern reuse, requested autonomous defaults, and clarified mobile-only screens. Browser build/lint/shape and real auth/account scenarios pass. Both native debug builds pass. iPhone 17 XCTest passes; Android emulator images failed extraction twice for insufficient space. Backend precommit passes 1,795 tests against an isolated local PostgreSQL instance. The existing Docker database returned an I/O error and remains an external environment issue. No native or browser test implies usability validation.

2026-09-19 draft recovery: a new real-API browser regression first reproduced loss of unsaved details after rejected refresh. Draft keys now use the verified client profile ID, while reads/writes and server responses retain session-generation guards. Expiry preserves drafts; explicit sign-out deletes them. The regression passes at 375px and 768px, including switching to another client and back. iPhone XCTest also passes with an unsaved draft restored after process termination, followed by save/read-back and durable sign-out (`evidence/ios-drafts.json`). Full backend precommit again passes 1,795 tests; frontend build, Biome, and shape checks pass. Graph reference/coverage lookup again returned `backend_timeout`; direct source and bounded reference search were used.
