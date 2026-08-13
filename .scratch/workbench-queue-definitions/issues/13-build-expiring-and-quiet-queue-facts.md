# Build Expiring and Quiet queue facts

Type: task
Status: resolved
Blocked by: 08
Parent: [Coach workbench v1 delivery](../map.md)

## Question

Implement the accepted Expiring and Quiet membership facts while preserving snooze, roster, and automatic-deactivation semantics.

## Locked behavior

* Expiring includes active engagements ending from today through day 14 inclusive, excludes open-ended engagements, applies active snoozes, and orders by end date then id. Its reason is `engagement_ending_soon`.
* Extending beyond the window drains the item. The subscription sweeper still deactivates expired clients with `subscription_expired`.
* Keep `expiring_soon` only as the unsnoozed roster fact and calculate it with the same 14-day UTC window. Snooze affects the queue, not the roster fact.
* Quiet is check-in-only. Select the latest assignment that is already due before deciding whether it was missed; a future assignment cannot hide an earlier missed one.
* A later completed due check-in clears Quiet. Apply active snoozes, order by missed due date then client id, and return `missed_check_in`.
* Delete the training-schedule and inactivity arm from Quiet.
* Counts and lists use the same tenant-scoped reason facts and deterministic order.

## Edit surface

* `backend/lib/easy/workbench.ex` and queue-specific helpers under `backend/lib/easy/workbench/`
* `backend/lib/easy/clients.ex` only for the retained roster `expiring_soon` projection
* Subscription sweeper and focused tests where automatic deactivation is asserted

## Acceptance

* Boundary, snooze, visibility, ordering, reason, parity, and drain tests cover all Expiring and Quiet cases in the source specification.
* No Training session or workout record can change Quiet membership.

## Verification

Run the focused Workbench and sweeper tests, then `mix precommit` from `backend/`.

## Answer

* Added explicit, reason-bearing Expiring and Quiet fact queries behind `Easy.Workbench`, with database counts derived from the same tenant- and visibility-scoped membership queries as their paginated lists.
* Expiring now uses the inclusive 14-day UTC renewal window, active snoozes, `engagement_ending_soon` reasons, and stable end-date/client ordering. The unsnoozed roster-only `expiring_soon` fact now uses the same 14-day window, while renewal beyond the window drains the queue.
* Quiet now selects each active visible client's latest already-due Check-in assignment before testing for `:missed`, ignores future assignments, drains after a later completed due Check-in, applies active snoozes, and emits `missed_check_in` reasons in due-date/client order.
* Removed the Training schedule/inactivity membership arm and routed the legacy Quiet client loader through the canonical Check-in-only query. Existing subscription sweeping still deactivates expired engagements with `subscription_expired`.
* Focused Workbench, client-roster, persistence, and sweeper verification passed 79 tests. `mix precommit` passed 1,173 tests with no failures; Credo reported only the three pre-existing complexity advisories.
