# Workout activity logging verification

Tasks 1 through 10 and both review rounds are implemented. Review round 2 below has the latest results. Earlier results remain recorded for comparison.

## Initial Task 10 commands and results

Commands run from the repository root unless the directory column says `backend/`. Repeated identical commands are listed once. Logs are in `/tmp/easy-activity-logging-run/`.

| Directory | Command | Result |
| --- | --- | --- |
| `backend/` | `rtk proxy env MIX_ENV=test mix ecto.migrations` | Exit 0. Socket and database access restored. |
| Root | `rtk just gen-api` | Exit 0 before every backend precommit and during the final drift check. Both retained app schemas generated. |
| `backend/` | `rtk mix precommit` | Final exit 0. 802 tests, 0 failures. Compile, format, architecture checks, Credo, and generated-route check pass. |
| Root | `rtk pnpm -C frontend lint:ci` | Exit 0. Biome and design lint pass. |
| Root | `rtk pnpm -C frontend/packages/workouts check` | Exit 0. 28 behavior tests pass. |
| Root | `rtk pnpm -C frontend/apps/coachapp build` | Exit 0. Typecheck, model checks, and Vite build pass. |
| Root | `rtk pnpm -C frontend/apps/clientapp build` | Exit 0. Typecheck, model checks, and Vite build pass. |
| `backend/` | `rtk mix typed_routes.gen --check` | Exit 0. No drift across 178 typed routes. |
| Root | `rtk pnpm -C frontend/apps/coachapp test:exercises` | Exit 0 at 375px and 1280px. Three consecutive Task 7 runs, plus the final Task 10 run, pass. |
| Root | `rtk pnpm -C frontend/apps/coachapp test:workout` | Exit 0 at 375px and 1280px. Three consecutive Task 7 runs, plus the final Task 10 run, pass. |
| Root | `rtk pnpm -C frontend/apps/coachapp test:workout-session` | Exit 0 at 375px and 1280px. Three consecutive runs after the focus fix, plus the final Task 10 run, pass. |
| Root | `rtk pnpm -C frontend/apps/clientapp test:today` | Exit 0 at 375px. Three consecutive runs after the final client focus fix, plus the final Task 10 run, pass. |
| Root | `rtk pnpm -C frontend/apps/clientapp test:nutrition` | Exit 0 at 375px. Four existing nutrition flow groups pass in Tasks 8 and 10. |
| Root | `rtk pnpm -C frontend/apps/coachapp test:visual-hierarchy` | Exit 0. Twelve screen and viewport combinations pass. |
| `backend/` | `rtk mix ecto.migrate` | Exit 0. Migrations already up. No guard failure. Migrations 001 through 004 were applied during this implementation. |
| `backend/` | `rtk mix run -e 'IO.puts(Easy.Repo.config()[:database])'` | Exit 0. Confirms `easy_dev_refactoring`. |
| Root | `rtk git diff --check` | Exit 0. |

The final five browser runs are recorded in `task10-browser-results.json`. Each command exits 0. The coach session flow also checks the server count of 22, explicit Load more, an older active session outside the first page, recorder notices in both apps, and keyboard focus after slot saves.

The Today browser flow deliberately commits a set on the server and loses its response. It reloads the app, retries the exact request UUID and body, and confirms that only one set exists. It then checks per-side swaps, Done versus Skipped versus unrecorded slots, optional feedback, reported overall results, reopening, and the Hard label on Today.

Vite reports the existing large-chunk warning. Both builds exit 0. Browser checks do not establish physical-device or native behavior.

## Earlier checks and resolved failures

| Task | Verification | Result |
| --- | --- | --- |
| 1 | Focused workout tests, precommit, and both scratch scenario scripts | 47 focused tests pass. Precommit has 667 tests and no failures. Scratch recording has 22 passes, and measurements has 17 passes. |
| 2 | Exercise tests, compile with warnings as errors, format check, and migration fixture 01 | Initial exercise tests fail before implementation. Final exercise tests pass. Two old workout controller failures are resolved by Task 3, under the plan's explicit exception. |
| 3 | Workout context and schema suites, controller and layout checks, migration fixture 02, seed, gen-api, precommit | 106 focused tests pass. Final precommit has 737 tests, 0 failures, and 28 temporary skips for the retiring writer. A schema clock call moved into the context. Task 4 removes these skips. |
| 4 | Recording and measurement suites, database constraints, fixture 03, unknown-recorder fixture, gen-api, precommit | 45 focused tests pass. Precommit has 757 tests and no failures. The negative fixture fails exactly at the recorder guard, as intended. |
| 5 | Writer, real concurrency, HTTP, retained nutrition, and typed transport checks | RED before the writer. Final combined checks have 78 tests and no failures. Precommit has 802 tests and no failures. Set replay validates slot and measurement changesets separately. |
| 6 | Shared package behavior checks, TypeScript, pnpm install, and lint | Initial missing-source and flatMap type failures resolved. Final 28 tests, typecheck, and lint pass. The lockfile adds only workspace links. |
| 7 | Coach build, model checks, lint, and both browser suites | Initial old-field build errors resolved. Browser failures exposed the Muscles accessible name and two test synchronization issues. Final repeated runs pass. |
| 8 | Today model checks, client build, lint, Today and nutrition browsers | RED for missing command helpers before implementation. Final checks pass. The added recovery test needed to wait for the error and enabled Retry button. |
| 9 | Coach recording model checks, both builds, lint, hierarchy, and browsers | RED for missing Start session. Initial full flow passes. Screenshot review finds lost slot focus during saves. Both apps retain controls and restore slot focus. Final repeated runs pass. |

Before socket access was restored, the migration check stopped on TCP permission errors and precommit reported generated schema drift. The resumed run completes both checks. No data was changed to bypass a guard.

## Migration fixtures

Run each fixture with `.scratch/workout/migration-check/run.sh <fixture> <previous_version> <tested_version> [fail]`. The script loads the fixture at the previous version and migrates only to the tested version, so later migrations such as the `0500` legacy drop cannot change the result. It then runs the check SQL. With `fail`, the migration itself must stop. The script recreates and drops `easy_test` each time.

Rerun on 2026-10-20, after the legacy drop:

