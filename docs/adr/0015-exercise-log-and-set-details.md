---
status: accepted
date: 2026-10-19
---

# Keep overall exercise results separate from set and interval detail

Clients and authorized coaches need to record personal physical activities beyond gym sets. A continuous activity normally has one overall result and can also have interval details. Adopt `WorkoutLog -> ExerciseLog -> ExerciseSet` to give the overall result and its detail distinct ownership.

## Accepted direction

WorkoutLog represents the session. ExerciseLog represents the overall exercise/activity result within that session. ExerciseSet represents optional individual set or interval outcomes beneath it.

For a run, an overall result might report 5 km in 30 minutes, with five 1 km intervals beneath it. These describe the same work. Reports must not add the interval distances to the overall distance and report 10 km. Strength work uses the same hierarchy, with per-set repetitions and weight in the detail records.

The recorder can confirm performed work without supplying measurements. This must not invent numbers from the prescription or turn unknown values into zero. An explicit skip is distinct from an absent record. ExerciseLog has an activity outcome state; ExerciseSet has a required completed/skipped outcome with no default. W83 supplies the recording commands and lifecycle below.

We considered flat outcome rows, separate performed/skip records, pre-created planned slots, a parent result with child detail, and separate models by activity type. The parent/detail direction supports the requested overall activity result together with optional intervals. It adds a relationship, but avoids representing a summary and its component intervals as independent work.

## Create activity logs on demand

Create an ExerciseLog when the person commits to recording the selected activity. Opening the workout, viewing its next exercise, or previewing alternatives does not create activity records. The workout remains the source of the prescription, and unvisited entries have no exercise logs.

An explicit start-recording action can create the current log. A first saved target edit, result, or explicit skip can also start it implicitly; the flow does not need an extra setup screen or button. This permits adjusted targets and rest to survive interruption before the first set is recorded. Creating the log means recording has begun, not that the activity was performed. Completion and skip remain explicit outcomes.

We considered waiting until the first result to create the log. Creating it when recording begins keeps pre-result choices with the current activity and avoids requiring a separate place to persist those choices. It still creates only the activity the recorder has chosen to work on.

## Exercise choice and substitutions

The exercise reference identifies the selected activity; its outcome determines whether it was performed or skipped. An optional reference to the original prescribed entry provides context for comparing the chosen activity with the plan. Substitution can be derived by comparing those exercise references, without an is_swap flag.

| Action | Recording behavior |
|---|---|
| Choose a replacement before starting | Create only the replacement's ExerciseLog when recording begins. |
| Change selection after recording starts but before any saved result or explicit outcome | Reuse the current in-progress ExerciseLog for the new choice, applying the agreed replacement-target rules. |
| Change exercise after saving work or an explicit outcome | A normal swap creates another ExerciseLog; keep the earlier log and its details. Both can refer to the same prescribed entry. |
| Resume the same activity | Use its existing log rather than creating another. |
| Explicitly skip an unstarted activity | Create its skipped outcome without inventing performed values. |

An intentional new activity can have a new log even if the exercise was used earlier in the session. Do not identify a recording occurrence solely by its exercise ID. Explicit corrections remain a separate operation from normal swapping.

ExerciseLog owns the selected exercise and its session-specific instructions under W83. The earlier ExerciseSwap structure remains declared for migration/review, but new recording commands do not use it. The rules for editable count/rest, blank replacement metric targets, and explicit target copying remain as decided in ADR 0013.

## Core ExerciseLog fields

The review draft declares the following core fields and relationships. Measurement validation and recording commands are implemented below; database constraints, transactions, and runtime writers remain pending.

| Field or relationship | Meaning and planned rule |
|---|---|
| `business_id`, `workout_log_id` | Required ownership. The business must match the parent session. Client and original recorder come from WorkoutLog. |
| `exercise_id` | Required selected activity. Its identity alone does not indicate performed work. Exercise availability follows the existing business and archive rules. |
| `workout_exercise_id` | Optional ID of the original prescribed JSONB entry, not a relational foreign key. Nil means an added activity without a prescribed entry. Several logs may refer to the same entry, so this is not unique within a session. |
| `state` | Required enum: active, completed, or skipped; defaults to active. Active means no final activity outcome was confirmed and can include partial work. A closed workout freezes that unfinished record. Completed explicitly confirms performed work, even without measurements; it does not claim every prescribed target was met. Skipped explicitly confirms no performed work for this activity occurrence and must not overwrite saved work. |
| `position` and `sets` | The writer assigns a nonnegative position, unique within the parent session, to retain activity order independently of the prescription. Optional ExerciseSet children link through exercise_log_id. The schema also has the usual UUID and creation/update timestamps. |

