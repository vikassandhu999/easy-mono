# Coachapp final journey audit

Continue the original [UX plan](plan.md) and [completion ledger](completion.md). Use only the current coachapp and backend contract. Do not consult coachapp-v2 code, screens or references. Preserve compact worksheets, clear names and hierarchy, shadcn controls/chat, server-owned counts and calculations, cursor lists, and recoverable writes.

This audit connects the completed slices. It does not introduce another screen or redesign without a demonstrated task gap. The [route worklist](ui-audit-coachapp-2026-09-15.md) records the detailed screen checks and fixes.

## Current checkpoint

Current verification: conversation centering and Chromium/WebKit media coverage, 2026-09-17. The complete inbox/thread suite passes at 375px/1280px with real local storage. Build, scoped Biome, repository checks and backend precommit pass (1,784 tests). The previous production core-journey checkpoint is `88c541b`; individual check-in requests are `dc01639`. Earlier route and connected-workflow evidence remains below and in the route worklist.

## Cross-screen evidence

| Check | Current evidence | Status |
| --- | --- | --- |
| Router coverage | Current `routes.ts` and `router.tsx`: 70 registered constants plus wildcard (71 routes); the route worklist includes the missing-intake and individual-request additions; no unregistered route constants | Source inventory passed |
| Entry references | Every route constant has a source reference outside its definition and router; this establishes a reference, not successful runtime reachability | Source inventory passed; connected keyboard navigation passed for owner/trainer at both widths (NAV-02) |
| Client onboarding | Current real-API invitation → client-app acceptance/intake → coach snapshot/review, retry, reload, persisted review and delayed-account isolation, at 375px/1280px | Passed; `/tmp/coachapp-final-onboarding.log` |
| Daily coaching | All six Workbench queues, task completion/return, snooze, failed requests and account isolation, at 375px/1280px | Passed; `/tmp/coachapp-final-workbench.log` |
| Lists | Cursor paging, retained next-page failures, search races, server filters/totals, navigation and return, at 375px/1280px | Passed; `/tmp/coachapp-final-lists.log` |
| Navigation and access | Eight primary sections, account-menu entries, three libraries and eleven client task destinations with return links, active sections, fully visible focus, loading without alerts, trainer Team denial and logout | Passed; `/tmp/coachapp-navigation-final.log` |
| Sessions and roles | Current auth/invitation/deep-link/accessibility, Team lifecycle and settings suites at both widths; includes expiry, late responses, cross-tab logout, owner/trainer controls and client reassignment | Passed; `/tmp/coachapp-final-{auth,team,settings}.log` |
| Development services | API `4000/api/openapi`, coachapp `2022/` and clientapp `1314/` each return 200; onboarding also exercises real coach/client interaction | Passed |

Discovery used bounded current-source reads because graph tools were unavailable. No graph completeness claim is made. These suites use disposable accounts and mutate only their fixtures. Screenshots from this pass are archived under `/tmp/coachapp-final-journeys-2026-09-16`.

## Remaining local checks

- Reconcile every remaining item in the completion ledger with recorded evidence or an explicit limit. Run final app/repository/backend gates after any further fixes; preserve normal development services.

Physical-device/Safari media behavior, a target-coach usability session, and deployed storage/payment-provider behavior are not established by local Chromium tests. Record these limits when reporting local completion. The existing production bundle-size warning remains; local startup measurements are recorded in production-verification.md.


## Navigation finding, 2026-09-16

NAV-02: Chromium left a focused Workbench link partly clipped after backward keyboard traversal on mobile (x = -22px). The shell now reveals a focused navigation item with scroll padding. Each link has room for an inward outline; inter-label spacing is unchanged. The original probe fails and the connected journey passes for both roles at both widths. Same-route clicks correctly preserve link focus, and long editors legitimately repeat their return link in header/footer; the harness accounts for both.

The test uses only its fresh isolated accounts and accepted clients; those records remain in the disposable database. No plans or media are created. Navigation fixture details and screenshots are ignored by Git. The new runtime sweep covers the listed connections; the detailed route suites remain the evidence for deeper editor/management actions.

The live legacy OpenAPI and saved coach spec agree on 10 paths and 14 schemas after excluding Elixir-only `x-struct`/`x-validate` metadata. Typed-route generation is checked separately by backend precommit (170 typed routes across consumers). This comparison needed no API or generated-file edits.

Navigation checkpoint gates: scoped Biome, repository checks, app production build and full backend precommit pass (1,778 tests, zero failures; `/tmp/coachapp-navigation-final-precommit.log`). The existing bundle-size warning remains.


## Food browsing reconciliation, 2026-09-16

The contract-to-task review identified one missing planned browsing capability: food category filtering. The current food library now exposes the existing categories endpoint through a shadcn select. LIBRARY-04 and foods.md record combined search, three pages, error recovery, keyboard focus, long labels and editor return at both widths. Copied-name search also now uses PostgreSQL's indexed text parser; prefixes and punctuation-only newest ordering pass backend regression tests.

Current checkpoint gates pass: coach production build, scoped Biome, repository checks and full backend precommit (1,779 tests, zero failures). Logs: `/tmp/coachapp-food-category-final-build.log` and `/tmp/coachapp-food-category-precommit-verified.log`. Food authoring, recipe authoring and nutrition-plan regressions pass at both widths. Normal API4000, coach2022 and client1314 remain available.