| Command | Result |
| --- | --- |
| `run.sh 01 20261013000000 20261020000100` | PASS |
| `run.sh 01-invalid-media 20261013000000 20261020000100 fail` | stopped: `invalid media URLs: 10000000-…000a` |
| `run.sh 02 20261020000100 20261020000200` | PASS |
| `run.sh 03 20261020000200 20261020000300` | PASS |
| `run.sh 03-unknown-recorder 20261020000200 20261020000300 fail` | stopped: `unresolved workout log recorders: 30000000-…00ff` |
| `run.sh 03-mixed-sides 20261020000200 20261020000300 fail` | stopped: `mixing sided and unsided sets` |
| `run.sh 03-mixed-entry-sides 20261020000200 20261020000300 fail` | stopped: `inconsistent side modes` |

| Fixture | Previous version | Evidence |
| --- | --- | --- |
| `01` | `20261013000000` | Metric order and labels, equipment text, external media, and retained columns. Passed twice. |
| `02` | `20261020000100` | Embedded groups, side mode, nested rest, video attachment, membership, and retained legacy tables. |
| `03` | `20261020000200` | Recorder mapping, sets and swaps, units, saved values, timestamps, feedback, and the new hierarchy. |

The separate `03-unknown-recorder.sql` fixture uses the same setup through the fixture load. Its migration exits 1 with `unresolved workout log recorders` and synthetic log id `30000000-0000-0000-0000-0000000000ff`. The final database drop exits 0. This is a negative test, not an unresolved dev-data blocker.

Dev migrations 001 and 002 ran before the required workout seed. Migrations 003 and 004 ran before browser work. Both dev migration runs exit 0.

## Review Focus coverage

| Review Focus | Tests and observed behavior |
| --- | --- |
| Past prescriptions without a log | `backend/test/easy/workouts_test.exs`: `editing after an unlogged past occurrence keeps the old content for that date`. Workout browser checks past-content preservation. |
| Coach edits while a client starts logging | `backend/test/easy/workouts_test.exs`: `an edit after a log references the workout copies it`. `backend/test/easy/workout_logs_concurrency_test.exs`: `a coach edit racing a client start never changes content the log references`. Real separate database connections race through a start barrier. |
| Skipped is different from missing | `backend/test/easy/workout_logs_test.exs`: `skipped and missing sets stay distinct through finish and reopen`. Client HTTP test: `completed skipped and absent slots stay distinct through finish and reopen for both viewers`. Today and coach session browsers check all three states. |
| Side-specific swap | `backend/test/easy/workout_logs_test.exs`: `a side-specific swap keeps left on the original and right on the replacement`. HTTP test: `a side-specific replacement preserves original work and shared slot identity`. Database test: `a prescribed slot is unique across replacement activities`. Today browser preserves the original exercise's rows after the swap. |
| Cross-tenant denial | Exercise tests cover media, archive, restore, reads, and updates. Workout context tests deny foreign actors. Client HTTP test `every recording route denies another tenant or another client` and coach HTTP test `every coach route denies another tenant and a coach without client access` exercise all recording routes. |

## Screenshots reviewed

Screenshots under app `artifacts/` directories are ignored outputs. The browser commands recreate them.

| Directory | Screenshots | Review |
| --- | --- | --- |
| `frontend/apps/coachapp/tests/exercises/artifacts/` | `exercise-editor-1280.png`; worker also reviewed `exercise-editor-375.png` and `restored-library-375.png` | Ordered labelled metrics, optional fields, media caption, mobile stacking, archive, and restore. |
| `frontend/apps/coachapp/tests/workout-week/artifacts/` | `builder-superset-375.png` | Each side control and tag, per-round targets, None rest, and mobile fit. |
| `frontend/apps/clientapp/tests/today/artifacts/` | `workout-completed.png`, `workout-finish-optional.png`, `workout-retry-recovered.png` | Preserved original results, distinct slot outcomes, optional feedback, retry recovery, and mobile fit. |
| `frontend/apps/coachapp/tests/workout-session/artifacts/` | `coach-active-1280.png`, `coach-active-375.png`, `client-recorded-session-375.png`, `coach-completed-recent-1280.png` | Desktop slot rows, mobile stacking, recorder notice, distinct outcomes, and completed history. Fresh captures follow the focus fix. |
| `/tmp/coachapp-hierarchy/after/` | `training-1280.png`, `exercise-375.png` | Rendered heading hierarchy and mobile field layout. The suite measures all 12 combinations. |

## Legacy data removed

The user approved the removal on 2026-10-20. Migration `20261020000500_drop_legacy_workout_data.exs` drops these columns:

| Table | Columns |
| --- | --- |
| `exercises` | `count_label`, `grade_scale`, `unilateral`, `media` |
| `workouts` | `video` |
| `workout_logs` | `difficulty`, `pain_note`, `swaps` |
| `exercise_sets` | `exercise_snapshot` |

It also drops the tables `legacy_exercise_groups` and `legacy_workout_entries`. A dump of the dev database taken just before the drop is in the supervising session's scratchpad (`easy_dev_before_legacy_drop.dump`). Backend precommit passed with the migration: 808 tests, 0 failures. The dev database migrated with exit 0.

The statistics `exercise_sets.speed_m_s`, `power_w`, `cadence_rpm`, `heart_rate_bpm`, and `grade` remain readable by design. New writes use the explicit measurement fields.

## Implementation details and scope

Migration `20261020000400_workout_replacement_receipts.exs` stores replacement request receipts. An untouched activity retains its existing id when replaced. A receipt retains the new request UUID so retries can recognize that operation without reversing a later selection. This implements the fixed replay and activity-reuse decisions.

Typed routes declare the HTTP 200 replay response for create routes whose first response is HTTP 201. Transport tests verify both success statuses.

The mismatch warning appears when completed detail exceeds the reported overall value. Incomplete detail does not warn. A reported 5000 m with one 1000 m interval remains 5000 m, with no derived total.

No required implementation step is skipped. Task 2 precommit uses the plan's Task 3 exception. Task 6 app builds are deferred to Tasks 7 and 8, then pass. Task 10 replaces staged-set comparison with an unchanged-HEAD check, as instructed by the user. `CONTEXT.md` stays unchanged because no term changes meaning. Native checks and the plan's excluded features are outside this task.

## Additional verification commands

The following focused backend commands ran during implementation. Final results are green, except the deliberately failing migration guard and the recorded RED runs.

