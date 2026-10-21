# Core domains: Training, Nutrition, Trackers

Tracker and Review schema sketches below describe the earlier implementation. The agreed redesign is `.scratch/check-ins/spec.md` (10 October 2026), which supersedes assignments, separate requests, entry storage, and Review-owned reply links below. Use that spec for design; do not implement conflicting sketches from this file.

Status: final model, agreed 5 October 2026. Not implemented.

Research sources (the training, nutrition, shared, research, validation and industry-API reports, and the diagram) were removed on 6 October 2026; read them with `git show 1e6177a1:.scratch/core-domains/<file>`. Postgres detail for training: `training.md`. Build order: `.scratch/roadmap.md`.

## 1. The structure

| Group | Tells | Tables |
|---|---|---|
| Library | what can exist | `exercises`, `foods`, `recipes`, `trackers` |
| Plans | what the coach prescribes | `templates`, `plans`, `plan_revisions` |
| Tracker list | what the client is asked to record | `tracker_assignments` |
| Records | what the client does | `training_sessions` + `performed_sets`, `diary_meals` + `diary_entries`, `tracker_entries` + `tracker_entry_attachments` |
| History | what changed and when | `record_changes`, view `records` |
| Client and coach | who it belongs to | `clients`, `coaching_terms`, `reviews`, `tracker_requests`, `chat_messages` |

## 2. Rules

1. **Identity, value, and time are separate.** A plan is an identity. A revision is a value. The sequence of revisions is the time.
2. **A published value never changes.** Each save of a client plan adds a revision.
3. **The past never changes.** Plan dates change only in the future. Archiving hides a plan; it does not remove its past.
4. **A prescription keeps the numbers that give it meaning.** At publish, it copies nutrients, serving grams, and recipe yield. A later library change does not change it.
5. **A series is different from an occurrence.** A schedule entry repeats. "Workout A on Monday 6 Oct" is one occurrence with its own identity.
6. **"When it happened" is different from "when the system learned it".** Records have a local date. Changes have an order number.
7. **Corrections and removals stay visible.** Each change to a record writes one row in `record_changes` with the old and new value.
8. **One fact, one place. Calculate states.** No status column for due, open, current, or fulfilled. Facts that are decisions stay stored: completed, discarded, skipped, cancelled.
9. **Missing, zero, skipped, and failed are different facts.** No record means "Not recorded". Unknown nutrients are not zero.
10. **A value about the client is a Tracker. A value about what the client did is part of the workout or meal.** A Tracker entry can point to that workout or meal.
11. **Storage follows the write, unless you query across it.** Sets, diary entries, and tracker entries are rows. Plan contents are JSON.
12. **Numbers are kept in one base unit (kg, m, s), plus the unit the person typed.**
13. **Library items are archived, never deleted when used.** Their kind and measures are fixed at creation.

## 3. Library

| Table | Fields |
|---|---|
| `exercises` | business (null = built-in), name, instructions, media, mechanics, force, import_id, `measures` (reps, load, duration, distance), `bodyweight`, archived_at, + muscles, equipment |
| `foods` | business, name, brand, media, tags, `nutrients` per 100 g (map; absent = unknown), `servings` [{id, label, grams}], archived_at |
| `recipes` | business, name, instructions, tags, `ingredients` [{food_id, portion}], servings_count, cooked_weight_g, archived_at |
| `trackers` | business, name, `kind` (number, rating, yes_no, text, photo, document), base unit, scale_max, archived_at |

`measures`, `bodyweight`, `kind`, unit, and scale are fixed at creation.

## 4. Plans (training and nutrition)

**templates**: business, domain (training, nutrition, trackers), name, description, content, archived_at. The coach edits a template directly. Nothing in history points to a template.

**plans**: business, client, domain (training, nutrition), source template, name, description, start_date, end_date, created_local_date, archived_at.
- One client has at most one plan per domain on a date (checked under the client lock).
- `start_date` changes only while it is in the future. `end_date` can be set only to today or later.
- `created_local_date` is the creation date in the client's time zone at creation. The E6 rule uses it.
- Archive: if the plan still applies, its end date becomes today; then the plan is hidden from lists. Past dates keep their plan.