There is no uniqueness rule on exercise_id within a session: the recorder can intentionally record the same activity again. The identity of an activity occurrence is its ExerciseLog ID. W83 defines state transitions, partial recording, instructions, and slot identity below.

## Overall distance and duration

The overall measurement fields include nullable distance_m (decimal metres) and duration_s (decimal seconds). W82 widens the original W81 whole-second declaration at both levels to retain results such as a 12.45-second sprint. They hold the recorder's reported result for this activity occurrence. Values must be nonnegative when supplied. Nil means unknown, zero is an explicitly reported value, and completion requires neither measurement. A skipped activity has no overall measurements or performed child work. The measurement changeset rejects nonempty overall values for an already-skipped log; W83 also validates child outcomes and state transitions.

For example, the recorder reports a 5 km run in 30 minutes. ExerciseLog stores distance_m = 5000 and duration_s = 1800. It can have no interval records, two recorded 1 km intervals, or all five 1 km intervals. In each case the reported overall result remains 5 km in 30 minutes. Missing interval details do not imply skipped work, and completion does not establish that interval coverage is complete.

Keep reported overall results and recorded detail separate. Do not sum parent and child measurements, automatically populate a missing overall result from child sums, or change an overall result when details are edited. If no overall distance is reported, two recorded 1 km intervals describe 2 km of recorded interval detail; the whole activity's distance remains unknown. Do not fill actual results from prescribed targets.

We considered deriving every overall result from the children, switching automatically between entered and derived results, and keeping an explicit reported result. Derivation assumes complete interval coverage, which this design does not require. Automatic fallback would make a result's meaning change when detail is added or removed. Choose explicit reported results for this first slice. The trade-off is that interval-only records do not automatically supply a whole-activity total. Any later calculation must state its coverage and source.

## Complete measurement contract

Use one fixed catalogue with typed columns on ExerciseLog and ExerciseSet. Exercise defines the selectable metrics, WorkoutExercise defines targets, WorkoutLog owns session feedback, and the two result schemas own actual measurements for their respective scopes. Kind supplies defaults; it does not restrict result shape. A strength activity can report 30 repetitions overall with no individual sets. Recorded details can be absent or incomplete.

| Family | Fields and meaning |
|---|---|
| Counts and totals | reps, successes, and attempts are optional integers. duration_s, distance_m, elevation_gain_m, and calories_kcal are optional decimals. Each describes its whole activity or individual detail; detail does not automatically populate a parent total. |
| Load, height, and settings | weight_kg, height_cm, and incline_pct are decimals; level is an integer. One overall value applies to the recorded activity throughout. When these values differ, record them in individual details instead of inventing an average or maximum. |
| Changing intensity | avg_speed_m_s, avg_power_w, avg_cadence_per_min, and avg_heart_rate_bpm are decimals. They explicitly store the reported average for that activity or individual interval. Cadence uses a neutral per-minute name; entered_units distinguishes rpm from spm. A maximum interval average is not an instantaneous peak. |
| Perceived effort and reserve | effort is an optional decimal from 1 through 10 at both levels, describing that activity or set. This is separate from WorkoutLog's integer 1–5 feedback. reserve is an optional decimal from 0 through 10 on ExerciseSet only. Neither value is automatically averaged across sets. |
| Outcomes | score is an optional decimal and result is the optional win/draw/loss enum. They describe the recorded scope and are not automatically derived from child outcomes. Tempo remains target-only; grade remains historical-only. |

All new measurement values are optional. Counts are whole numbers; supplied numeric values must be finite. Values are nonnegative except weight, incline, and score, which retain the existing negative-value meanings. Level starts at one. Known successes cannot exceed known attempts within the same record. A selected metric is not a required answer, and targets never limit the actual result the person may report.

