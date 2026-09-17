# Unified workbench verification

Implemented on 2026-09-17 under [issue 01](issues/01-unified-workbench.md). The user authorized implementation after the requirements discussion. The defaults in the [specification](spec.md) are implemented; their usefulness remains a launch hypothesis to review with coaches.

## Result

Awaiting you combines replies, check-in and intake reviews, and one plan-preparation item per required service. Follow-ups retains invitations, overdue intake, missed-check-in summaries, and ending engagements. Existing destination screens complete each action. The six-choice screen and its adapter hooks are replaced; legacy backend routes remain compatible.

The backend combines authorized source projections with UNION ALL and applies one total order before limiting. Page selection, requested count and the selected clients' compact display fields are returned by one SQL statement. This provides one snapshot without a cross-request transaction or task table. Counts are optional on appended pages. The cursor binds view, normalized search, actor scope and order version, and carries the calendar evaluation instant. First-page refresh creates a new chain.

The shared list retains the most recent server-supplied count when appended pages omit it, deduplicates IDs only for rendering, and offers refresh after an incompatible cursor. Persisted eligibility, order, counts and dates are never derived from loaded frontend rows. Explicit refresh also refreshes the independent Follow-ups badge.

## Acceptance evidence

| Scenarios | Evidence |
| --- | --- |
| WB-01, WB-02, WB-05 | Mixed ordering and independent Training/Nutrition items in the controller tests; real nutrition assignment retains the training item in the browser. |
| WB-03 | Real client intake submission enters Awaiting you, opens the client intake reader and leaves after Mark intake reviewed. |
| WB-04 | Opening/reading retains a reply item; a real reply and Mark handled each remove the corresponding waiting conversation. Conversation regression covers concurrent messages. |
| WB-06 | Following up does not complete a missed request. Supported snoozes remove only the selected client/kind; failed and lost writes recover. |
| WB-07 | A primary view drained through reviews, handled messages and actual plan assignments remains empty while two Follow-ups stay accessible. |
| WB-08 | Tied order values, deleted anchors, three-plus pages, literal search, filtered totals, cursor mismatch and integer-overflow rejection. Browser next-page failure/retry retains rows and counts. |
| WB-09, WB-13 | Initial, next-page, refresh and badge failures; retained rows; count unavailable rather than zero; account replacement during a held response rejects prior data. |
| WB-10 | Search and view survive save/cancel/back/reload. Return refreshes membership and cursor chains. A resolved row leaves other work visible. Destination regressions exercise stale-state recovery. |
| WB-11 | UTC and Asia/Kolkata cross local midnight at different instants. Continuation uses the captured instant; refresh advances dates. No waiting age is invented for plan needs. |
| WB-12 | Owner, two assigned coaches, another business and scope-mismatched cursors. Reviews/replies retain source lifecycle rules; inactive clients do not enter planning. |

Backend tests: `backend/test/easy/workbench_items_test.exs`, `backend/test/easy_web/controllers/coaches/workbench_items_controller_test.exs`, and `backend/test/easy/workbench_query_plan_test.exs`. Existing legacy controller tests remain green.

Browser: `frontend/apps/coachapp/tests/workbench/workbench.browser.mjs`, Chromium at 375px and 1280px. It asserts that the screen never calls the six-count or legacy queue endpoints. Mobile and desktop screenshots were inspected, including long intake titles. Shared-list, check-in review, intake follow-up, training assignment, nutrition assignment, client details, conversations and navigation regressions also pass at their configured widths. Exact results: [browser results](browser-results.json).

Final gates: coach production build, scoped Biome, `just check-rm`, API generation (172 typed routes), `git diff --check`, and backend `mix precommit` with 1,795 tests and zero failures. The preexisting Vite bundle-size warning remains.

The API-change reviewer found the typed response, generated current-coachapp schema and hook consistent. Its isolated test rerun initially hit a fixture setup collision; the parent's final full precommit is the authoritative passing result. The item union has a named wire type so generation remains stable after formatting. Only generated legacy schema output was updated mechanically; no coachapp-v2 source or UX was inspected.

## Performance evidence

The test harness confirms a test database before seeding. It covers the existing 20-business/2,000-client fixture and a 1,200-client single business with 1,080 conversations, 1,200 assignments, 360 submissions and 2,400 plans per service. Each planned service has four archived plans alongside its current plan. The single-business measurements include owner, assigned-coach and sparse-coach visibility (12 assigned clients), empty searches, first/later pages and counts on/off.

PostgreSQL 15.14, local development machine. Five repeated public-context calls and three HTTP-handler calls per case. HTTP-handler measurements include authentication, routing and serialization through ConnTest, but exclude TCP/TLS and production infrastructure. The real-browser suite separately exercises the local HTTP path. These are baseline measurements, not a production latency guarantee.

| Actor | View | Exact count | Context median ms | HTTP handler median ms |
| --- | --- | --- | --- | --- |
| owner | awaiting | yes | 15.87 | 20.37 |
| owner | awaiting | no | 7.71 | 9.66 |
| owner | follow-ups | yes | 6.93 | 7.72 |
| owner | follow-ups | no | 5.18 | 6.32 |
| assigned coach | awaiting | yes | 15.65 | 14.92 |
| assigned coach | awaiting | no | 8.24 | 10.50 |
| assigned coach | follow-ups | yes | 5.85 | 6.88 |
| assigned coach | follow-ups | no | 2.67 | 3.36 |
| sparse coach | awaiting | yes | 7.93 | 9.37 |
| sparse coach | awaiting | no | 5.71 | 5.05 |
| sparse coach | follow-ups | yes | 2.22 | 5.19 |
| sparse coach | follow-ups | no | 2.08 | 4.61 |

The local evaluation budget is 100 ms per public-context operation and 150 ms per HTTP-handler request on this fixture. The recorded samples fit that budget. Recheck on deployment hardware before treating it as a service objective. No new index, candidate-limit optimization, cache or materialized view was justified by these measurements.

[Recorded samples and plan summaries](query-results.json) retain the evidence. Full SQL and EXPLAIN (ANALYZE, BUFFERS) plans are at `/tmp/coachapp-workbench-query-report.json`; bound values are omitted. Reproduce from `backend/`:

```sh
rtk proxy env WORKBENCH_QUERY_REPORT=/tmp/coachapp-workbench-query-report.json mix test test/easy/workbench_query_plan_test.exs
```

## Retained artifacts and limits

Logs: `/tmp/coachapp-unified-workbench-browser.log`, `/tmp/coachapp-workbench-regressions/`, `/tmp/coachapp-unified-workbench-precommit.log`, `/tmp/coachapp-unified-workbench-build.log`, and `/tmp/coachapp-unified-workbench-gen-api.log`. Browser captures are archived under `/tmp/coachapp-workbench-regressions/screenshots/`.

Graph MCP tools were unavailable and the CLI lookup timed out. Targeted source reads supported the change; this is not a claim of complete graph coverage or safe legacy API retirement.

No deployment or independent coach review has occurred. Physical-device checks and deployed integrations retain the whole-app audit's limits. The next learning steps and observation template are in [deployment learning](deployment-learning.md).