```sh
rtk mix test test/easy/workouts_test.exs test/easy/workout_logs_test.exs
rtk mix test test/easy/exercises_test.exs
rtk mix compile --warnings-as-errors
rtk mix format --check-formatted
rtk mix test test/easy/exercises_test.exs test/easy_web/controllers/workouts_test.exs test/easy/context_layout_test.exs
rtk mix test test/easy/workouts_test.exs test/easy/workout_schema_test.exs
rtk mix test test/easy/workouts test/easy/workout_logging_schema_test.exs
rtk mix test test/easy/workout_logs_test.exs test/easy/workout_logs_concurrency_test.exs
rtk mix credo --strict lib/easy_web/types/client_logging.ex lib/easy/workouts/workout_log.ex lib/easy_web/controllers/clients/workout_log_controller.ex lib/easy_web/controllers/coaches/client_workout_log_controller.ex
rtk mix credo --strict test/easy_web/controllers/clients/logging_test.exs test/easy_web/controllers/coaches/client_workout_logs_test.exs
rtk mix run priv/repo/dev_workout_week.exs --reset
rtk mix run ../frontend/apps/clientapp/tests/today/fixtures.exs
rtk mix format ../frontend/apps/clientapp/tests/today/fixtures.exs
```

The scratch scripts ran from the root and pass, but app readiness uses the app tests above:

```sh
rtk proxy elixir -pa 'backend/_build/dev/lib/*/ebin' .scratch/workout/recording_test.exs
rtk proxy elixir -pa 'backend/_build/dev/lib/*/ebin' .scratch/workout/measurements_test.exs
```

These focused frontend checks also pass:

```sh
rtk pnpm -C frontend install
rtk pnpm -C frontend exec tsc -p packages/workouts/tsconfig.json
rtk pnpm -C frontend/packages/workouts exec tsc -p tsconfig.json
rtk pnpm -C frontend/apps/coachapp exec tsc --noEmit -p tsconfig.app.json
rtk pnpm -C frontend/apps/coachapp typecheck
rtk pnpm -C frontend/apps/clientapp exec tsc --noEmit -p tsconfig.app.json
rtk pnpm -C frontend/apps/clientapp exec node --experimental-strip-types tests/today/model.test.ts
rtk proxy node frontend/scripts/run-checks.mjs frontend/apps/coachapp/tests/workout-builder frontend/apps/coachapp/tests/workout-week-model
rtk proxy node frontend/scripts/run-checks.mjs frontend/apps/coachapp/tests/workout-session
rtk proxy node --check frontend/apps/coachapp/tests/workout-week/workout-week.browser.mjs
```

Scoped Biome commands also pass. Repeated identical checks are listed once. Initial import-order errors and temporary type errors were fixed before the final checks.

```sh
rtk pnpm -C frontend exec biome check --write packages/workouts apps/coachapp/package.json apps/clientapp/package.json
rtk pnpm -C frontend exec biome check --write packages/workouts
rtk pnpm -C frontend exec biome check --write apps/coachapp/src/exercises apps/coachapp/tests/exercises/exercises.browser.mjs
rtk pnpm -C frontend exec biome check --write apps/coachapp/src/workout-builder/model.ts apps/coachapp/src/workout-builder/save-queue.ts apps/coachapp/src/workout-builder/cards-builder.tsx apps/coachapp/src/workout-builder/parts.tsx apps/coachapp/src/workout-builder/workout-builder.tsx apps/coachapp/src/workouts/workouts.tsx apps/coachapp/tests/workout-builder/model.test.ts apps/coachapp/tests/workout-week-model/model.test.ts apps/coachapp/tests/workout-week/workout-week.browser.mjs
rtk pnpm -C frontend exec biome check apps/coachapp/tests/workout-week/workout-week.browser.mjs
rtk pnpm -C frontend exec biome check apps/coachapp/src/workout-builder/cards-builder.tsx
rtk pnpm -C frontend exec biome check --write apps/clientapp/src/api/workout-logs.ts apps/clientapp/src/api/exercises.ts apps/clientapp/src/today/model.ts apps/clientapp/src/today/workout.tsx apps/clientapp/src/today/workout-logger.tsx apps/clientapp/tests/today/model.test.ts
rtk pnpm -C frontend exec biome check --write apps/clientapp/src/today/today.tsx
rtk pnpm -C frontend exec biome check --write apps/clientapp/src/today/workout.tsx apps/clientapp/src/today/workout-logger.tsx
rtk pnpm -C frontend exec biome check --write apps/clientapp/src/today/workout-logger.tsx
rtk pnpm -C frontend exec biome check --write apps/clientapp/tests/today/today.browser.mjs apps/clientapp/tests/today/nutrition.browser.mjs
rtk pnpm -C frontend exec biome check --write apps/clientapp/tests/today/today.browser.mjs
rtk pnpm -C frontend exec biome check --write apps/coachapp/src/api/workout-logs.ts apps/coachapp/src/api/keys.ts apps/coachapp/tests/visual-hierarchy/hierarchy.browser.mjs
rtk pnpm -C frontend exec biome check --write apps/coachapp/src/router.tsx apps/coachapp/src/routes.ts
rtk pnpm -C frontend exec biome check --write apps/coachapp/src/workout-session/workout-session.tsx apps/coachapp/src/workout-session/model.ts apps/coachapp/src/workout-week/workout-week.tsx apps/coachapp/tests/workout-session/model.test.ts
rtk pnpm -C frontend exec biome check apps/coachapp/src/workout-session/workout-session.tsx
rtk pnpm -C frontend exec biome check --write apps/coachapp/tests/workout-session/workout-session.browser.mjs
```

Final global lint and both builds cover the complete tree.

Scoped whitespace checks ran with `rtk proxy git diff --check --` for the shared package, both app manifests, the client recording files, and the client focus fix. Each exits 0.

## Review round 1

All 13 items in `review-fixes-1.md` were checked against current source before changes. Backend verification has 808 tests and no failures. Shared package verification has 41 tests and no failures. All final application checks pass.

### Fixes and their tests