**plan_revisions**: plan, number, `effective_on` (null for revision 1 = from the plan start), content, created_by, inserted_at.
- A revision never changes. A trigger stops updates.
- A revision with `effective_on` in the future can be deleted (withdraw a scheduled change). Nothing used it.
- **Revision in force on date D:** greatest `effective_on` ≤ D (revision 1 is the earliest); for the same date, the greatest number.
- If the coach edits today and a future revision exists, the builder must tell the coach that the edit applies only until that date.

**Schedule** (in each content): `{ cycle_weeks, entries: [{ id, day, ref }] }`.
- `day` is 0–6 for one week (0–13 for two weeks, later). Day 0 is the Monday of the week the plan starts. Only `cycle_weeks = 1` now.
- Training: `ref` is a workout id. A day can have zero or more entries.
- Nutrition: `ref` is a day pattern id. Each day has exactly one entry.
- An entry id stays the same in later revisions until the coach removes that entry.

**Expected occurrence** (calculated, not stored): `(plan_id, entry_id, original_date)`. Example: "Workout A on Monday 12 Oct".

**occurrence_exceptions** (shape agreed, built with the calendar): plan, entry, original_date, action (moved, skipped, cancelled), new_date (moved only), actor, created_at. "Skipped" is the client's decision; "cancelled" is the coach's. No record is still "Not recorded". Fulfilment always uses the original key.

**Training content**: workouts → blocks (straight, superset, circuit) → items (exercise) → sets; schedule. Details in `training.md`.

**Nutrition content**:
```
targets         { energy_kcal: {min, max}, protein_g: {min}, … }
meals[]         { id, name, notes, items[] }
items[]         { id, source {type: food | recipe, id}, portion {type: grams | serving, …},
                  name, grams, nutrients }            ← copied at publish
day_patterns[]  { id, name, targets?, slots[] { id, name, meal_ids[] } }
schedule        { cycle_weeks, entries [{ id, day, ref: day_pattern_id }] }
```

**Assign**: copy the template content into revision 1 of a new plan. Resolve and copy the item numbers at that time.

## 5. Tracker list

**tracker_assignments**: business, client, tracker, timing (daily, weekly, after_workout, after_meal), weekday (weekly only), starts_on, ends_on.
- A change of timing ends the old row and adds a new row. The rows are the history.
- No two rows for the same client and tracker overlap (exclusion constraint).
- Plan dates, revisions, overlap rules, and E6 do not apply.
- Prompts show only on a date that a coaching term covers.
- A template with domain `trackers` holds a list `{ items: [{ tracker_id, timing, weekday }] }`. When the client's first coaching term starts, the business default template is copied into assignments. The coach can apply another template at any time.
- "On request" is not a timing. It is a `tracker_requests` row.

## 6. Records

Each record table has these shared fields: `business_id`, `client_id`, `local_date`, `timezone`, `recorded_by_type`, `recorded_by_id`, `request_id`, `revision`, `inserted_at`, `updated_at`.

| Table | Fields |
|---|---|
| `training_sessions` | `plan_revision_id` + `workout_id` (prescription used; both empty = free workout), `schedule_entry_id` + `occurrence_date` (the occurrence it completes; both empty = not scheduled), state (active, completed, discarded), started_at, ended_at, notes |
| `performed_sets` | `item_id`, `set_id` (empty = extra work), exercise (library id or free-text name), kind (warmup, working, drop), outcome (done, failed, skipped), reps, load_kg, duration_s, distance_m, entered units, rpe, rir, notes, deleted_at |
| `diary_meals` | `plan_revision_id` + `slot_id` (empty = not in plan), name (unique per client and date), chosen_meal_id, note_to_coach, shared_at |
| `diary_entries` | `planned_item_id` (empty = extra), source or quick add, portion, grams, nutrients as eaten, notes, deleted_at |
| `tracker_entries` | tracker, number (base unit) + entered unit, or text; `about_session_id` or `about_meal_id` (at most one); deleted_at |
| `tracker_entry_attachments` | entry, attachment, position |

