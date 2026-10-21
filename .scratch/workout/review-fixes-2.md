Supervisor review fixes, round 2. Fix every item. Verify each one in the code before you change it.

Do not touch `20261020000500_drop_legacy_workout_data.exs`. The user approved the drop as written.

1. **Client draft dead end.** `clientapp/src/ui/use-durable-draft.ts:35-38` and the `!durable.draft` branch in `clientapp/src/today/workout.tsx`: a corrupt draft blocks the workout forever. Give both apps the same behaviour as the coach hook: remove the bad key, fall back to `initial`, and render the saved log. If both copies can become one shared implementation without breaking the ui → api → feature direction, make them one.

2. **Muscle trimming can create duplicates.** In `20261020000100_exercise_definitions.exs:32`, trimming can create duplicate muscle names, and the migration then fails with no ids. Dedupe while trimming and keep the first position. Add fixture `01` cases with `'Quads'` and `' Quads'`.

3. **The two recording hooks are near copies.** `coachapp/src/workout-session/use-session-recording.ts` and `clientapp/src/today/use-workout-recording.ts`: move the shared logic into `createRecordingController` in `@easy/workouts/session`. That covers write ordering, `isCurrent`, `isRejected`, `createId`, owner capture, reset on initial, and the controller ref. Each app passes only `execute`, `reload`, and its durable draft.

4. **The generic operation type does nothing.** Remove `O extends SessionOperation`, the `operation` mapper option, and the `isOperation` parameter of `parseWorkoutDraft`. Delete both apps' `RecordingOperation` unions and type `execute(op: SessionOperation)`.

5. **Slot and plan logic is still duplicated in both screens.** Add `selectedActivity(row)`, `slotModel(log, row, slot, draft, fallback)`, and `planDraft(row, rounds, rests)` to `session.ts`. Use them in `coachapp/.../workout-session.tsx` (slot setup around lines 747-760, the plan editor around 1067-1084) and `clientapp/src/today/workout-logger.tsx` (around 488-502 and 813-830). Also move `hasRecordedWork` and the rounds fallback into the package. Replace every `row.current ?? row.activities.at(-1)` with `selectedActivity`. The `.tsx` files only render.

6. **Unused wrappers.** Both apps' `useRecording` return 13 wrappers nobody calls. Return `{execute, reload}`, and have `useStartSession` call `execute({action: 'start', body})`.

7. **Dead re-exports.** Delete the pass-through exports with zero users in both `model.ts` files, the unused exports in `clientapp/src/api/workouts.ts`, and the coach model's unused target re-exports. Import package helpers from `@easy/workouts/...` directly.

8. **Start-key storage is over-built.** In `coachapp/src/api/workout-logs.ts:300-332`, store only the UUID string under the key. Build the body from the arguments. Wrap the `removeItem` in the 4xx path so a storage error can never hide the API error.

9. **A repeated set removal returns 404.** Make `remove_set` idempotent on the server: when the activity exists and the set is already absent, return the current session. Delete the client special case in `session.ts:509-513`. Add a backend test.

10. **Completing an activity is not idempotent with measurements.** In `workout_logs.ex:395`, `activity_transition_satisfied?(completed, attrs, :complete)` requires `attrs == %{}`. Make it succeed when the supplied measurements equal the stored ones, after a dry-run changeset, the same way `finish` does. Add a test.

11. **`run.sh` accepts any failure and leaves the test DB behind.**
    - Add a 5th argument: the expected error text. In fail mode, capture the migrate output and require `grep -F` of that text.
    - Add `trap 'MIX_ENV=test mix ecto.drop --quiet' EXIT`, so a failure never leaves fixture data in `easy_test`.
    - Rerun all 7 checks with the expected texts: `invalid media URLs`, `unresolved workout log recorders`, `mixing sided and unsided sets`, `inconsistent side modes`.
    - Update the table in the report.

12. **`occursOn` is impure.** Keep `occursOn(schedule, date)` pure, with no optional `columnBit`. Do the today-column check at the call site in `workout-week.tsx`.

13. **The coach screen carries client-logger leftovers.** In `workout-session.tsx`:
    - Pass the session straight into `RecordingView`, or merge it with `SessionEditor`.
    - Remove the impossible `log?.` and `log &&` guards and the no-op fragments.
    - Collapse the pass-through `on*` props.
    - Change the discard copy, which says "your history", to coach wording: "Discarded sessions stay in the client's history."

14. **Units are hardcoded.** `inputLabel` in `session.ts:286-298` hardcodes `kg` and `m`. Use the metric catalogue units, keeping only the real exceptions (`reps`: no unit; `duration`: "s or m:ss").

15. **A loose type.** `workoutLogKeys.infinite(clientId, filters)` takes `filters: object`. Type it as the real filter type.

Then run every gate:
- `rtk just gen-api`
- backend `rtk mix precommit`
- `rtk pnpm -C frontend lint:ci`
- `rtk pnpm -C frontend/packages/workouts check`
- both app builds
- coach `test:visual-hierarchy`, `test:exercises`, `test:workout`, `test:workout-session`, and client `test:today`
- all 7 migration checks through the updated `run.sh`

The servers on 4000, 2022, and 1315 may already be running; reuse them. Add a "Review round 2" section to `.scratch/workout/verification-report-activity-logging.md` with each item, its fix, and its test.

Hard rules: no commits; HEAD stays `4e238f91`; no deliberate index changes; do not touch the protected paths. Use the same final report format.