| Item | Fix | Verification |
| --- | --- | --- |
| 1 | Migration 0300 assigns an occurrence number to each unlinked slot and includes it in the activity grouping and set reassignment. Duplicate slots become separate added activities. | `03.sql` and `03-check.sql` preserve both plank sets ending `023` and `024`, with round 1 and null side, in two activities. Positive fixture passes. |
| 2 | Migration 0100 trims copied count labels, muscle elements, and joined equipment text. Blank labels and equipment become null. Original legacy columns remain. Invalid media URLs stop conversion with exercise ids. | Fixture 01 checks padded values and a blank label. `01-invalid-media.sql` stops with exercise `10000000-0000-0000-0000-00000000000a`. |
| 3 | `@easy/workouts/session` owns generic drafts and queues, measurement bodies derived from the literal field table, slot views, target copying, effort labels, input keys, target/rest helpers, command builders, and the shared recording workflow. Each app keeps its JSX and a thin API/persistence hook. No `as MeasurementBody` casts remain. | Thirteen session tests moved into the package. They cover typed bodies, lazy commands, original slot ownership, generic metadata, restored retries, rejected writes, failed storage, and already-removed sets. All 41 package tests, both app model suites, builds, and browser flows pass. |
| 4 | Coach start storage clears a request after a server 4xx and retains it after an unknown outcome. The week shows Open for an occurrence with a non-discarded log. A scoped scheduled-date query finds the occurrence independently of the Recent sessions page and actual log date. | Coach browser injects a 422, confirms key removal, and confirms that the next successful start uses a fresh id. It opens the completed occurrence. Backend scheduled-date tests use an actual date that differs. |
| 5 | An unreadable coach start key is removed and replaced. Coach recording uses `ui/use-durable-draft` with an API storage adapter. Invalid drafts are removed, an empty draft opens, and saved server results remain visible. Existing account/client/log storage keys are retained. | Coach browser starts with invalid JSON, then corrupts the recording draft after a saved set. Reload still shows the saved values and confirms removal of the bad key. |
| 6 | `WorkoutLog.put_recorder_name/1` serves both ClientDays and WorkoutLogs. Unknown recorder values, missing associations, and unreadable names return Unknown recorder. | `recorder names use one total resolver for valid and unresolved recorders` in `workout_logging_schema_test.exs`. |
| 7 | Both actors' list queries support validated state and scheduled-date filters before count and pagination. Active lookup requests state=active and limit=1. A failed lookup shows an error and can be retried through the start action. | Scoped context tests cover counts, invalid filters, both actors, and tenant denial. Both HTTP suites cover filters. Coach browser injects an active-lookup failure, retries through Start, and confirms each active request uses limit 1. The older active session is found beyond the first Recent page. |
| 8 | Recent sessions uses `workoutLogKeys.infinite(clientId, filters)`. Flat active lookup uses the real state filter under `list`. | Coach browser loads 20 then 22 sessions while the separate active lookup remains correct. Both app typechecks and builds pass. |
| 9 | Finish on a completed session compares normalized supplied feedback with stored values. Equal feedback returns the unchanged session. Different feedback still fails. | `finish retries compare normalized feedback without changing the completed session` tests both actors and unchanged timestamps. |
| 10 | Workout registers the existing database check `workouts_name_check`. | `database name checks return a name changeset error` reaches PostgreSQL with a blank name and receives a changeset error instead of an exception. |
| 11 | Migration 0200 uses snapshot unilateral first, then the current exercise flag, then false. | Fixture 02 has snapshot=true and current exercise=false and still converts to per_side. |
| 12 | Client workout types are exported by `api/workouts.ts`. The week owns occursOn, including its current-column check. The screen calls that one predicate. | Both builds pass. Week model checks date bounds and offers recording only in today's column. Original workout week browser passes. |
| 13 | Added former-coach, extra-round padding, per-side, mixed-side abort, and active swap-only data. | Positive 03 checks the former coach, rounds 4 and 5 with padded targets, left/right results, and the untouched active replacement. Two separate mixed-side negative fixtures raise their named guards and exact ids. |

### Verification commands and results

Commands run from the root unless `backend/` is shown. Repeated identical commands are listed once. Logs and the command result manifests are in `/tmp/easy-activity-review1/`.

| Directory | Command | Result |
| --- | --- | --- |
| Root | `rtk just gen-api` | Exit 0. Ran before backend precommit. Both retained schemas regenerate. |
| `backend/` | `rtk mix precommit` | Exit 0. 808 tests, 0 failures. All included compile, format, Credo, architecture, and route checks pass. |
| `backend/` | `rtk mix test test/easy/workout_logs_test.exs test/easy/workout_logging_schema_test.exs test/easy/workout_schema_test.exs test/easy_web/controllers/coaches/client_workout_logs_test.exs test/easy_web/controllers/clients/logging_test.exs` | Initial RED has 99 tests and 6 failures. First fix run has one invalid-enum-cast failure. The final run has 99 tests and no failures. |
| Root | `rtk pnpm -C frontend lint:ci` | Exit 0 after the final edits. |
| Root | `rtk pnpm -C frontend/packages/workouts check` | Exit 0. 41 tests pass, including 13 session cases. |
| Root | `rtk pnpm -C frontend/apps/coachapp build` | Exit 0. |
| Root | `rtk pnpm -C frontend/apps/clientapp build` | Exit 0. |
| `backend/` | `rtk mix typed_routes.gen --check` | Exit 0. No drift across 178 typed routes. |
| Root | `rtk pnpm -C frontend/apps/coachapp test:exercises` | Exit 0 at 375px and 1280px. |
| Root | `rtk pnpm -C frontend/apps/coachapp test:workout` | Exit 0 at 375px and 1280px. |
| Root | `rtk pnpm -C frontend/apps/coachapp test:workout-session` | Final exit 0 at 375px and 1280px, including recovery, Open, focus, and pagination checks. |
| Root | `rtk pnpm -C frontend/apps/clientapp test:today` | Exit 0 at 375px, including a lost response followed by reload and retry. |
| Root | `rtk pnpm -C frontend/apps/clientapp test:nutrition` | Exit 0 at 375px. Four flow groups pass. |
| Root | `rtk pnpm -C frontend/apps/coachapp test:visual-hierarchy` | Exit 0. Twelve screen and viewport combinations pass. |
| `backend/` | `rtk mix ecto.migrate` | Exit 0. Source dev database already has migrations 0100 through 0400. No source schema changes. |
| Root | `rtk proxy node frontend/scripts/run-checks.mjs frontend/apps/coachapp/tests/workout-week-model` | Exit 0. |
| Root | `rtk proxy python3 /tmp/easy-activity-review1/migration_checks.py` | All 45 commands have their expected result. Three positive fixtures and four negative fixtures pass. |