- A nutrition occurrence needs no extra field: it is `(plan, local_date, slot_id)`.
- The client or the coach selects the occurrence that a session completes. The app can suggest one. The system does not guess.
- An occurrence counts one time, also when two sessions point to it.

## 7. History

**record_changes** (append only): business, client, `seq`, record_type (workout, meal, tracker_entry), record_id, row_type (session, set, meal, entry, tracker_entry, attachment), row_id, action (added, changed, removed), old_value, new_value, changed_by_type, changed_by_id, changed_at.

- `seq` is the client's change number. Each record write locks the client row, adds 1 to `clients.last_change_seq`, and writes the record rows and the journal rows in one transaction. One helper does this for all record types.
- The journal answers "new since the last review" (additions, corrections, removals) and keeps the old values.

**records** (view): `UNION ALL` of the three record tables, without discarded or deleted rows. The client timeline reads it.

## 8. Client and coach

| Table | Change |
|---|---|
| `clients` | add `review_frequency_days`, `focus`, `last_change_seq` |
| `businesses` | add `default_review_frequency_days`, `default_tracker_template_id` |
| `coaching_terms` | unchanged |
| `reviews` | client, coach, reviewed_at, `reviewed_through_seq`, `seen_at`, assessment (on track, needs attention, at risk), private_note, reply_message_id |
| `tracker_requests` | client, tracker, requested_by, requested_at, cancelled_at |
| `chat_messages` | reference types add tracker entry and review; review replies can be edited |
| `attachments` | allow PDF; add `captured_on` |

A review saves `reviewed_through_seq` = the client's `last_change_seq` at the moment the review screen read its data. Changes with a greater `seq` are new.

## 9. Calculated, never stored

Plan in force · revision in force · expected occurrences for a date range · fulfilled occurrences · coaching state · review due · request open · trackers due today · daily totals · PRs · new since the last review · "energy after 3 of 4 workouts" (distinct completed sessions with a linked entry, while the tracker was assigned).

## 10. Policies to set before the build

The model supports each choice. Defaults are given.

| Question | Default |
|---|---|
| A target changes at noon. Which target does the day summary use? | The revision in force at the end of the day. Show that the target changed. |
| Which session completes an occurrence? | The one the client or coach selects. |
| Which sets count for PRs? | Working, done, not deleted, in completed sessions, latest values. |
| A food is corrected in the library. When does a plan use it? | When the coach publishes the plan again. |

## 11. Not used, on purpose

Full event sourcing · a generic fact database · full calendar repeat rules · stored rows for future occurrences · reversal entries · food version tables · copies of every library field · webhooks as history.

## 12. Earlier proposals that this replaces

| Earlier | Final |
|---|---|
| Snapshots, frozen diary documents, frozen day targets | Records point to the revision used; prescriptions copy their numbers |
| One `plans` table for templates and client plans | `templates` and `plans` |
| A revision can be edited until used | A published revision never changes; a future one can be withdrawn |
| Plan dates change freely; archive removes coverage | Dates change only in the future; archive keeps the past |
| Session points to a workout only | Session points to the prescription used and the occurrence it completes |
| `records` table + detail tables | Shared fields in each record table, `records` view, `record_changes` journal |
| `updated_at` for "new since" | `seq` under the client lock |
| Tracker plan (domain `trackers` in `plans`) | `tracker_assignments` on the client |
| Units as entered | Base unit + entered unit |
| `tracking_type` | `measures` + `bodyweight` |

## 13. Bugs to fix during this work

1. "Skipped" is shown for a meal with no entry; it must be "Not recorded".
2. The calculated calorie adherence band conflicts with the check-ins spec.
3. The client library picker labels per-100 g nutrients as "for [default portion]".
4. Training session start does not read the plan in one consistent snapshot.
5. Training plans can be edited when archived.
6. Builders save details and contents in two requests.
7. The food seed changes missing nutrients to 0.
8. Seeded "(Weighted)" exercises cannot record added load.
9. E6 uses the client's current time zone for the plan creation date.
