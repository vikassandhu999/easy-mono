# Prove queue behavior and query plans

Type: task
Status: open
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