Focused package/app TypeScript checks, scoped Biome, source/fixture parsing, and scoped whitespace checks also pass. The backend worker ran compile with warnings as errors and scoped Credo before the full gate. No backend check is treated as a substitute for precommit.

One coach browser run stopped at 20 rows after the keyboard Load more action. The test now waits for an enabled, focused control and verifies the offset=20 response before checking all 22 rows. Screenshot review also caught a capture during account loading after navigation. The test now waits for the week, Open action, and saved session before capture. Neither fix uses forced interaction or a fixed delay.

### Migration checks

The seven-command positive fixture procedure above ran for 01, 02, and 03 with previous versions `20261013000000`, `20261020000100`, and `20261020000200`. All 21 commands exit 0.

Each negative fixture ran drop, create, migrate to its previous version, fixture load, the expected migration failure, and final drop. All setup and cleanup commands exit 0. Each expected failure has the named guard and exact synthetic ids. This accounts for the other 24 commands in `migration-results.json`.

| Negative fixture | Expected guard | Expected ids |
| --- | --- | --- |
| `01-invalid-media.sql` | exercises with invalid media URLs | Exercise `10000000-0000-0000-0000-00000000000a` |
| `03-unknown-recorder.sql` | unresolved workout log recorders | Log `30000000-0000-0000-0000-0000000000ff` |
| `03-mixed-sides.sql` | legacy activity groups mixing sided and unsided sets | Log ending `010`, entry ending `00b`, exercise ending `006`, with prefix `30000000-0000-0000-0000-` |
| `03-mixed-entry-sides.sql` | legacy prescribed entries with inconsistent side modes | Log ending `010` and entry ending `00b`, with the same prefix |

These are controlled negative fixtures, not unresolved source-dev guard failures.

### Copy of the dev database

`rtk proxy createdb -T easy_dev_refactoring easy_dev_migration_check` exits 0. No dump fallback was needed. The copy is retained for review. Source `easy_dev_refactoring` was not dropped or structurally altered.

The clone migration command, run from `backend/`, exits 0 and reports migrations already up:

```sh
rtk mix run --no-start -e 'config=Application.get_env(:easy, Easy.Repo) |> Keyword.put(:database, "easy_dev_migration_check"); Application.put_env(:easy, Easy.Repo, config); Mix.Task.run("ecto.migrate")'
```

A read-only `rtk proxy psql easy_dev_migration_check -v ON_ERROR_STOP=1 -c` check confirms versions `20261020000100` through `20261020000400`. The snapshot has 39 workouts, 220 sessions, 20 activities, and 50 sets.

A pre-0100 dev snapshot is not available in the repository. The conversion migrations declare irreversible down functions. Rolling the already-converted clone back would require reconstructing old shapes and guessing information that no longer has a safe inverse. That rollback was not attempted.

Therefore, the changed 0100 trimming/media conversion, 0200 snapshot side-mode conversion, and 0300 duplicate-slot conversion are verified on the legacy fixtures only. The existing dev copy is verified as a current-schema copy with no pending migration. It does not prove that the changed conversions reran on original dev data.

### Screenshots reviewed in this round

Fresh coach `coach-completed-recent-1280.png` shows Open for the completed occurrence and the completed Sam session. `client-recorded-session-375.png` shows Alex's recorder notice and Done, Skipped, and Unrecorded slots. Both are in `frontend/apps/coachapp/tests/workout-session/artifacts/`. The six browser suites also recreate the retained exercise, builder, client Today, nutrition, and hierarchy evidence.

No required review fix is skipped. The pre-0100 clone replay limitation is recorded above as required by the review instructions. Physical-device/native checks remain outside this task.

## Review round 2

All 15 items in `review-fixes-2.md` are implemented. Each defect was checked in source before changes. The backend has 810 tests and no failures. The workout package has 43 tests and the shared utility package has two durable-draft tests. All listed gates pass.

### Fixes and tests