Do not mix reported measurements with calculated statistics. Pace, accuracy, and training volume can be calculated only from suitable known inputs and with their coverage made clear. Ten repetitions at 40 kg and five at 60 kg retain both loads; calculating the two sets separately gives 700 kg-repetitions. Multiplying the unweighted average load by total repetitions would give 750 and misrepresent the recorded work.

A reported 5 km activity with details totaling 6 km is accepted for saving without rewriting either value. The product should show a nonblocking mismatch for correction. Mismatch presentation and calculation are not implemented by this draft; the measurement validators intentionally do not enforce equality or sum the hierarchy. Duration comparisons additionally require a defined time basis and treatment of overlapping intervals; do not assume elapsed time equals the sum of set durations.

We considered copying the full field list without scope rules, fixed catalogue fields with explicit scope rules, a generic measurement table, separate activity-specific schemas, and summaries derived entirely from details. Choose fixed catalogue fields with explicit scope rules. This keeps the existing typed-column approach, supports personal physical activities without new model types for each activity, and permits incomplete logging. It deliberately provides no coach-created metric types, sensor time series, peak-value expansion, or automatic aggregation in this slice.

## Typed units and retained history

entered_units keeps its name and JSONB role but becomes a typed ResultUnits embed with enum fields for each supported numeric metric. It preserves the existing unit choices. Omission retains the current units; an object updates only supplied unit keys; an explicit null key clears that unit, and null for entered_units clears the complete embed. Unknown keys, unregistered units, and wrong object shapes are rejected. There is no unit entry for result, tempo, or grade. Reserve units are available only to set results.

Recorded numbers always use canonical units, even when entered_units records lb, min, or a pace display. The caller must convert before passing the numbers to this helper. Changing unit metadata never converts or changes an existing canonical value. This embed records units, not the original textual input.

The older ExerciseSet.speed_m_s, power_w, cadence_rpm, heart_rate_bpm, and grade fields remain declared and readable. New measurement changesets reject writes to them. They are not copied or relabeled as averages because their historical statistic is unknown. A future migration must preserve those values and known unit metadata; resolving their interpretation is a separate decision.

Removing a metric from the current Exercise definition does not remove its recorded values or units. Omitted values and explicit resubmission of the same value remain valid; a new or changed nonnull value requires that metric to be selected. Explicit null can clear a value. This helper does not implement a separate correction workflow for changing historical values after their metric was removed.

## Draft validation

ExerciseLog.measurements_changeset/3 and ExerciseSet.measurements_changeset/3 delegate to ResultMeasurements with their recording scope. They validate measurement-only input, numeric limits, selected metrics, outcomes, and typed units. Unknown input is rejected, including state, ownership references, derived statistics, and historical-only fields. The caller must authorize and resolve the exercise and parent, enforce the lifecycle, and persist the row; these helpers do not do that work.

The executable [draft checks](../../.scratch/workout/measurements_test.exs) cover reported totals with partial details, summary-only strength, differing set loads, nonblocking mismatches, fractional values, optional results, numeric bounds, unit edits, and retained historical values. Run them from the repository root with `rtk proxy elixir -pa 'backend/_build/dev/lib/*/ebin' .scratch/workout/measurements_test.exs`.

## Recording lifecycle and session instructions

The draft Recording module returns changesets for concrete user actions. It requires an active WorkoutLog and the complete, authoritative activity/set hierarchy. Ownership, selected exercise, original prescribed entry, and slot identity come from resolved records; ordinary result input cannot change them.

| Action | Behavior |
|---|---|
| Start or resume | Start creates only the selected active ExerciseLog, with no ExerciseSet rows. Resume keeps the existing activity. A repeated exercise can be intentionally started as a new occurrence. Position is assigned after the existing activities. |
| Record or skip a set | record_set explicitly saves completed work, with or without measurements. skip_set explicitly saves a skipped outcome without measurements. No row means unrecorded, not skipped. A skipped set can later be explicitly recorded as completed. |
| Complete, skip, or reopen an activity | Completion confirms performed work without requiring metrics or all planned sets. Skipping is permitted only without recorded measurements, completed children, or a completed activity outcome. Reopening explicitly undoes the overall completion/skip while retaining measurements and child outcomes. A skipped activity can also be explicitly confirmed performed before adding results. |
| Finish, reopen, or discard the workout | Finish changes only the workout outcome and feedback; unfinished activities remain active and missing sets remain absent. A closed workout makes every child read-only. Reopening the workout restores editing and preserves all outcomes, values, recorder references, and IDs. Discard retains the hierarchy and prevents further editing. |
| Correct a result | Existing set values can be edited explicitly while the workout is active. Its round and side cannot be moved through an ordinary update. remove_set is an explicit scoped deletion changeset for a mistaken row; automatic skips, swaps, and completion never call it. |

