Supervisor review fixes, round 1. Fix all of the items below, then rerun every Task 10 gate. Each item gives the file, the defect, and the required fix. Verify each one in the code before you change it.

1. **Legacy unlinked sets can collide on the new index.** In `20261020000300_activity_logging.exs`, the index `exercise_sets_activity_round_side` can fail on legacy data, because the old schema allowed several unlinked sets of one exercise in the same round and side.
   - Fix: when converting unlinked sets, split duplicates into separate added activities. Add `row_number() OVER (PARTITION BY workout_log_id, exercise_id, round, COALESCE(side,'') ORDER BY inserted_at, id)` to the unlinked grouping key, so occurrence n of each slot goes to activity n.
   - Add a fixture to `03.sql`/`03-check.sql`: two plank sets with no entry, both round 1 and side null, convert into two activities.

2. **Old exercise data can fail the new strict checks in `20261020000100_exercise_definitions.exs`.**
   - During conversion, `btrim` the labels taken from `count_label` (null when blank), every muscle element, and the joined equipment text (null when blank).
   - Before converting media, add a RAISE guard that lists the ids of exercises whose `media` is not null and does not match `^https?://[^/[:space:]]+`.
   - Add fixtures for a padded label, a padded muscle, and padded equipment.

3. **The recording logic is duplicated in both apps.** That breaks Decision 12 and the quality rules. Move into `@easy/workouts` (`recording.ts`, or a new `session.ts`):
   - from both `model.ts` copies (`coachapp/src/workout-session/model.ts` and `clientapp/src/today/model.ts`): the command queue and draft model (`WorkoutDraft`, `queueCommands`, `acknowledgeCommand`, `validOperation`, `parseWorkoutDraft`, `measurementBody`, `savedInput`, `slotView`, `copyTargets`, `effortLabels`/`effortLabel`, slot and overall input keys)
   - from the screens: the pure helpers `targetLine`, `inputLabel`, `restDraft`, `restBody`
   - from the screen controllers, the pure parts of `runPending`/`commit`/`prepareActivity`/`saveSlot`/`saveActivity`/`onSwap`/`onFinish`

   Make the moved code generic over the operation type. Each app keeps only its `.tsx` and a thin hook that wires the API calls. Remove the `as MeasurementBody` casts: make `measurementBody` return a type built from the measurement field table, so no cast is needed. Move the package tests along with the code.

4. **A rejected coach start key is never cleared** (`coachapp/src/api/workout-logs.ts`), so every later click replays the same rejected id.
   - Clear the stored start key when the server returns a 4xx.
   - In the week, show "Open" for an occurrence that already has a non-discarded log (active or completed) instead of "Start session".

5. **An unreadable draft or start key blocks the coach session screen.**
   - On a parse failure, drop the stored key, fall back to an empty draft, and render the saved session.
   - The coach screen uses `ui/use-durable-draft` (or the coachapp equivalent; create one in `coachapp/src/ui/` if none exists, mirroring the client one) instead of calling `localStorage` directly.

6. **Recorder names are computed in two places.** Use one implementation (for example on `WorkoutLog`, or set in `include_content`) for both `client_days.ex` and `workout_logs.ex`. Any value outside client/coach gets a total fallback; it must never raise.

7. **Finding the active log reads the whole history.** Add `state` to `WorkoutLog.list_query` and to the context list opts (both actors). `useActiveWorkoutLog` fetches `{state: 'active', limit: 1}`. On failure, show the error and keep "Start session" usable after a retry. Add a backend test for the `state` filter, including tenant scoping.

8. **Coach query keys break the `keys.ts` contract.** Add `workoutLogKeys.infinite(clientId, filters)` for the Recent sessions list. The active lookup uses the real `{state: 'active'}` filter key.

9. **A finish retry that carries feedback returns 422.** Also treat finish as idempotent when the log is already completed and the supplied feedback equals the stored values. Different feedback on a completed log still returns the error. Add a test.

10. **A constraint name is registered but never created.** `Workout` registers `workouts_name_valid`, which no migration creates. Register the real constraint name (`workouts_name_check`), or create the named check in 0200. Make the registration and the database agree, and add a test that hits it.

11. **Supervisor decision on side mode.** In `20261020000200_workout_content_embeds.exs`, derive `side_mode` from `COALESCE((legacy entry exercise_snapshot->>'unilateral')::boolean, exercises.unilateral, false)`. The snapshot is what the old set trigger enforced, which follows Decision 5's "preserve what was shown and enforced" intent. Add a fixture where the snapshot and the current exercise flag differ.

12. **Smaller frontend fixes.**
    - The client app re-exports workout types from a file that owns workouts (`clientapp/src/api/workouts.ts`) instead of `exercises.ts`.
    - Remove the duplicate weekday check in `workout-week.tsx`.
    - Move `occursOn` to the week model or the package.

13. **Migration fixtures still missing.** Add: a former coach as recorder; padding when sets go past the group's rounds; a per_side activity; a mixed-sides abort check (a separate negative fixture, like the unknown-recorder one); and a swap-only activity on an active log.

Then rerun the full Task 10 verification: `rtk just gen-api`, backend precommit, frontend lint, package check, both builds, all migration checks (positive and negative), all five browser suites plus visual hierarchy, and dev migrate. The dev database already ran 0100–0400. If you change a migration that has already run there, verify the changed migration on the test database with the fixture procedure. Then also run it against a copy of the dev database: `createdb -T easy_dev_refactoring easy_dev_migration_check`, roll forward from the pre-0100 state if possible, otherwise state clearly which changes were verified on fixtures only. Do not drop or alter `easy_dev_refactoring` itself.

Update `.scratch/workout/verification-report-activity-logging.md` with a "Review round 1" section: each item, its fix, and its test. Same hard rules: no commits, HEAD stays 4e238f91, no deliberate index changes. Use the same final report format.