| Item | Fix | Test or check |
| --- | --- | --- |
| 1 | Both app UI adapters use one generic durable-draft implementation in `@easy/utils`. Bad JSON and invalid draft shapes remove the stored key, fall back to initial state, and leave saved server records visible. | Two utility tests cover valid, corrupt, and unreadable drafts plus cleanup/read failures. Client Today injects bad JSON and an invalid shape after a saved set, reloads, checks the original values and removed keys, and continues recording. Coach corruption recovery also passes. |
| 2 | Migration 0100 trims muscle names, groups by the trimmed value, and orders by the first original position. | Fixture 01 includes Quads/space-Quads and Glutes/padded-Glutes. Its exact resulting order is Quadriceps, Glutes, Quads. Runner 01 passes. |
| 3 | One generic React bridge handles owner/current checks, controller refs, initial-state reset, draft refs, write ordering, UUID generation, and UI state. The pure workout controller owns command/retry and rejection logic. App hooks only compose transport, durable state, initial state, and app-specific acknowledgement behavior. | Both builds and package checks pass. Client lost-response/reload retry and both apps' recording flows pass. React stays outside the pure workout package; the bridge is in `@easy/utils`. |
| 4 | SessionOperation is the one operation union. The fake operation generic, mapper option, and parser predicate are removed. Both API adapters execute SessionOperation directly. | Package parser, queue, and command tests pass. Both app typechecks/builds pass. Source check finds no RecordingOperation union or operation mapper. |
| 5 | `selectedActivity`, `slotModel`, `planDraft`, `hasRecordedWork`, and `roundsFor` live in the workout package. Both screens render their results. | New package cases cover original/replacement slot ownership, selected-activity headings, saved rounds, blank counts, target padding, and rest. Browser slot states and per-side swaps pass. |
| 6 | Both useRecording hooks return only execute and reload. Coach start calls execute with a start operation. | Both builds and coach/client browser recording commands pass. Source check confirms the unused mutation wrappers are gone. |
| 7 | Dead model re-exports are removed. Helpers import directly from the package. The coach model keeps only its used storage key. Client workout API exports only its used Workout and WorkoutExercise types. | Both app builds, focused model scripts, and scoped unused-import checks pass. |
| 8 | Start storage holds only the UUID string. The request body comes from arguments. A storage removal failure in the 4xx path cannot replace the API error. | Coach browser checks raw stored text equals the request UUID, injects a 422, then repeats with removeItem forced to throw. The original API error remains visible and a later valid start succeeds. |
| 9 | Removing a set already absent from an authorized activity returns the current session. Malformed IDs, unavailable activities, and other live sets keep their denial behavior. The frontend absent-set shortcut is removed. | Backend test `client and coach set removal retries keep the authorized activity and session unchanged` covers both actors. Package case `removing an absent set delegates idempotence to the server` confirms retry executes the server command. |
| 10 | Completing an already-completed activity dry-runs normalized measurements. Equal values replay unchanged; different or invalid values fail. Equal replay also works after the parent session finishes. | Backend test `client and coach activity completion retries compare canonical measurements` covers both actors, decimal/unit normalization, differing inputs, and the finished parent. |
| 11 | run.sh requires expected error text in fail mode, captures migration output, checks the fixed string, and drops easy_test from its EXIT trap. | All seven checks below pass with database removal verified immediately after each. A wrong expected text produces exit 1 and still removes the database. |
| 12 | occursOn has only schedule and date arguments. The screen checks the current column at the call site. | Week model date/mask checks and the repeating-week browser pass. The coach browser selects the fixture's current weekday on mobile. |
| 13 | Coach RecordingView receives one command-controller object. Impossible nullable-log guards, client preview leftovers, redundant fragments, and pass-through command props are removed. | Coach build and both viewport flows pass. Discard copy is exactly: Discarded sessions stay in the client's history. |
| 14 | inputLabel reads units from the metric catalogue. Only Reps with no unit and Duration with s or m:ss are special cases. | Package label cases cover custom labels and canonical units. Both app slot inputs pass browser checks. |
| 15 | The infinite session key accepts WorkoutLogFilters instead of object. | Coach typecheck/build and 20-to-22 session pagination pass alongside the separate active query. |

### Commands and results

Commands run from the root unless the directory column says `backend/`. Repeated identical commands are listed once. Logs and manifests are in `/tmp/easy-activity-review2/`.

| Directory | Command | Result |
| --- | --- | --- |
| Root | `rtk just gen-api` | Exit 0, before backend precommit. |
| `backend/` | `rtk mix precommit` | Exit 0. 810 tests, 0 failures. All included compile, format, Credo, architecture, and route checks pass. |
| `backend/` | `rtk mix test test/easy/workout_logs_test.exs` | RED: 30 tests and 2 expected failures. Final GREEN: 30 tests and no failures. |
| Root | `rtk pnpm -C frontend lint:ci` | Exit 0 on the final tree. |
| Root | `rtk pnpm -C frontend/packages/workouts check` | Exit 0. 43 tests pass. |
| Root | `rtk pnpm -C frontend/packages/utils check` | Exit 0. Two durable-draft tests pass. Added because both apps now use that implementation. |
| Root | `rtk pnpm -C frontend/apps/coachapp build` | Exit 0. Typecheck, model checks, and Vite build pass. |
| Root | `rtk pnpm -C frontend/apps/clientapp build` | Exit 0. Typecheck, model checks, and Vite build pass. |
| `backend/` | `rtk mix typed_routes.gen --check` | Exit 0. No drift across 178 routes. |
| Root | `rtk pnpm -C frontend/apps/coachapp test:visual-hierarchy` | Final exit 0. Twelve screen and viewport combinations pass. |
| Root | `rtk pnpm -C frontend/apps/coachapp test:exercises` | Exit 0 at 375px and 1280px. |
| Root | `rtk pnpm -C frontend/apps/coachapp test:workout` | Exit 0 at 375px and 1280px. |
| Root | `rtk pnpm -C frontend/apps/coachapp test:workout-session` | Final exit 0 at 375px and 1280px, including UUID storage, cleanup failure, recovery, focus, and pagination. |
| Root | `rtk pnpm -C frontend/apps/clientapp test:today` | Exit 0 at 375px, including corrupt-draft recovery and lost-response retry. |
| Root | `rtk pnpm -C frontend/apps/clientapp test:nutrition` | Exit 0. Extra regression check because the shared draft hook also serves nutrition. |
| Root | `rtk proxy node frontend/scripts/run-checks.mjs frontend/apps/coachapp/tests/workout-week-model` | Exit 0. |
| `backend/` | `rtk mix ecto.migrations` | Read-only check exits 0. Approved migration 0500 is already up in dev. No dev migration was run in this round. |

Scoped Biome, whitespace, source and shell syntax checks pass. The workers also ran package/utility and both app TypeScript checks. Final full lint and builds cover the integrated changes.

The existing preview servers were reused. The first visual run saw Vite's cached old package exports. Disk exports were correct and fresh builds passed. Updating only the two Vite configuration file timestamps restarted their watchers and cleared the cache. Their contents did not change. A second visual run exposed asynchronous nutrient loading; the test now waits for the saved Energy value before checking its typography. The coach session test also assumed Monday on mobile; it now selects the fixture's current weekday. No forced interaction, weakened assertion, or fixed delay was added.

Fresh client `workout-corrupt-draft-recovered.png` and coach `coach-active-1280.png` were generated and visually reviewed. The client screenshot shows saved values after corrupt-draft recovery; the coach screenshot shows aligned recorded and skipped slots. Browser evidence remains separate from physical-device/native verification.

### Migration runner results

Every command below exits 0. The table includes the required fifth argument for each negative case. A catalog query confirms that easy_test is absent immediately after every runner exits.