Activity state describes the recorded outcome, not permission to edit. Completed activities can receive corrections or additional results while their workout is active. Explicit activity reopening preserves work, so it does not bypass the protection against skipping or overwriting recorded results. Finishing a workout does not require another confirmation for every unfinished activity.

ExerciseLog now stores side_mode, rounds, targets_mode, and typed RoundTargets. A linked activity inherits the prescribed entry's side mode and instructions. An added activity defaults to combined side mode, one planned round, and one blank target entry; the caller can choose per_side when starting it. These defaults create no performed values or result rows.

The recorder can change the current activity's planned count, targets, and rest. These instructions apply to unrecorded work and do not rewrite the coach's workout or previously recorded results. Targets reuse the existing exact/range/max/client-choice validation and strict target-list lengths. Counts are positive and at most 10,000; an edited count cannot exclude any recorded round for the same prescribed entry, including outcomes in earlier replacement logs. Recording an extra round does not require changing the plan first.

A replacement retains the current count, side mode, target mode, and rest, while clearing metric targets. Compatible targets can then be supplied explicitly through the ordinary target editor. An untouched active selection is updated in place; an existing measurement, child outcome, or final activity outcome causes a new activity log instead. Selecting the same exercise resumes the current record. When recorded extra rounds require a longer initial per-round list, the new slots receive blank targets with client-chosen rest; existing target slots are not truncated or stretched during ordinary edits.

For linked activities, round retains the original prescribed entry's round number across replacements. The tuple (workout session, prescribed entry, round, side) can have only one result. This permits the left side of round 1 on the original exercise and the right side on a replacement without overwriting either. Combined results use null side; per_side requires left or right. Added activities use (activity, round, side), so repeating an exercise as a separate added activity is valid. Skip rows also occupy their slot. Explicit updates identify the existing result rather than silently replacing it by position.

Legacy WorkoutLog.swaps and direct set associations remain for migration/review. The new Recording commands reject sessions containing them, and WorkoutLog validation rejects mixing legacy content with the new hierarchy. New sets write their activity reference; the older direct workout/exercise reference fields remain declared but are not populated by these commands. This avoids two competing owners of selection and instructions.

WorkoutLog insert initializes an empty activity list. Update and finish validate the loaded hierarchy's ownership, states, positions, sides, and unique slots. They never replace that hierarchy from request input. The [recording checks](../../.scratch/workout/recording_test.exs) exercise these operations together, including swaps between sides, partial completion, reopening, corrections, and instruction ownership.

## Integration work

- Implement migrations and database constraints, preserve historical values, and convert old direct results/swaps into activity-owned records. Exercise and attachment references remain IDs.
- Implement authorized client/coach writers and typed API routes. Every recording mutation and finish/reopen must lock the parent session, load the authoritative hierarchy, validate, and persist atomically. Activity positions and per-activity slots need database uniqueness; shared prescribed slots across replacements also require the session lock. Retry handling must reuse the intended operation/record identity. Checks on changesets alone do not prove concurrency safety.
- Connect the coach/client flows and their nonblocking mismatch display. Aggregate reports and time-basis rules can follow; neither blocks entering and saving the agreed reported results.

Exercise references remain IDs; this decision does not reintroduce exercise snapshots. The existing side-mode and swap rules still apply, including preservation of recorded work.

## Implementation boundary

The [review draft](../../.scratch/workout/models.ex) includes the hierarchy, typed measurements and units, session instructions, recording commands, and workout-level lifecycle validation. Earlier direct links and ExerciseSwap remain as an isolated legacy path for migration/review. These are executable pure changeset checks, not a persisted end-to-end flow. Runtime code and stored data are unchanged.

This records W78–W83 in the [workout concept](../../.scratch/workout/concept.md).
