# Coachapp final journey audit

Continue the original [UX plan](plan.md) and [completion ledger](completion.md). Use only the current coachapp and backend contract. Do not consult coachapp-v2 code, screens or references. Preserve compact worksheets, clear names and hierarchy, shadcn controls/chat, server-owned counts and calculations, cursor lists, and recoverable writes.

This audit connects the completed slices. It does not introduce another screen or redesign without a demonstrated task gap. The [route worklist](ui-audit-coachapp-2026-09-15.md) records the detailed screen checks and fixes.

## Current checkpoint

Previous implementation checkpoints: `c5b9774` (nutrition worksheet) and `f351d95` (connected navigation), verified 2026-09-16. Nutrition hidden-field validation and long-content checks pass at 375px/1280px, along with authoring/assignment, personalization, recovery, portions and ordering. App build, scoped Biome, repository checks and full backend precommit pass (1,778 tests, zero failures).

## Cross-screen evidence

| Check | Current evidence | Status |
| --- | --- | --- |
| Router coverage | Compared current `routes.ts`, `router.tsx` and route worklist: 69 registered routes including wildcard; none missing from the worklist; no unregistered route constants | Source inventory passed |
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

Physical-device/Safari media behavior, a target-coach usability session, and deployed storage/payment-provider behavior are not established by local Chromium tests. Record these limits when reporting local completion. The existing production bundle-size warning remains; this audit has not measured or improved startup performance.


## Navigation finding, 2026-09-16

NAV-02: Chromium left a focused Workbench link partly clipped after backward keyboard traversal on mobile (x = -22px). The shell now reveals a focused navigation item with scroll padding. Each link has room for an inward outline; inter-label spacing is unchanged. The original probe fails and the connected journey passes for both roles at both widths. Same-route clicks correctly preserve link focus, and long editors legitimately repeat their return link in header/footer; the harness accounts for both.

The test uses only its fresh isolated accounts and accepted clients; those records remain in the disposable database. No plans or media are created. Navigation fixture details and screenshots are ignored by Git. The new runtime sweep covers the listed connections; the detailed route suites remain the evidence for deeper editor/management actions.

The live legacy OpenAPI and saved coach spec agree on 10 paths and 14 schemas after excluding Elixir-only `x-struct`/`x-validate` metadata. Typed-route generation is checked separately by backend precommit (170 typed routes across consumers). This comparison needed no API or generated-file edits.

Navigation checkpoint gates: scoped Biome, repository checks, app production build and full backend precommit pass (1,778 tests, zero failures; `/tmp/coachapp-navigation-final-precommit.log`). The existing bundle-size warning remains.


## Food browsing reconciliation, 2026-09-16

The contract-to-task review identified one missing planned browsing capability: food category filtering. The current food library now exposes the existing categories endpoint through a shadcn select. LIBRARY-04 and foods.md record combined search, three pages, error recovery, keyboard focus, long labels and editor return at both widths. Copied-name search also now uses PostgreSQL's indexed text parser; prefixes and punctuation-only newest ordering pass backend regression tests.

Current checkpoint gates pass: coach production build, scoped Biome, repository checks and full backend precommit (1,779 tests, zero failures). Logs: `/tmp/coachapp-food-category-final-build.log` and `/tmp/coachapp-food-category-precommit-verified.log`. Food authoring, recipe authoring and nutrition-plan regressions pass at both widths. Normal API4000, coach2022 and client1314 remain available.

Continue reconciling endpoint candidates against coaching outcomes, especially direct form assignments versus intake and one-time check-in flows. An unused API path alone is not evidence of a missing screen. The remaining local checklist above is still open.