| Command | Expected migration error | Result |
| --- | --- | --- |
| `rtk proxy bash .scratch/workout/migration-check/run.sh 01 20261013000000 20261020000100 pass ''` | None | Fixture assertions pass; database removed. |
| `rtk proxy bash .scratch/workout/migration-check/run.sh 02 20261020000100 20261020000200 pass ''` | None | Fixture assertions pass; database removed. |
| `rtk proxy bash .scratch/workout/migration-check/run.sh 03 20261020000200 20261020000300 pass ''` | None | Fixture assertions pass; database removed. |
| `rtk proxy bash .scratch/workout/migration-check/run.sh 01-invalid-media 20261013000000 20261020000100 fail 'invalid media URLs'` | invalid media URLs | Required text found; database removed. |
| `rtk proxy bash .scratch/workout/migration-check/run.sh 03-unknown-recorder 20261020000200 20261020000300 fail 'unresolved workout log recorders'` | unresolved workout log recorders | Required text found; database removed. |
| `rtk proxy bash .scratch/workout/migration-check/run.sh 03-mixed-sides 20261020000200 20261020000300 fail 'mixing sided and unsided sets'` | mixing sided and unsided sets | Required text found; database removed. |
| `rtk proxy bash .scratch/workout/migration-check/run.sh 03-mixed-entry-sides 20261020000200 20261020000300 fail 'inconsistent side modes'` | inconsistent side modes | Required text found; database removed. |

The same invalid-media command with fifth argument `UNEXPECTED-GUARD-TEXT-CHECK` deliberately exits 1. Its output rejects the missing expected text, and the database is still removed. This proves that an arbitrary migration failure no longer counts as a pass. The later precommit run recreates the normal current test schema; it does not retain fixture data.

### Approved legacy drop and final scope

`20261020000500_drop_legacy_workout_data.exs` is unchanged byte for byte. Its SHA-256 matches the checksum captured before this round. It was not edited, replaced, or restored. The dev status check already lists it as up, and backend test setup uses it as written.

No listed fix or gate is skipped. Native/physical-device checks and another dev-copy replay were not requested in this round. The historical migration checks intentionally stop before the approved legacy drop.

## Final git check

`rtk git rev-parse --short=8 HEAD` exits 0 and returns `4e238f91`. HEAD is unchanged. No commit, explicit stage, unstage, stash, reset, restore, path checkout, or push command ran.

`rtk git diff --check HEAD` exits 0. The protected-path diff is empty. Prototype imports and route declarations match HEAD. The generated schemas changed only in the two retained apps. The final staged-set comparison is omitted under the user's correction.

The following is the final `rtk git status --short` output. Existing staged entries are expected. Every change remains uncommitted.

