# Client logging implementation

The corrected 13 October brief is the build contract. The agreed prototype is the screen contract.

## Constraints

- Stay on the current branch. Do not commit or stage files.
- Preserve `skills-lock.json`, `clientapp-v2`, and the Today prototype.
- Add one migration with exactly `nutrition_logs`, `food_logs`, `workout_logs`, and `exercise_sets`.
- Do not connect these tables to the record spine. W34 is withdrawn.
- Keep meal drafts, unticked inputs, and added rounds on the device.

## Work

1. Nutrition: schemas, transactional client operations, food copies, correction arithmetic, occurrence constraints, and same-day prescription history.
2. Workouts: schemas, state transitions, sets, swaps, occurrence and active constraints, and same-day prescription history. This part owns the shared migration.
3. API: client day resolution, week markers, catalogue searches, typed log routes, generated types, and HTTP isolation tests.
4. Client: Today above the existing home content, meal and workout routes, durable drafts, inverse Undo, focus, messages, and error recovery.
5. Browser: reset test-owned fixtures by stable keys, cover every prototype flow at 375px against Phoenix, and inspect screenshots.
6. Verify: backend precommit, frontend lint, both maintained builds, API generation, three consecutive Today runs, and the existing coach nutrition/workout suites.

## Review focus

- A coach edit after recording today must preserve the prescription used by the log.
- A correction must use the saved food copy after catalogue edits.
- Foreign clients, schedules, foods, exercises, and sets must fail without partial writes.
- Failed writes must preserve device input and permit recovery.
- Undo must preserve copied values and must not overwrite a later operation.

## Evidence and decisions

Chromium starts. The API and both app servers are listening on 4000, 2022, and 1315.
Implementation decisions and command results will be recorded in `verification-report.md`.
