# Build Programming queue facts

Type: task
Status: resolved
Blocked by: 09
Parent: [Coach workbench v1 delivery](../map.md)

## Question

Implement the Programming membership query, reason classification, filters, counts, and stable ordering from the accepted required-services model.

## Locked behavior

* Expand each visible active client into at most two required-service facts. Exclude unclassified and inactive clients.
* Combine assigned active Training and Nutrition plan intervals into one common fact shape, inspect the bounded UTC-date window from today through day seven, and aggregate back to one client row.
* Open-ended coverage is indefinite. A seamless successor covers the window; a successor after a gap does not hide the gap. Draft, unassigned, and deleted plans do not provide coverage.
* A service with no historically assigned plan is `service_never_programmed`; otherwise classify its earliest uncovered date as missing or ending soon exactly as [Define the queue reason contract](./01-define-queue-reason-contract.md) specifies.
* `service=all|training|nutrition` filters facts before grouping. All counts distinct clients; service counts may overlap and come from the same service-status result.
* Return strict reason order, the accepted priority groups, earliest-uncovered ordering, and a stable client tie-break.

## Edit surface

* `backend/lib/easy/workbench.ex` and a focused Programming query module under `backend/lib/easy/workbench/` if needed
* Training and Nutrition plan query builders only where a shared interval projection belongs
* Focused Workbench context tests

## Acceptance

* The implementation is one tenant-scoped database query per list/count projection, with no per-client application query.
* Tests cover every Programming case in the source specification, including overlapping service filters and distinct All counts.

## Verification

Run the focused Programming context tests and inspect the generated SQL, then `mix precommit` from `backend/`.

## Answer

* Added one shared, tenant-scoped Programming fact query that expands active visible clients by required service, combines assigned Training and Nutrition history and active coverage intervals, and classifies the earliest uncovered UTC date across today through day seven.
* Added strict Programming reasons, filter-before-grouping behavior, distinct overlapping counts, stable priority/date/service/client ordering, and paginated one-row-per-client results through `Easy.Workbench`.
* Kept the canonical Programming counts as a dedicated context projection; [Cut over workbench HTTP and OpenAPI contract](./14-cut-over-workbench-http-and-openapi-contract.md) owns replacing the legacy public count shape.
* Covered required-service expansion, never/missing/ending classifications, horizon edges, seamless successors, internal gaps, open-ended coverage, deleted/unassigned/history semantics, filters, pagination, ordering, tenant visibility, and fail-closed contexts.
* Inspected the generated SQL and confirmed one bounded set-based statement with no per-client application queries. Focused compatibility verification passed 52 tests; `mix precommit` passed 1,172 tests with no failures. Credo reported only the three pre-existing refactoring advisories.
