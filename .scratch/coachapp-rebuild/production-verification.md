# Production bundle verification

The earlier route suites primarily run against Vite's development server. This pass checks the actual built coachapp without importing source modules or injecting a session, and records startup behavior before considering a performance change. It uses only current coachapp and its real backend.

## Connected production journey

`tests/navigation/production.browser.mjs` starts its own Vite preview on a temporary localhost port and proxies the normal API and WebSocket. At 375px and 1280px, Chromium and WebKit both complete signup, invalid-code recovery, business creation, a preserved protected form-creation address, shadcn answer-type selection, saved choice values, reopening/reloading, all eight main sections, a real successful inbox WebSocket join, logout/login, and return from a deleted form to the library. Loaded scripts are built `/assets/*.js` files. Each successful run deletes its form; disposable accounts/businesses and their built-in forms remain in the normal development database. Preview servers close at the end.

An early WebKit harness forced document navigation as soon as the save response arrived, before the app finished returning to its list. WebKit reported an access-control diagnostic for that interrupted list fetch. Changing only the harness to open the visible saved-form link eliminates the error at both widths; explicit reloads after the editor is ready also pass. No request-layer or application change was made, and page-error assertions remain active. Earlier harness expectations for invalid-code and missing-form messages were corrected to the actual associated field error and recoverable missing-record view. These were test assumptions, not repaired product defects.

## Startup observation

`tests/navigation/startup-audit.browser.mjs` serves the production output with gzip, disables browser cache, and uses a 200,000-byte/s download limit, 150ms latency and 4× CPU throttling. Three samples at each width measure from navigation until the email field accepts text. The final samples were 2,231–2,345ms at 375px and 2,226–2,240ms at 1280px. Each transferred 328,263 compressed JavaScript bytes. These are local simulated observations, not real-device timings or a performance guarantee. No arbitrary timing gate or speculative bundle refactor was added; the build's existing bundle-size warning remains.

## Evidence and limits

Logs: `/tmp/coachapp-production-chromium-complete.log`, `/tmp/coachapp-production-webkit-final.log`, `/tmp/coachapp-startup-final.log`. App build, scoped Biome, repository checks and backend precommit pass (1,784 tests, zero failures; `/tmp/coachapp-production-precommit.log`). Reviewed browser screenshots are archived under `/tmp/coachapp-production-audit-2026-09-16`. Run instructions are in `tests/navigation/README.md`.

This expands engine coverage for the listed core journey. It does not establish WebKit media recording/playback, every route's WebKit edge states, physical mobile behavior, a target-coach usability session, or deployed payment/storage behavior. Those remain explicit completion limits. Normal API4000, coach2022 and client1314 stay running.
