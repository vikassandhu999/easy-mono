# Build lifecycle and communication queue facts

Type: task
Status: open
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