```text
A  .scratch/workout/activity-logging-plan.md
A  .scratch/workout/codex-prompt.md
M  .scratch/workout/concept.md
M  .scratch/workout/implementation-plan.md
AM .scratch/workout/migration-check/01-check.sql
A  .scratch/workout/migration-check/01-invalid-media.sql
AM .scratch/workout/migration-check/01.sql
A  .scratch/workout/migration-check/02-check.sql
A  .scratch/workout/migration-check/02.sql
A  .scratch/workout/migration-check/03-check.sql
A  .scratch/workout/migration-check/03-mixed-entry-sides.sql
A  .scratch/workout/migration-check/03-mixed-sides.sql
A  .scratch/workout/migration-check/03-unknown-recorder.sql
A  .scratch/workout/migration-check/03.sql
AM .scratch/workout/migration-check/run.sh
A  .scratch/workout/review-fixes-1.md
AM .scratch/workout/verification-report-activity-logging.md
M  backend/lib/easy/attachments/attachment.ex
M  backend/lib/easy/client_days.ex
A  backend/lib/easy/workout_content.ex
MM backend/lib/easy/workout_logs.ex
A  backend/lib/easy/workout_measurements.ex
A  backend/lib/easy/workout_recording.ex
A  backend/lib/easy/workout_target_rules.ex
D  backend/lib/easy/workout_targets.ex
M  backend/lib/easy/workout_undo.ex
M  backend/lib/easy/workouts.ex
A  backend/lib/easy/workouts/count_target.ex
M  backend/lib/easy/workouts/exercise.ex
M  backend/lib/easy/workouts/exercise_group.ex
A  backend/lib/easy/workouts/exercise_log.ex
A  backend/lib/easy/workouts/exercise_media.ex
A  backend/lib/easy/workouts/exercise_metric.ex
M  backend/lib/easy/workouts/exercise_set.ex
A  backend/lib/easy/workouts/numeric_target.ex
A  backend/lib/easy/workouts/rest_target.ex
A  backend/lib/easy/workouts/result_target.ex
A  backend/lib/easy/workouts/result_units.ex
A  backend/lib/easy/workouts/round_targets.ex
A  backend/lib/easy/workouts/text_target.ex
M  backend/lib/easy/workouts/workout.ex
M  backend/lib/easy/workouts/workout_exercise.ex
A  backend/lib/easy/workouts/workout_exercise_reference.ex
M  backend/lib/easy/workouts/workout_log.ex
A  backend/lib/easy/workouts/workout_replacement_receipt.ex
M  backend/lib/easy/workouts/workout_schedule.ex
M  backend/lib/easy_web/controllers/clients/workout_log_controller.ex
A  backend/lib/easy_web/controllers/coaches/client_workout_log_controller.ex
M  backend/lib/easy_web/controllers/coaches/exercise_controller.ex
M  backend/lib/easy_web/router.ex
M  backend/lib/easy_web/typed_route.ex
M  backend/lib/easy_web/types/client_logging.ex
M  backend/lib/easy_web/types/workouts.ex
M  backend/lib/mix/tasks/typed_routes.gen.ex
M  backend/priv/repo/dev_workout_week.exs
AM backend/priv/repo/migrations/20261020000100_exercise_definitions.exs
A  backend/priv/repo/migrations/20261020000200_workout_content_embeds.exs
A  backend/priv/repo/migrations/20261020000300_activity_logging.exs
A  backend/priv/repo/migrations/20261020000400_workout_replacement_receipts.exs
A  backend/priv/repo/migrations/20261020000500_drop_legacy_workout_data.exs
A  backend/test/easy/exercises_test.exs
A  backend/test/easy/workout_logging_schema_test.exs
A  backend/test/easy/workout_logs_concurrency_test.exs
MM backend/test/easy/workout_logs_test.exs
M  backend/test/easy/workout_schema_test.exs
A  backend/test/easy/workouts/measurements_test.exs
A  backend/test/easy/workouts/recording_test.exs
M  backend/test/easy/workouts_test.exs
M  backend/test/easy_web/controllers/clients/logging_test.exs
A  backend/test/easy_web/controllers/clients/nutrition_logging_test.exs
A  backend/test/easy_web/controllers/coaches/client_workout_logs_test.exs
M  backend/test/easy_web/controllers/workouts_test.exs
M  backend/test/easy_web/typed_route_test.exs
M  backend/test/support/factory.ex
M  backend/test/support/typed_route_test_controller.ex
M  frontend/apps/clientapp/package.json
 M frontend/apps/clientapp/src/api/drafts.ts
M  frontend/apps/clientapp/src/api/exercises.ts
M  frontend/apps/clientapp/src/api/schema.ts
MM frontend/apps/clientapp/src/api/workout-logs.ts
AM frontend/apps/clientapp/src/api/workouts.ts
MM frontend/apps/clientapp/src/today/model.ts
MM frontend/apps/clientapp/src/today/today.tsx
AM frontend/apps/clientapp/src/today/use-workout-recording.ts
MM frontend/apps/clientapp/src/today/workout-logger.tsx
MM frontend/apps/clientapp/src/today/workout.tsx
 M frontend/apps/clientapp/src/ui/use-durable-draft.ts
M  frontend/apps/clientapp/tests/today/fixtures.exs
M  frontend/apps/clientapp/tests/today/model.test.ts
A  frontend/apps/clientapp/tests/today/nutrition.browser.mjs
MM frontend/apps/clientapp/tests/today/today.browser.mjs
M  frontend/apps/coachapp/package.json
A  frontend/apps/coachapp/src/api/drafts.ts
M  frontend/apps/coachapp/src/api/exercises.ts
MM frontend/apps/coachapp/src/api/keys.ts
M  frontend/apps/coachapp/src/api/schema.ts
AM frontend/apps/coachapp/src/api/workout-logs.ts
M  frontend/apps/coachapp/src/api/workouts.ts
M  frontend/apps/coachapp/src/exercises/exercise-editor.tsx
M  frontend/apps/coachapp/src/exercises/exercise.ts
M  frontend/apps/coachapp/src/exercises/exercises.tsx
M  frontend/apps/coachapp/src/router.tsx
M  frontend/apps/coachapp/src/routes.ts
AM frontend/apps/coachapp/src/ui/use-durable-draft.ts
M  frontend/apps/coachapp/src/workout-builder/cards-builder.tsx
M  frontend/apps/coachapp/src/workout-builder/model.ts
M  frontend/apps/coachapp/src/workout-builder/parts.tsx
M  frontend/apps/coachapp/src/workout-builder/save-queue.ts
M  frontend/apps/coachapp/src/workout-builder/workout-builder.tsx
AM frontend/apps/coachapp/src/workout-session/model.ts
AM frontend/apps/coachapp/src/workout-session/use-session-recording.ts
AM frontend/apps/coachapp/src/workout-session/workout-session.tsx
MM frontend/apps/coachapp/src/workout-week/model.ts
MM frontend/apps/coachapp/src/workout-week/workout-week.tsx
M  frontend/apps/coachapp/src/workouts/workouts.tsx
A  frontend/apps/coachapp/tests/exercises/artifacts/archived-picker-1280.png
A  frontend/apps/coachapp/tests/exercises/artifacts/archived-picker-375.png
A  frontend/apps/coachapp/tests/exercises/artifacts/exercise-editor-1280.png
A  frontend/apps/coachapp/tests/exercises/artifacts/exercise-editor-375.png
A  frontend/apps/coachapp/tests/exercises/artifacts/restored-library-1280.png
A  frontend/apps/coachapp/tests/exercises/artifacts/restored-library-375.png
AM frontend/apps/coachapp/tests/exercises/artifacts/results.json
A  frontend/apps/coachapp/tests/exercises/exercises.browser.mjs
MM frontend/apps/coachapp/tests/visual-hierarchy/hierarchy.browser.mjs
M  frontend/apps/coachapp/tests/workout-builder/model.test.ts
AM frontend/apps/coachapp/tests/workout-session/artifacts/client-recorded-session-1280.png
AM frontend/apps/coachapp/tests/workout-session/artifacts/client-recorded-session-375.png
AM frontend/apps/coachapp/tests/workout-session/artifacts/client-same-session-1280.png
AM frontend/apps/coachapp/tests/workout-session/artifacts/client-same-session-375.png
AM frontend/apps/coachapp/tests/workout-session/artifacts/coach-active-1280.png
AM frontend/apps/coachapp/tests/workout-session/artifacts/coach-active-375.png
AM frontend/apps/coachapp/tests/workout-session/artifacts/coach-completed-recent-1280.png
AM frontend/apps/coachapp/tests/workout-session/artifacts/coach-completed-recent-375.png
AM frontend/apps/coachapp/tests/workout-session/artifacts/failure-client.png
AM frontend/apps/coachapp/tests/workout-session/artifacts/recent-paginated-1280.png
AM frontend/apps/coachapp/tests/workout-session/artifacts/recent-paginated-375.png
AM frontend/apps/coachapp/tests/workout-session/artifacts/results.json
AM frontend/apps/coachapp/tests/workout-session/model.test.ts
AM frontend/apps/coachapp/tests/workout-session/workout-session.browser.mjs
MM frontend/apps/coachapp/tests/workout-week-model/model.test.ts
M  frontend/apps/coachapp/tests/workout-week/workout-week.browser.mjs
 M frontend/packages/utils/package.json
A  frontend/packages/workouts/package.json
A  frontend/packages/workouts/src/index.ts
A  frontend/packages/workouts/src/measurements.ts
A  frontend/packages/workouts/src/metrics.ts
A  frontend/packages/workouts/src/recording.ts
AM frontend/packages/workouts/src/session.ts
A  frontend/packages/workouts/src/targets.ts
A  frontend/packages/workouts/tests/measurements.test.ts
A  frontend/packages/workouts/tests/metrics.test.ts
A  frontend/packages/workouts/tests/recording.test.ts
AM frontend/packages/workouts/tests/session.test.ts
A  frontend/packages/workouts/tests/targets.test.ts
A  frontend/packages/workouts/tsconfig.json
M  frontend/pnpm-lock.yaml
?? .scratch/workout/review-fixes-2.md
?? .scratch/workout/ux-review-prompt.md
?? frontend/packages/utils/src/use-draft-controller.ts
?? frontend/packages/utils/src/use-durable-draft.ts
?? frontend/packages/utils/tests/
```
