# Prove queue behavior and query plans

Type: task
Status: resolved
Blocked by: 14
Parent: [Coach workbench v1 delivery](../map.md)

## Question

Complete the public behavioral matrix and database query-plan checks for the coordinated queue contract.

## Behavioral matrix

* Build fixtures through domain contexts, call the workbench counts endpoint and each public queue endpoint, then assert count, identity, membership, order, reasons, pagination, owner/trainer visibility, tenant isolation, and drain behavior.
* Cover every boundary and scenario in the source specification for Onboarding, Check-ins, Replies, Programming, Expiring, Quiet, required services, and Mark handled.
* Derive all date fixtures from the test date. Use deterministic id tie-break cases.
* Assert OpenAPI schemas for rendered entities and requests, including all reason variants, service filters, joined-date semantics, waiting state, Intake reminder, and Mark handled.

## Query-plan checks

* Confirm the intended partial indexes exist with exact leading columns and predicates.
* Seed representative per-tenant clients, conversations, assignments, submissions, and plan history. Capture `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` for each list and count projection.
* Record the plans and row counts in this ticket's resolution. Reject per-client application queries, unbounded history scans, and plans that cannot use the intended tenant-leading index at representative size.
* Avoid brittle exact-cost assertions. Automate stable structural checks and retain the recorded plans as review evidence.

## Edit surface

* Context tests under `backend/test/easy/`
* Controller and OpenAPI tests under `backend/test/easy_web/`
* A focused test helper or Mix task for repeatable representative query-plan inspection if needed

## Acceptance

* Counts and lists agree for the same fixtures across all queues and Programming filters.
* The behavioral suite includes every explicit case in the specification's Testing Decisions.
* Query-plan evidence shows bounded, tenant-scoped database work and the expected partial-index access patterns.

## Verification

Run the focused suites and query-plan harness, then `mix precommit` from `backend/`.

## Answer

Completed the public behavior matrix and added a repeatable telemetry-based query-plan harness. The harness captures the SQL emitted by owner and trainer calls through `Easy.Workbench`, then runs each statement with `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`.

The representative seed contains 20 tenants, 2,000 clients, 1,800 conversations, 1,000 messages, 2,000 assignments, 600 submissions, and 4,000 rows in each plan table. All list projections use a fixed two-query shape except Replies, whose five queries cover the list, client preload, unread counts, waiting-sequence counts, and total. The six Workbench count projections remain fixed at six queries.

The plan run used all five intended tenant-leading indexes and found no unbounded sequential scan on a seeded large relation. It first exposed a Reply enrichment query that scanned all conversations. That query was changed to apply the selected conversation IDs and waiting timestamps directly to the tenant-scoped message query. A second discrepancy showed that the Programming service enum was absent from the generated OpenAPI parameter; the operation definition now publishes the closed `all | training | nutrition` schema and default.

The full scenario-to-test mapping, row counts, recorded plan structure, and observed timings are in [Ticket 17 behavior and query-plan verification](../verification/17-behavior-and-query-plans-2026-08-14.md).

Verification:

* Focused behavior and HTTP/OpenAPI matrix: 213 tests, 0 failures.
* `mix precommit`: 1,199 tests, 0 failures. Credo reported only the three existing complexity suggestions.
* CoachApp generated-contract checks and production build passed. The build retained its existing CSS minifier and chunk-size warnings.
