# Build lifecycle and communication queue facts

Type: task
Status: resolved
Blocked by: 09, 10
Parent: [Coach workbench v1 delivery](../map.md)

## Question

Implement the reason-bearing membership facts for Onboarding, Check-ins, and Replies behind the public `Easy.Workbench` list and count functions.

## Locked behavior

* Onboarding uses `joined_at` lifecycle gating, returns at most one reason per active client, uses only the latest invitation send clock before acceptance, and only an overdue assigned Intake after acceptance. Invitation work becomes actionable strictly after the three-day due timestamp; Intake with no due date or due today is not overdue.
* Check-ins use unreviewed submission identity, oldest submission first, and preserve received work after client deactivation.
* Replies use conversation identity and `waiting_since`, oldest first, and preserve waiting conversations after client deactivation.
* Every list uses deterministic tie-breaks and returns the exact envelope and reason variants from [Define the queue reason contract](./01-define-queue-reason-contract.md).
* Counts aggregate distinct queue-item identities from the same fact source used by each list. Do not load fact rows into application memory to count them.
* Owner and trainer visibility remains tenant-scoped and fail-closed.

## Edit surface

* `backend/lib/easy/workbench.ex` and queue-specific helpers under `backend/lib/easy/workbench/`
* Existing `Easy.Forms` and `Easy.Chat` query builders where the fact source belongs to those domains
* Focused context tests under `backend/test/easy/`

## Acceptance

* `Easy.Workbench` exposes `list_onboarding_queue/2`, `list_check_in_queue/2`, and `list_replies_queue/2` with trailing options keyword lists.
* Each result contains total pre-pagination count plus ordered queue items and non-empty ordered reasons.
* Focused tests prove boundaries, ordering, visibility, identity, reasons, count/list parity, and drain behavior.

## Verification

Run the focused Workbench, Forms, and Chat context tests, then `mix precommit` from `backend/`.

## Answer

Implemented the canonical lifecycle and communication membership facts behind `Easy.Workbench`.

* `list_onboarding_queue/2` now uses one tenant- and visibility-scoped fact query. Pending invitations become actionable strictly after the latest send clock plus three days; accepted active clients instead surface only overdue, unfinished Intake assignments. The query excludes due-today, undated, completed, dismissed, and inactive Intake work, orders by oldest due action then client id, and emits exactly `invitation_follow_up_due` or `intake_overdue`.
* `list_check_in_queue/2` uses unreviewed Check-in submission identity, returns the submission/client/assignment envelope with `check_in_awaiting_review`, orders by submission time then id, and preserves submitted work after client deactivation.
* `list_replies_queue/2` uses waiting conversation identity, returns `reply_needed`, orders by `waiting_since` then id, and preserves waiting work after client deactivation. Conversation visibility is now a shared fail-closed Chat query builder used by both the inbox and Workbench.
* Every list returns `%{count: total_before_pagination, items: [...]}`. Its count is a database aggregate over distinct identities from the same membership query; no fact rows are loaded to count them. `Easy.Workbench.counts/1` now exposes canonical `onboarding`, `check_ins`, and `replies` values from these sources while the later HTTP-cutover ticket still owns removal of the legacy response field.
* Focused tests cover lifecycle and due boundaries, resend/completion/dismissal drains, submission and conversation identity, stable ordering, pagination parity, inactive-client preservation, exact reasons, tenant/trainer visibility, and malformed-context denial.

Verification:

* Focused Workbench, Forms, and Chat context suites: 119 tests, 0 failures.
* Ticket and context-layout suites after flattening the query helpers: 13 tests, 0 failures.
* Targeted formatting and `git diff --check`: clean.
* Credo reports only the three pre-existing complexity advisories in `Easy.MealLogs` and `Easy.Clients`.
* `mix precommit` reached 1,158 passing tests and one unrelated existing failure: the asynchronous email assertion in `Easy.Forms.RequiredServicesTest` does not observe the Intake reminder immediately. The same assertion also fails in isolation; no Forms reminder or mail-delivery code changed in this ticket.
