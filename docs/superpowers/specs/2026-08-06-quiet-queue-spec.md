# Quiet queue and snooze — workbench phase 3 sub-spec

**Date:** 2026-08-06
**Status:** Proposed. The design pass required by
[`2026-08-06-coach-workbench-spec.md`](2026-08-06-coach-workbench-spec.md) §8 B5/B6 before Quiet ships.
**Rule being honored:** schedule-aware, never calendar-aware. A client programmed 3×/week who
trained Friday is not "missing" on Sunday; day-based silence false-positives on every rest day
and teaches the coach to ignore the rail.

## What the schedule model actually provides

- A training plan in force today: `training_plans` with `status: :active`,
  `start_date <= today <= end_date`.
- Its schedule: each `training_workouts.weekdays` is an array of weekday names.
  A **scheduled session date** for a client is any date inside an in-force plan's window whose
  weekday appears in any of that plan's workouts' weekday arrays (union across plans when
  several are in force).
- Completion: `training_sessions` rows carry `date` and `state`; `:completed` is the only state
  that counts.
- Check-ins: `form_assignments` already lapse to `status: :missed` automatically when the next
  scheduled check-in comes due (the schedule sweeper does this today).

## Definition

An **active** client is quiet when either arm holds, unless snoozed:

1. **Training arm.** Let `s1 > s2` be the two most recent scheduled session dates strictly
   before today (dates inside the plan window only — a plan that started this week can't have
   missed two yet). The client is quiet when `s2` exists and they have **no completed session
   dated on or after `s2`** — i.e. the last two scheduled dates both passed without training.
   Any completed session since `s2` counts as presence, scheduled or not: a client who trained
   off-schedule is not quiet. Today is never missed — the day isn't over.
2. **Check-in arm.** The client's most recent check-in assignment (purpose `check_in`, newest
   by `due_date`, then insertion) has status `:missed`.

Not quiet: clients with no in-force training plan or an empty weekday schedule fall through to
the training arm's "no `s2`" case — silence with no schedule is not a signal, and Programming
already owns the no-plan case.

**Exit** (automatic, per the workbench rules): the client completes any session (training arm)
or the next check-in assignment supersedes the missed one (check-in arm). Re-entry is equally
automatic when the condition recurs.

**Sort:** most-missed first — ascending by "waiting since": the training arm's `s2`, or the
missed assignment's `due_date`, whichever is older when both arms hold.

**Badge:** accent count. This is the churn signal.

## Computation shape

Membership is computed in `Easy.Workbench`, not in the clients facts query — the weekday →
recent-dates step is trivial date arithmetic in Elixir and unreadable as SQL:

1. One query: visible active clients' in-force plans joined to workouts →
   `client_id => weekday union`.
2. Pure: `s1`/`s2` per client from the weekday set (each weekday's most recent past occurrence,
   clamped to the plan window; take the two latest).
3. One query: latest completed `training_sessions.date` per client.
4. One query: each client's newest check-in assignment status.
5. Merge, drop snoozed, sort by waiting-since → ordered id list. Count is its length.

`GET /v1/coach/clients?filter=quiet` returns that list as client rows (order preserved);
`GET /v1/coach/workbench` gains a `quiet` count. Bounded work: three indexed queries over the
roster — the lookback never exceeds 14 days because two weekday occurrences always fit inside
two weeks.

`last_active_at` stays display-only (row subtitle). It blends workouts, check-ins, food logs
and weight into one timestamp and cannot tell a rest day from a lapse — it never drives
membership.

## Snooze (B6)

`workbench_queue_snoozes`: `business_id`, `client_id`, `queue` (`quiet | expiring`),
`snoozed_until` (date), unique on `(business_id, client_id, queue)`. Upsert on re-snooze;
rows are never deleted — the exclusion predicate is `snoozed_until >= today`, so reappearance
at expiry is automatic and unsnoozing early is just snoozing to today… or not needed at all.

- `PUT /v1/coach/clients/:id/queue-snooze` body `{queue, snoozed_until}` → 204.
- Snoozed clients leave the queue **and its count**. The `expiring_soon` payload flag itself
  is untouched — snooze hides queue rows, it does not falsify roster chips.
- Only Quiet and Expiring snooze (the spec's decision): computed conditions elsewhere resolve
  fast; these two are the "on holiday" / "not renewing yet" pressure valves.
- UI: a snooze control on Quiet and Expiring rows offering 1 week / 2 weeks / 30 days.

## Rail placement

Quiet sits between Expiring and New clients: it is an accent (churn) queue and belongs with
the shouting ones; New stays the muted tail.
