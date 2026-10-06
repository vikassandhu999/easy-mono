# Core domains: decisions

Status: frozen 5 October 2026. Change this file only with a new dated entry. The model is in `overview.md`; training in Postgres is in `training.md`.

## Model decisions

| # | Decision |
|---|---|
| M1 | Library, Plans, Tracker list, Records, History, and Client/coach are separate groups. |
| M2 | `templates` (edited directly) and `plans` (client identity) are separate tables. Assignment always copies. A plan is never linked to its template. |
| M3 | A published `plan_revision` never changes. A future revision can be withdrawn (deleted) before it takes effect. |
| M4 | Plan dates change only in the future. Archiving hides a plan and keeps its past. `created_local_date` is stored for E6. |
| M5 | A prescription copies the numbers that give it meaning at publish (nutrients, serving grams, recipe yield, exercise name). No food version tables. |
| M6 | Schedules have entries with stable ids. An expected occurrence is `(plan, entry, original_date)`, calculated, not stored. |
| M7 | A session stores the prescription used (`plan_revision_id`, `workout_id`) and, if selected, the occurrence it completes (`schedule_entry_id`, `occurrence_date`). The system does not guess. |
| M8 | `occurrence_exceptions` shape is agreed (moved, skipped by client, cancelled by coach). Built with the calendar, not before. |
| M9 | Each record table has the shared record fields. Every record write locks the client, adds 1 to `last_change_seq`, and writes `record_changes` rows with old and new values. |
| M10 | `records` is a view for the current timeline. "New since the last review" reads `record_changes` with `seq` > `reviewed_through_seq`. |
| M11 | Tracker lists are `tracker_assignments` on the client, with dated rows. No plan dates, revisions, or E6. The default template is copied at the first coaching start. |
| M12 | Tracker kinds: number, rating, yes_no, text, photo, document. Kind, unit, and scale are fixed at creation. |
| M13 | Exercises use `measures` + `bodyweight` instead of `tracking_type`. Fixed at creation. |
| M14 | Numbers are stored in base units (kg, m, s) with the unit the person typed. Unknown is not zero. |
| M15 | A value about the client is a Tracker entry, optionally linked to a session or meal. Water, supplements, habits, soreness, energy are Trackers. |
| M16 | One plan per domain per client per date. No add-on programs. |
| M17 | Only the client records workouts and meals. Coaches can record Tracker entries. |
| M18 | Summaries show counts and the target revision behind them, never calculated percentages or scores. |

## Policy defaults

| # | Policy |
|---|---|
| P1 | A target changes during a day: the day summary uses the revision in force at the end of the day and shows that it changed. |
| P2 | PRs use working sets that are done, not deleted, in completed sessions. |
| P3 | A corrected library food reaches a plan when the coach publishes the plan again. |
| P4 | A coach who edits today while a future revision exists is told that the edit applies until that date. |

## Not now

Progression across weeks (`cycle_weeks` > 1) · occurrence exceptions UI · library content and client preview · forms, appointments, groups · extra roles · linked templates · add-on programs · AI report parsing · wearable imports.

## Dated entries

| Date | # | Decision |
|---|---|---|
| 6 Oct 2026 | M19 | A fact with more than one value (sleep, cycle, goals, symptoms, fasts, health notes, workout feedback) gets its own model: its own record table, or columns on the record it describes (workout feedback on `training_sessions`). Every record table uses the shared spine (M9, M10). M15 applies to facts with one value. |

## Next

Build order: `.scratch/roadmap.md`.