The direct form-assignment review identified the missing-intake action, completed below. Continue reconciling the other endpoint candidates against coaching outcomes. An unused API path alone is not evidence of a missing screen. The remaining local checklist above is still open.


## Missing-intake reconciliation, 2026-09-16

The existing generic form-assignment POST supported a coaching task absent from the UI: assigning the first intake to an existing client without one. INTAKE-01 now completes that task with server-owned active Intake selection, preview and recoverable assignment. The same API's one-time Check-in task remains covered by the existing schedule → client submission → review journey; it does not require another assignment screen. Intake retrieval, follow-up and submitted response history retain their scoped existing reads.

The new page adds one registered route: current source inventory has 69 route constants plus wildcard (70 routes), with no unregistered constants. The detailed route worklist includes the new route. Browser proof covers its entry from Client overview, choice/preview/return and saved intake, including real clientapp submission and coach review at both coach widths.

Current build, scoped Biome, repository checks and backend precommit pass (1,779 tests). Existing invitation and intake-follow-up regressions pass at both widths. See assign-intake.md for complete evidence and retained limits. The original whole-app objective and remaining reconciliation checklist remain active.


## Schedule deletion reconciliation, 2026-09-16

Comparing HTTP method and path identified a missing action that path-only inventory could not distinguish from schedule editing: DELETE an unused check-in schedule. CHECKIN-03 now covers it through the existing client schedule page; no new route is needed. The backend remains responsible for generated-history protection, and the UI offers the existing Stop scheduling action after that specific rejection.

New deletion and existing scheduling browser suites pass at 375px/1280px against normal services. App build, scoped Biome, repository checks and full backend precommit pass (1,780 tests). See delete-check-in-schedule.md for logs, API review and retained limits. The current route count remains 70 including wildcard. Continue classifying remaining unused API operations by coaching outcome before adding screens; final reconciliation remains open.


## Individual-request reconciliation, 2026-09-16

The generic assignment read exposed a real remaining coaching outcome: seeing all unanswered check-ins for a client. Workbench's missed-check-in queue deliberately surfaces only the latest due request per client; submitted history cannot show unanswered work. CHECKIN-04 now supplies the scoped list and due-date/priority/dismiss/reopen actions without loading the generic unpaged collection. Real client submission and retained scheduling are verified. Current source inventory is 70 registered route constants plus wildcard (71 routes), with no unregistered constants; the new route is in the detailed worklist.

Other reviewed candidates do not require new screens: food/recipe impact arrays describe the same recipe/template/client-plan references now provided by paginated usage management; dashboard-setup updates only hidden-state metadata for a setup panel the original UX plan does not introduce. Client invitation-acceptance operations belong to the client journey and are exercised by the real onboarding suites. Conversation inbox/history and weight progress use their existing scoped cursor APIs. The remaining checklist above stays open for final evidence reconciliation, with device/provider/usability limits unchanged.

Checkpoint gates: new request browser and existing scheduling/deletion/review suites pass at both widths; build, repository checks, API generation/review and full backend precommit pass (1,784 tests). See check-in-requests.md for the exact evidence.


## Server-value ownership audit, 2026-09-16

A bounded source pass over current coachapp `src/` found the remaining `filter` calls in unsaved form/menu/workout edits, selected upload removal, draft service/tag choices, and static question-type rendering. The count-related `length` uses are draft field-array controls; exercise relations use length only for their empty state. No `reduce`, `sort` or `toSorted` call was found in this scope. The shared InfiniteList renders the API page's `count`, uses loaded length only for empty/rendering decisions, follows opaque cursors, pauses automatic paging on failure and retains explicit retry. This establishes the inspected source behavior, not a graph completeness claim or a guarantee against every possible arithmetic implementation. Existing server-value and cursor browser/backend tests remain the behavioral evidence.


## Production and second-engine verification, 2026-09-16

The actual built app now has a connected browser suite without source imports or injected authentication. Chromium and WebKit both pass signup/deep-link recovery, form authoring with shadcn selection and saved choices, all eight sections, a real inbox socket, logout/login and missing-record return at both widths. The startup harness also records three compressed cold-load samples per width under network/CPU throttling. See [production verification](production-verification.md) for evidence, harness corrections and measured values.

Current build, scoped Biome, repository checks and full backend precommit pass (1,784 tests). This closes the development-server-only evidence gap for the tested core journey. Conversation media and history interactions are covered by the subsequent WebKit pass below; deeper feature interactions in other areas remain; physical-device, target-coach and deployed-provider limits remain. No startup optimization or product redesign was inferred from the bundle warning.


## Conversation engine verification, 2026-09-17

The complete existing conversation suite passes in Chromium and WebKit at both widths, including real recording, uploads/downloads, native playback and network recovery. The desktop WebKit run found a clipped Jump to latest control: `inset-s-1/2` generated no CSS rule. The supported `start-1/2` utility restores its centered position, which the browser suite now checks before clicking. See [conversations](conversations.md) for fixture details and retained device/storage limits. Screenshots are archived under `/tmp/coachapp-conversations-webkit-audit`.
