# Workout Activity Logging Implementation Plan

Status: ready-for-agent

> **For agentic workers:** Implement this plan task by task, in order. Steps use checkbox (`- [ ]`) syntax for tracking. **Do not stage, commit, push, reset, or stash anything.** Leave every change uncommitted in the working tree for the user's review. Some files are already staged by the user (the design artifacts and `skills-lock.json`). Leave the index exactly as you found it.

**Goal:** Deliver a complete workout flow on the agreed W1–W83 design. A coach builds an exercise library and a client's repeating workout week. The client sees the assigned workouts. The client, or an authorized coach, records the session as `WorkoutLog -> ExerciseLog -> ExerciseSet`. Existing stored data is preserved.

**Architecture:** Move the schema review draft (`.scratch/workout/models.ex`) into `backend/lib/easy/` as one module per file. Then add data-preserving migrations, authorized context writers that lock the parent session row, and typed routes. The backend moves first (Tasks 2–5), and each task ends with `mix precommit` passing. The frontend follows (Tasks 6–9), and each app task ends with lint, build, and a browser flow. See "Task order" for why the backend comes first.

**Tech Stack:** Elixir/Phoenix/Ecto with PostgreSQL. Typed routes go through `EasyWeb.Types`. Frontend is React with TanStack Query 5 and openapi-fetch, checked with Biome/oxlint and Playwright scripts (`*.browser.mjs`).

**Spec (read before each task):**
- `docs/adr/0015-exercise-log-and-set-details.md`: the recording hierarchy, measurements, and lifecycle.
- `docs/adr/0003` through `0014`: read by topic when a task names one.
- `.scratch/workout/concept.md`: W1–W83, U1–U14, and V1–V7. Later rows supersede earlier ones.
- `.scratch/workout/models.ex`: the source of every schema and changeset to port.
- `.scratch/workout/recording_test.exs` and `.scratch/workout/measurements_test.exs`: the draft scenario checks to port into ExUnit.
- `CONTEXT.md`: product vocabulary.

This plan supersedes `.scratch/workout/implementation-plan.md` (W1–W37, completed). Do not edit that file's history. Task 1 adds a pointer to this plan.

## Global Constraints

- Prefix every shell command with `rtk`. Use `rtk proxy <cmd>` when you need the raw output.
- Read `AGENTS.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`, and the app's own `AGENTS.md` before editing in that tree.
- **Backend production quality:** before backend work, read the skills `~/.agents/skills/production-quality/SKILL.md`, `~/.agents/skills/enforcing-precommit/SKILL.md`, and `~/.agents/skills/elixir-patterns/SKILL.md`, and follow them. Every public function has an `@spec`. Do not add `@doc` or `@moduledoc`. Expected failures return `{:error, atom | changeset}`. Do not use bang `Repo` calls in `lib/`. A backend task is finished only when `cd backend && rtk mix precommit` exits 0; partial checks do not count. The one exception is Task 2, which Task 3's precommit certifies (see "Task order").
- **Frontend quality:** follow `frontend/AGENTS.md`.
  - Types come only from the generated `src/api/schema.ts`, re-exported from the owning `src/api/*.ts` file.
  - Query keys come from `src/api/keys.ts`. Invalidation goes inside mutation hooks.
  - Respect the `exactOptionalPropertyTypes` setting. Do not use `any` or non-null assertions.
  - Keep the feature, `ui`, and `api` directions as `frontend/AGENTS.md` defines them.
  - A frontend task is finished only when `rtk pnpm -C frontend lint:ci` passes and `rtk pnpm -C frontend/apps/<app> build` passes for each touched app.
- Regenerate the API client with `rtk just gen-api` from the repo root. Never hand-edit `schema.ts`.
- Each backend file defines one top-level module. Folders under `lib/easy/<context>/` contain only `use Ecto.Schema` modules (enforced by `test/easy/context_layout_test.exs`). Non-schema modules live at `lib/easy/workout_*.ex`.
- Every tenant query is scoped by `ctx.business_id`. Trusted ids use `put_change`, never `cast`. Every public read and write has a cross-tenant denial test.
- Do not modify `frontend/apps/clientapp-v2`, `skills-lock.json`, or the prototype folders and routes:
  - `coachapp/src/workout-builder-prototype/`
  - `coachapp/src/client-week-prototype/`
  - `coachapp/src/nutrition-week-prototype/`
  - `clientapp/src/today-prototype/`
- Do not delete stored historical values. Columns this plan stops using are kept in the database and listed in Task 10. Removing them needs the user's approval.
- Programs, nutrition, ExerciseMax/percent-of-1RM targets, ScheduleSkip, one-off dates, aggregate reports, and attachment uploads with new access rules are out of scope.
- Copy wording comes from the concept and ADRs: session effort labels Very easy, Easy, Moderate, Hard, Very hard, and U8's "Any", "Client chooses", and "None".
- A test that runs the scratch drafts does not prove the app works. Report the app ready only from the app's own tests and browser runs.

## Decisions made by this plan

These resolve gaps between the draft and the running code. Do not reopen them while implementing. If a decision proves impossible, stop and report it.

1. **Legacy recording paths are converted, not carried.** The migration in Task 4 converts every old direct set and swap into ExerciseLog/ExerciseSet rows. The ported code therefore leaves out `ExerciseSwap`, `WorkoutLog.swaps`, `WorkoutLog.sets`, `swaps_changeset/4`, and the "reject mixed old/new" checks in `Recording.require_session/2` and `validate_session/1`. The old columns stay in the database, unmapped (Task 10).
2. **Set slot uniqueness is enforced in the database.** A trigger copies `workout_log_id`, `workout_exercise_id`, and `exercise_id` from the parent ExerciseLog onto each ExerciseSet. The application never writes these copied columns. Two partial unique indexes then enforce the draft's `slot_key`:
   - linked activities: `(workout_log_id, workout_exercise_id, round, COALESCE(side,''))`
   - added activities: `(exercise_log_id, round, COALESCE(side,''))`

   The session lock prevents races. The indexes are the backstop.
3. **Retries use client-generated ids.** Create commands (start log, start activity, replace activity, record set) take a client-generated UUID `id`. A repeated request with the same id and the same content returns the current session (200). The same id with different content returns `:conflict`. A repeated state command whose target state is already reached returns the current session unchanged. Examples: completing a completed activity, finishing a completed log, reopening an active activity.
4. **Attachments are external links in this plan.**
   - Exercise media items and the workout video are stored as `Attachment{source: :external_link, external_url}` with `client_id` null.
   - The existing coach upload (`/v1/coach/library-media/uploads`) already returns public URLs, so the builder and exercise editor keep their upload buttons and store the returned URL as an external link.
   - New access rules for private uploads stay deferred (ADR 0003).
5. **Old blank rest becomes `none`.** The running builder showed a null or missing rest as "None" ("No rest"), so migrated rest becomes `%{mode: :none}`. A metric missing from the old targets becomes nil, which is not prescribed and shows as "Any". Old target objects (`exact`, `range`, `max`) keep their mode and numbers.
6. **Old recorder UUIDs are mapped exactly or the migration stops.**
   - If the user is the log's client, the log becomes `recorded_by = client`.
   - If the user is an active or former coach of the same business, it becomes `recorded_by = coach` with that `coach_id`.
   - Any other row raises in the migration, with the ids listed. No guessing.
7. **Old feedback is retained without conversion.** The `difficulty` and `pain_note` columns stay as unmapped legacy columns. New `effort` (1–5) starts null, and `pain` keeps its value. The old rule that a completed log requires difficulty is dropped.
8. **`at_utc` is dropped.** W69 is the user's decision, and the value equals the creation time in `inserted_at`.
9. **Workout content history uses the existing rule (W37–W39).**
   - A workout is frozen when any of its schedules has a fact date (`Timing.last_fact/2` is non-nil) or any WorkoutLog references it.
   - Editing a frozen workout creates a copy with fresh embedded ids, moves the future schedule rows to the copy (`move_schedule`), and archives the original.
   - A save whose normalized content equals the stored content changes nothing: no update, no copy, same ids and timestamps.
10. **Discard replaces delete for logs.** The client "delete log" endpoint and its undo token are removed. Discard keeps the hierarchy (W65). The UI asks for confirmation before discarding.
11. **Either party can write an active log.** The client and any coach who can access the client can edit the active log. `recorded_by` and `coach_id` stay fixed. When the viewer is not the recorder, the UI shows "<name> is recording this session" (W17). Starting a log is allowed for both, on any occurrence (W17), including occurrences led by a coach.
12. **Shared pure frontend logic goes in a new package `@easy/workouts`** (`frontend/packages/workouts`). It holds the metric catalogue and labels, target/rest formatting, measurement field tables, and the recording-view model (rows and slots derived from a log and its workout). Both apps import it. It declares minimal structural input interfaces and does not import app schema types. UI stays in each app.
13. **The four-file no-op patch is kept as the regression baseline.** Task 1 certifies it. Task 3 replaces its implementation (`unchanged_workout?/2` and helpers in `workouts.ex`) with the JSONB comparison and ports its tests unchanged in meaning.

## Review Focus

1. **Past prescriptions with no log.** A coach edits a workout whose Tuesday occurrence was yesterday, with no log. Tuesday must still show the old targets, and today onward the new ones. Test: `test "editing after an unlogged past occurrence keeps the old content for that date"` in Task 3.
2. **Coach edits while the client logs.** A client starts a log at the same moment as a coach's edit. The log must point at content that never changes afterwards. Tests: `test "an edit after a log references the workout copies it"` in Task 3, and the concurrency test `"a coach edit racing a client start never changes content the log references"` in Task 5.
3. **A skipped set is not a missing set.** A finished workout with one recorded set, one skipped set, and one absent set must render three distinct states for both the client and the coach. The test lives in Task 5 (API JSON), and the browser assertions are in Tasks 8 and 9.
4. **Side-specific swap.** Round 1 left on squat, then a swap, then round 1 right on goblet squat. Both rows survive. Recording round 1 left again on the replacement is rejected. Tests are in Task 5, with the DB index test in Task 4.
5. **Cross-tenant denial on every new route.** A coach from business B, or client B, gets 404 on business A's log, activity, set, exercise media, archive, and restore. Tests are in Tasks 2, 3, and 5.

---

## File map

Backend, new or replaced. Each is one module. Port the module from `models.ex` unless the task says otherwise.

| File | Module | Responsibility |
|---|---|---|
| `lib/easy/attachments/attachment.ex` (modify) | `Easy.Attachments.Attachment` | add `source`, `external_url`, `external_link_changeset/3` |
| `lib/easy/workouts/exercise_metric.ex` | `Easy.Workouts.ExerciseMetric` | embed `{key, label}` |
| `lib/easy/workouts/exercise.ex` (replace) | `Easy.Workouts.Exercise` | draft schema plus the existing `visible/2`, `for_business/2`, new `selectable/1` |
| `lib/easy/workouts/exercise_media.ex` | `Easy.Workouts.ExerciseMedia` | gallery row |
| `lib/easy/workout_target_rules.ex` | `Easy.Workouts.TargetRules` | shared target validation |
| `lib/easy/workouts/count_target.ex`, `numeric_target.ex`, `text_target.ex`, `result_target.ex`, `rest_target.ex`, `round_targets.ex` | same names | typed targets |
| `lib/easy/workouts/workout_exercise.ex` (replace) | `Easy.Workouts.WorkoutExercise` | embed, plus virtual `exercise` field |
| `lib/easy/workouts/exercise_group.ex` (replace) | `Easy.Workouts.ExerciseGroup` | embed |
| `lib/easy/workouts/workout.ex` (replace) | `Easy.Workouts.Workout` | JSONB groups, `video_id` |
| `lib/easy/workouts/workout_exercise_reference.ex` | `Easy.Workouts.WorkoutExerciseReference` | membership table `workout_exercises` |
| `lib/easy/workouts/workout_schedule.ex` (replace) | `Easy.Workouts.WorkoutSchedule` | draft changesets plus the virtual `claimed_today` and `for_client/3` |
| `lib/easy/workouts/workout_log.ex` (replace) | `Easy.Workouts.WorkoutLog` | without swaps/sets (Decision 1) |
| `lib/easy/workouts/result_units.ex` | `Easy.Workouts.ResultUnits` | embed |
| `lib/easy/workout_measurements.ex` | `Easy.Workouts.ResultMeasurements` | shared measurement validation |
| `lib/easy/workouts/exercise_log.ex` | `Easy.Workouts.ExerciseLog` | activity row |
| `lib/easy/workouts/exercise_set.ex` (replace) | `Easy.Workouts.ExerciseSet` | detail row, legacy read fields |
| `lib/easy/workout_recording.ex` | `Easy.Workouts.Recording` | pure commands (Decision 1 edits) |
| `lib/easy/workout_content.ex` | `Easy.Workouts.Content` | normalized comparison, copy-with-fresh-ids, membership sync, exercise loading |
| `lib/easy/workouts.ex` (modify) | `Easy.Workouts` | exercises, workouts, schedules |
| `lib/easy/workout_undo.ex` (modify) | `Easy.Workouts.Undo` | snapshot the new tables |
| `lib/easy/workout_logs.ex` (replace) | `Easy.WorkoutLogs` | authorized recording writer for client and coach |
| `lib/easy/workout_targets.ex` (delete) | | replaced by typed targets |
| `lib/easy/client_days.ex` (modify) | | preload the new hierarchy |
| `lib/easy_web/types/workouts.ex`, `client_logging.ex` (modify) | | wire types |
| `lib/easy_web/controllers/coaches/exercise_controller.ex`, `workout_controller.ex`, `client_workout_controller.ex`, `workout_week_controller.ex` (modify) | | |
| `lib/easy_web/controllers/coaches/client_workout_log_controller.ex` (new) | `EasyWeb.Coaches.ClientWorkoutLogController` | coach recording |
| `lib/easy_web/controllers/clients/workout_log_controller.ex` (modify) | | client recording |
| `priv/repo/migrations/20261020000100_exercise_definitions.exs` | | Task 2 |
| `priv/repo/migrations/20261020000200_workout_content_embeds.exs` | | Task 3 |
| `priv/repo/migrations/20261020000300_activity_logging.exs` | | Task 4 |
| `.scratch/workout/migration-check/` | | legacy fixtures and SQL assertions, run in Tasks 2, 3, and 4 |

Frontend:

| Path | Responsibility |
|---|---|
| `frontend/packages/workouts/` (new) | `@easy/workouts`: `metrics.ts`, `targets.ts`, `measurements.ts`, `recording.ts`, plus `tests/*.test.ts` |
| `coachapp/src/api/exercises.ts`, `workouts.ts`, `workout-week.ts`, `workout-logs.ts` (new), `keys.ts` | hooks |
| `coachapp/src/exercises/*` | library and editor (metrics with labels, instructions, equipment text, media list, archive/restore) |
| `coachapp/src/workout-builder/*` | builder on the new target shape, plus side mode |
| `coachapp/src/workout-week/*` | week, plus recent sessions and "Start session" |
| `coachapp/src/workout-session/` (new) | coach recording and viewing screen |
| `clientapp/src/api/workout-logs.ts`, `client-days.ts`, `exercises.ts` | hooks |
| `clientapp/src/today/*` | Today plus the logger on commands |

---

### Task 1: Certify the baseline and mark the old plan superseded

**Files:**
- Modify: `.scratch/workout/implementation-plan.md` (add one line at the top)
- Verify only: the unstaged patch in `backend/lib/easy/workouts.ex`, `backend/lib/easy/workouts/workout.ex`, `backend/test/easy/workouts_test.exs`, `backend/test/easy/workout_logs_test.exs`

- [ ] **Step 1: Record git state.** Run `rtk git status --short` and `rtk proxy git diff --cached --stat`. Save the output in your notes; you will compare against it at the end. Expected: the four unstaged backend files, plus the staged design files and `skills-lock.json`.
- [ ] **Step 2: Run the focused tests.** Run `cd backend && rtk mix test test/easy/workouts_test.exs test/easy/workout_logs_test.exs`. Expected: 47 tests, 0 failures.
- [ ] **Step 3: Run precommit.** Run `cd backend && rtk mix precommit`. Fix only format or Credo findings inside the four patch files. Expected: exit 0. If an unrelated failure exists, record it as the baseline and continue. Do not fix unrelated code.
- [ ] **Step 4: Run the draft checks.** From the repo root, run:
  - `rtk proxy elixir -pa 'backend/_build/dev/lib/*/ebin' .scratch/workout/recording_test.exs`
  - `rtk proxy elixir -pa 'backend/_build/dev/lib/*/ebin' .scratch/workout/measurements_test.exs`

  Expected: 22 and 17 tests, 0 failures. These are the behavior references for Tasks 2 and 7.
- [ ] **Step 5: Mark the old plan.** Insert this line as the first line of `.scratch/workout/implementation-plan.md`: `> Superseded on 2026-10-19 by [activity-logging-plan.md](activity-logging-plan.md). Kept as the record of the W1–W37 build.`

---

## Task order

The backend moves first, in four tasks (2–5). Tasks 3, 4, and 5 each end with `rtk mix precommit` passing. Task 2 ends with its focused tests instead: the old workout writer and its database checks still read the old exercise shape (string metrics, snapshots) until Task 3 replaces them. Do not write bridge code for that gap.

- Task 2 changes the Exercise shape, which breaks the old client log writer, because its exercise snapshots and its trigger read the old fields. Do not write bridge code for it.
- In Task 2, tag every test in `test/easy/workout_logs_test.exs` and `test/easy_web/controllers/clients/logging_test.exs` with `@moduletag :skip` and the reason `"replaced by Task 5"`.
- Task 4 deletes the old writer and its routes. Task 5 adds the new writer and new tests.
- The apps do not build against the API while the backend changes. That is expected. Run the coachapp checks from Task 7 on, and the clientapp checks from Task 8 on. Task 6 (the package) has its own checks.

Migration check procedure (used by Tasks 2, 3, and 4): run `.scratch/workout/migration-check/run.sh <fixture> <previous_version> <tested_version> [fail]`. The script migrates only to the version under test, so later migrations cannot change the result. Fixture SQL inserts legacy rows directly, with explicit ids and timestamps, into the schema at `<previous_version>`. Check SQL is one `DO $$ BEGIN ... END $$;` block that uses `RAISE EXCEPTION` for each failed expectation. With `fail`, the migration itself must stop.

---

### Task 2: Backend: exercise definitions

**Spec:** ADR 0003 (gallery), 0005 (metric labels), 0006 (equipment text), 0007 (archiving); W44–W46.

**Files:**
- Create: `backend/priv/repo/migrations/20261020000100_exercise_definitions.exs`
- Create: `lib/easy/workouts/exercise_metric.ex`, `lib/easy/workouts/exercise_media.ex` (ported from the draft)
- Replace: `lib/easy/workouts/exercise.ex` (the draft schema and changesets, plus the existing `visible/2` and `for_business/2`, plus `selectable/1`)
- Modify: `lib/easy/attachments/attachment.ex`, `lib/easy/workouts.ex` (exercise functions), `lib/easy/client_days.ex` (`list_client_exercises` pipes `Exercise.selectable/1`), `lib/easy_web/types/workouts.ex` (`Exercise*`), `lib/easy_web/controllers/coaches/exercise_controller.ex`, `lib/easy_web/router.ex`, `test/support/factory.ex` (the `exercise_factory` and `exercise_attrs_factory` use the new shape: metrics `[%ExerciseMetric{key: :reps}, %ExerciseMetric{key: :weight}]`, `equipment: nil`)
- Tests: `test/easy/exercises_test.exs` (new), the exercise cases in `test/easy_web/controllers/workouts_test.exs`
- Migration check: `.scratch/workout/migration-check/01.sql` and `01-check.sql`

**Interfaces (produced):**
- `Easy.Workouts.list_exercises(ctx, opts)`. `opts` gains `archived: boolean`, default `false`: `false` returns selectable exercises only, `true` returns archived ones only. The `equipment` filter becomes `ILIKE` on the text.
- `Easy.Workouts.create_exercise(ctx, attrs)` and `update_exercise(ctx, id, attrs)`. `attrs` may contain `media: [%{id?, url, caption?}]`, an ordered full replacement. In one transaction the writer:
  - keeps the ids of rows whose `id` is supplied
  - inserts an external-link Attachment plus an ExerciseMedia row for each new URL
  - deletes omitted ExerciseMedia rows, but never deletes attachments
  - sets `position` to the list index, after `SET CONSTRAINTS exercise_media_position DEFERRED`
- `copy_exercise/2` copies metrics, instructions, equipment, and muscles. It creates new gallery rows that point at the same attachments.
- `Easy.Workouts.archive_exercise(ctx, id)` and `restore_exercise(ctx, id)`, each `:: {:ok, Exercise.t} | {:error, :not_found}`. Only business-owned exercises qualify; built-ins return `:not_found`.
- `Easy.Workouts.Exercise.selectable(query \\ __MODULE__) :: Ecto.Query.t` filters on `is_nil(archived_at)`. The function that loads exercises for existing workouts or logs must not use it.
- `Easy.Attachments.Attachment.external_link_changeset(business_id, url, uploader :: {:coach, coach_id} | :system) :: Ecto.Changeset.t`. It generates an id, sets `source: :external_link`, and validates an http(s) URL with a host. The existing upload `insert_changeset/6` is unchanged except for an explicit `source: :upload`.
- Wire type `EasyWeb.Types.Exercise.t`:
  - `id`, `name`, `instructions | nil`, `kind`, `goals`, `places`
  - `metrics: [%{key, label | nil}]`
  - `equipment: String.t | nil`, `muscles`
  - `media: [%{id, url, caption | nil}]`, in position order
  - `archived_at: DateTime | nil`, `is_builtin`

  `create` requires `name` and `kind`, with every other field optional. `update` has every field optional. Both take `metrics: [%{key, label?}]` and `media: [%{id?, url, caption?}]`. Removed from the wire: `count_label`, `grade_scale`, `unilateral`, and the string `media`.
- New routes: `POST /v1/coach/exercises/:id/archive` and `POST /v1/coach/exercises/:id/restore`, each returning `{200, data(Exercise.t)}`. The list query gains `archived`.

**Migration contents** (one `up`; `down` raises, like the sibling migrations):
1. Attachments:
   - Add `source text NOT NULL DEFAULT 'upload'` and `external_url text`.
   - Read `20260922000200_create_media.exs`, then relax NOT NULL only on the columns an external link leaves empty: `client_id`, `storage_key`, `content_type`, `byte_size`, `uploaded_by_id`.
   - Add `attachments_source_valid CHECK((source='upload' AND storage_key IS NOT NULL AND content_type IS NOT NULL AND byte_size>0 AND external_url IS NULL) OR (source='external_link' AND storage_key IS NULL AND external_url ~ '^https?://[^/[:space:]]+'))`.
2. Exercises:
   - Add `instructions text` and `archived_at timestamptz`.
   - Guard first: `RAISE EXCEPTION` listing ids if any exercise selects `grade`. ADR 0005 forbids a silent drop; the user decides.
   - Convert `metrics text[]` to a jsonb array of `{key, label}` objects, in the same order. The label comes from `count_label`:
     - `reps` gets `count_label`
     - `successes` gets `count_label || ' · Successes'`, and `attempts` gets `count_label || ' · Attempts'` (this keeps `labelOf` in `coachapp/src/exercises/exercise.ts`)
     - every other key, and every key when `count_label` is null, gets a null label
   - Convert `equipment text[]` to `text` with `NULLIF(array_to_string(equipment, ', '), '')`.
   - Replace `exercises_taxonomy` and `exercises_tags` with the draft's named checks: `exercises_name_valid`, `exercises_instructions_valid`, `exercises_kind_valid`, `exercises_goals_valid`, `exercises_places_valid`, `exercises_metrics_valid` (jsonb array of objects, catalogue keys without `grade`, unique keys, label null or nonblank), `exercises_equipment_valid`, `exercises_muscles_valid`. Empty goals, places, and metrics are allowed (W46).
   - Keep `count_label`, `grade_scale`, `unilateral`, and `media` as unmapped columns. Task 3 reads `unilateral` in its migration.
3. `exercise_media` table:
   - Columns: `id uuid PK`, `business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE`, `exercise_id uuid NOT NULL REFERENCES exercises ON DELETE CASCADE`, `attachment_id uuid NOT NULL REFERENCES attachments ON DELETE RESTRICT`, `caption text CHECK(caption IS NULL OR btrim(caption)<>'')`, `position int NOT NULL CHECK(position>=0)`, timestamps.
   - Constraint `exercise_media_position UNIQUE(exercise_id, position) DEFERRABLE INITIALLY IMMEDIATE`, and an index on `(business_id, exercise_id)`.
   - The ExerciseMedia schema gains `belongs_to :business` (the draft omits it; tenant scoping needs it).
4. Data: for each exercise with a non-null `media`:
   - if it is a built-in exercise (`business_id` null), raise with its id
   - otherwise insert an attachment (`source 'external_link'`, `external_url = media`, `business_id` = the exercise's business, `uploaded_by_type 'system'`) and an `exercise_media` row at position 0

Steps:
- [ ] **Step 1: Write the migration fixtures (`01.sql`).**
  - a business
  - exercise A: metrics `{reps,successes,attempts}`, `count_label 'Moves'`, equipment `{Barbell,Bench}`, `media 'https://example.com/a.mp4'`
  - exercise B: metrics `{distance,duration}`, equipment `{}`, `media` null
- [ ] **Step 2: Write the assertions (`01-check.sql`).**
  - A's metrics equal `[{"key":"reps","label":"Moves"},{"key":"successes","label":"Moves · Successes"},{"key":"attempts","label":"Moves · Attempts"}]`
  - A's equipment is `'Barbell, Bench'`, and `count_label` is still `'Moves'`
  - A has exactly one `exercise_media` row, at position 0, whose attachment has `external_url 'https://example.com/a.mp4'` and `source 'external_link'`
  - B's equipment is null and its metrics are `[{"key":"distance","label":null},{"key":"duration","label":null}]`
- [ ] **Step 3: Write the failing tests** in `test/easy/exercises_test.exs`:
  - `test "only name and kind are required and omitted metrics use kind defaults"`: `%{name: "Run", kind: "activity"}` gives metrics with keys `[:distance, :duration]` and nil labels. An explicit `metrics: []` stays `[]`.
  - `test "metric labels are trimmed and blank labels become nil"`
  - `test "grade cannot be selected"`: `{:error, %Ecto.Changeset{}}`
  - `test "media reorder keeps ids and removal keeps attachments"`: create with two URLs, update with them reversed and ids supplied. The ids are kept and the positions swap. Update with `media: []`: no gallery rows remain, and there are still 2 attachments.
  - `test "archived exercises leave pickers but stay readable"`: after `archive_exercise/2`, `list_exercises(ctx, [])` excludes it, `list_exercises(ctx, archived: true)` includes it, and `get_exercise/2` still returns it. `restore_exercise/2` brings it back to the picker.
  - `test "archiving twice keeps the first timestamp"`
  - `test "archive, restore, update and media are tenant scoped"`: a coach from another business gets `{:error, :not_found}`, and so does a built-in exercise.
  - `test "the client exercise search excludes archived exercises"` (`Easy.ClientDays.list_client_exercises/2`)
- [ ] **Step 4: Run them.** Run `cd backend && rtk mix test test/easy/exercises_test.exs`. Expected: FAIL (missing modules, fields, and functions).
- [ ] **Step 5: Implement** the migration and the code above. Tag the old log test modules as described under Task order.
- [ ] **Step 6: Run the migration check** with `<prev> = 20261013000000` and `<NN> = 01`. Expected: all commands exit 0.
- [ ] **Step 7: Run the tests again.** Run `rtk mix test test/easy/exercises_test.exs`. Expected: PASS.
- [ ] **Step 8: Controller tests** in `test/easy_web/controllers/workouts_test.exs`:
  - `test "exercise JSON exposes metric entries, the media list and archive state"`
  - `test "archive and restore return 404 across tenants"`
  - `test "creating with a grade metric is rejected"` (422)
- [ ] **Step 9: Focused checks.** Run `cd backend && rtk mix compile --warnings-as-errors && rtk mix format --check-formatted && rtk mix test test/easy/exercises_test.exs test/easy_web/controllers/workouts_test.exs test/easy/context_layout_test.exs`. Expected: compile and format pass. The exercise tests pass, and the workout cases in the controller file may fail until Task 3. Precommit runs at the end of Task 3.

---

### Task 3: Backend: prescription content, history and week

**Spec:** W4–W5, W14, W30, W37–W39, W41, W47–W63; ADR 0004, 0008, 0009, 0010.

**Files:**
- Create: `backend/priv/repo/migrations/20261020000200_workout_content_embeds.exs`
- Create, ported from the draft: `lib/easy/workout_target_rules.ex` (`Easy.Workouts.TargetRules`), `lib/easy/workouts/count_target.ex`, `numeric_target.ex`, `text_target.ex`, `result_target.ex`, `rest_target.ex`, `round_targets.ex`, `workout_exercise_reference.ex`
- Create: `lib/easy/workout_content.ex` (`Easy.Workouts.Content`)
- Replace: `lib/easy/workouts/workout.ex`, `workout_exercise.ex` (add `field :exercise, :map, virtual: true`), `exercise_group.ex`, `workout_schedule.ex` (the draft, plus the existing virtual `claimed_today` and `for_client/3`)
- Modify: `lib/easy/workouts.ex`, `lib/easy/workout_undo.ex`, `lib/easy/client_days.ex` (workouts pass through `Content.load_exercises/2`)
- Delete: `lib/easy/workout_targets.ex`
- Modify: `lib/easy_web/types/workouts.ex`, `client_workout_controller.ex`, `workout_controller.ex`, `workout_week_controller.ex`, `priv/repo/dev_workout_week.exs`
- Tests: `test/easy/workouts_test.exs` (ported, including the no-op patch tests), `test/easy/workout_schema_test.exs` (rewritten for the embeds; also port the target, group, and workout cases the draft headers describe), `test/easy_web/controllers/workouts_test.exs`
- Migration check: `.scratch/workout/migration-check/02.sql` and `02-check.sql`

**Interfaces:**
- `Easy.Workouts.Content`:
  - `same?(Workout.t, Workout.t) :: boolean` compares name, description, type, `video_id`, and groups. For each group it compares name, rounds, and the ordered entries; for each entry, `exercise_id`, `side_mode`, `targets_mode`, and `targets` as dumped maps. Ids and timestamps are ignored.
  - `fresh_ids(map) :: map` takes copy input and drops every group and entry id, so the changeset generates new ones (W55).
  - `sync_references(Workout.t) :: :ok` replaces the workout's `workout_exercises` rows with the distinct `exercise_id`s in its groups. Call it in the same transaction as every content insert, update, copy, and undo restore.
  - `load_exercises([Workout.t], business_id) :: [Workout.t]` loads each entry's Exercise through the membership table, archived ones included, with media preloaded in position order. It puts the Exercise into `WorkoutExercise.exercise`.
  - `exercises_by_id(business_id, [Ecto.UUID.t]) :: %{Ecto.UUID.t => Exercise.t}` returns exercises visible to the business (`Exercise.visible/2`), archived ones included.
- Selection rule (ADR 0007): an archived exercise is accepted only when the stored workout already references it. The writer checks this before calling the changeset and returns a changeset error on `groups` otherwise.
- `Easy.Workouts` keeps every current public function name and arity. `update_workout_for_client/4` works like this (Decision 9):
  1. Lock the client row (the existing `write/3`).
  2. Load the row, its schedules, and `exercises_by_id`.
  3. Build `Workout.update_changeset(row, attrs, lookup)`. If it is invalid, return `{:error, cs}`.
  4. If `Content.same?(Ecto.Changeset.apply_changes(cs), row)`, return `{:ok, row}` with no write.
  5. If any schedule for the workout is current or future, also apply `Workout.validate_content_for_schedule/1` (ADR 0009).
  6. If the workout is frozen (`Enum.any?(schedules, &Timing.last_fact(&1, today)) or logged?(ctx, row.id)`), insert a copy from `Content.fresh_ids(Map.merge(content, attrs))`, call `move_schedule/3` for each schedule, and archive the original.
  7. Otherwise, update in place.
  8. Call `Content.sync_references/1` after each write.

  The library `update_workout/3` uses steps 3, 4, 7, and 8.
- `add_schedule_for_client/3` accepts an optional `from_date`, which must not be before the client's local today, defaulting to today (W56). It applies the scheduling content check to the chosen workout.
- `Easy.Workouts.Undo`: `@schemas` becomes `[Workout, WorkoutExerciseReference, WorkoutSchedule]`.
  - Reference rows are snapshotted, deleted when not retained, and reinserted with `on_conflict: :nothing, conflict_target: [:workout_id, :exercise_id]`.
  - `preserves_logs?/3` compares the Workout row, `groups` included, ignoring `archived_at` and `updated_at`.
  - `lock_references/2` reads exercise ids from the workouts' groups.
- Wire types:
  - `EasyWeb.Types.WorkoutRoundTargets.t` has an optional key for every catalogue metric, plus historical `grade`. Each value is `%{mode: :client_chooses | :exact | :range | :max, value?, min?, max?}`; `result` and `grade`/`tempo` use their text-or-enum `value`. It also has a required `rest: %{mode: :client_chooses | :none | :exact | :range, value_s?, min_s?, max_s?}`.
  - `EasyWeb.Types.WorkoutExercise.t` drops `rest` and gains `side_mode: :combined | :per_side`. `targets` becomes `[WorkoutRoundTargets.t]`, and `exercise` is the current `Exercise.t`. The `create` body is `id?`, `exercise_id`, `side_mode?`, `targets_mode?`, `targets?`.
  - `EasyWeb.Types.Workout.t` replaces `video` with `video: %{id, url} | nil`. `create` and `update` take `video_url?: String.t | nil`. On a new URL the writer creates an external-link Attachment; on the current URL it keeps `video_id`; on null it clears `video_id`. Each workout keeps its own attachment row.
  - `EasyWeb.Types.WorkoutSchedule.create` gains `optional(:from_date) => Date.t`.

**Migration contents:**
1. Drop the constraint triggers `workouts_content`, `exercise_groups_content`, and `workout_exercises_content`, the trigger `workout_exercises_tenant`, the check `workout_exercises_targets_valid`, the check `workouts_video`, and their functions (`workout_content_valid`, `workout_exercise_tenant`, `workout_targets_valid`, `workout_target_valid`).
2. Drop the foreign key `exercise_sets(workout_exercise_id, business_id) → workout_exercises`. Replace the body of `client_log_links_valid()`:
   - keep the `workout_logs` schedule/workout match and the nutrition branch byte-identical
   - drop the swaps loop and the whole `exercise_sets` branch
   - drop the trigger `exercise_sets_links`

   The old writer is retired (Task order), and Task 4 adds the new set triggers.
3. Rename `exercise_groups` to `legacy_exercise_groups` and `workout_exercises` to `legacy_workout_entries`. Keep the rows. They are not mapped (Task 10).
4. Workouts:
   - Add `groups jsonb NOT NULL DEFAULT '[]'` and `video_id uuid REFERENCES attachments ON DELETE RESTRICT`.
   - Fill `groups` from the legacy tables, ordered by `position, id`. Keep each group's `id`, `name`, and `rounds`, and each entry's `id`, `exercise_id`, and `targets_mode`. Set `side_mode` to `'per_side'` when `exercises.unilateral` is true for that exercise, else `'combined'` (ADR 0004).
   - Build `targets` as one object for each index `i` of the legacy `targets` array. Copy each legacy metric key and target object unchanged, and add `rest` (Decision 5):
     - a missing `legacy.rest[i]` (empty array) or a null element becomes `{"mode":"none"}`
     - `{"mode":"exact","value":v}` becomes `{"mode":"exact","value_s":v}`
     - `{"mode":"range","min":a,"max":b}` becomes `{"mode":"range","min_s":a,"max_s":b}`
   - For each non-null `video`, insert an attachment (`source 'external_link'`, `external_url = video`, the workout's `business_id`, `client_id` null, `uploaded_by_type 'system'`) and set `video_id`. Keep `video` as an unmapped column.
   - Add `workouts_content_valid CHECK(jsonb_typeof(groups)='array' AND ((type='video') = (video_id IS NOT NULL)) AND (type='prescribed' OR groups='[]'::jsonb))`.
5. Create the membership table:
   - `workout_exercises(business_id uuid NOT NULL, workout_id uuid NOT NULL, exercise_id uuid NOT NULL REFERENCES exercises ON DELETE RESTRICT, PRIMARY KEY(workout_id, exercise_id), FOREIGN KEY(workout_id, business_id) REFERENCES workouts(id, business_id) ON DELETE CASCADE)`
   - an index on `(business_id, exercise_id, workout_id)`
   - a BEFORE INSERT/UPDATE trigger `workout_exercise_references_tenant` that raises `foreign_key_violation` with constraint `workout_exercises_exercise_tenant` unless the exercise is built-in or belongs to the same business

   Fill it from the distinct legacy entries.
6. Workout schedules:
   - Add the IMMUTABLE SQL function `workout_schedule_has_weekday(from_date date, until_date date, mask int) RETURNS boolean`. It checks the days from `from_date` through `LEAST(COALESCE(until_date, from_date+6), from_date+6)` against the mask.
   - Before adding the checks below, raise if any existing row violates them.
   - Add `workout_schedules_matching_weekday CHECK(workout_schedule_has_weekday(from_date, until_date, weekdays_mask))` and `workout_schedules_meeting_url_valid CHECK(meeting_url IS NULL OR meeting_url ~ '^https?://[^/[:space:]]+')`.
7. Exercise deletion: `exercise_in_use?/2` in `workouts.ex` checks `workout_exercises` and `exercise_sets.exercise_id`. Task 4 adds `exercise_logs`.

Steps:
- [ ] **Step 1: Write the migration fixtures (`02.sql`).**
  - Exercise X has `unilateral = true`. It is the only entry in a 2-round group of a per-round workout, with entry targets `[{"reps":{"mode":"exact","value":5}},{"reps":{"mode":"range","min":3,"max":5}}]` and rest `[{"mode":"exact","value":90}, null]`.
  - A second workout is a video workout with `video 'https://example.com/v.mp4'`.
  - A legacy workout log and one `exercise_sets` row reference the entry. Fill every NOT NULL column of the 20261013000000 schema.
- [ ] **Step 2: Write the assertions (`02-check.sql`).**
  - The group and entry ids in `groups` equal the legacy ids.
  - `side_mode` is `'per_side'`.
  - `targets->0->'rest'` is `{"mode":"exact","value_s":90}` and `targets->1->'rest'` is `{"mode":"none"}`.
  - `targets->1->'reps'` is `{"mode":"range","min":3,"max":5}`.
  - The video workout's `video_id` points at an external-link attachment with that URL.
  - The membership row `(workout, X)` exists.
  - The legacy tables still hold their rows, and the set row still exists.
- [ ] **Step 3: Write the failing tests** in `test/easy/workouts_test.exs`. Keep every existing test that still describes required behavior, and update its data to the embedded shape. Add or port:
  - `test "an identical save changes nothing"` (from the uncommitted patch): ids, `updated_at`, and schedules are unchanged, whether or not the input includes ids.
  - `test "an identical save after logging starts creates no copy"` (from the patch case in `workout_logs_test.exs`). Insert the log row with `Repo.insert_all("workout_logs", ...)` using the columns at this migration, because the old log writer is retired.
  - `test "editing after an unlogged past occurrence keeps the old content for that date"`: a schedule from 7 days ago (dates derived from `Date.utc_today()`), then an edit today. `read_week_for_client(ctx, client_id, on: past_date)` returns the old content, and the current week returns the copy. The original is archived, and its schedule ends on the last fact date.
  - `test "an edit after a log references the workout copies it"`
  - `test "a future-only workout is edited in place"`
  - `test "moving an entry between groups keeps its id"` and `test "copying a workout generates fresh embedded ids"`
  - `test "membership rows follow content and block exercise deletion"`: while an exercise is used, `delete_exercise/2` returns `{:error, :in_use}`; after its last use is removed, it succeeds.
  - `test "a scheduled workout cannot lose its last group"`: `{:error, %Ecto.Changeset{}}` with an error on `groups`.
  - `test "a new archived exercise is rejected but a retained one saves"`
  - `test "per_side keeps one target entry per round"`
  - `test "a blank name returns a changeset error"` (from the patch)
  - `test "undo restores content, schedules and membership"`
  - `test "video_url creates one attachment and an unchanged url keeps it"`
  - `test "a chosen future start date is kept and a past one is rejected"`
  - Cross-tenant: every public function returns `{:error, :not_found}` for another business's client or workout.
- [ ] **Step 4: Run them.** Run `rtk mix test test/easy/workouts_test.exs test/easy/workout_schema_test.exs`. Expected: FAIL.
- [ ] **Step 5: Implement.**
- [ ] **Step 6: Run the migration check** with `<prev> = 20261020000100` and `<NN> = 02`. Expected: all commands exit 0.
- [ ] **Step 7: Run the tests again** (the Step 4 command). Expected: PASS.
- [ ] **Step 8: Controller tests** in `test/easy_web/controllers/workouts_test.exs`:
  - `test "workout JSON nests round targets with rest and side_mode"`
  - `test "video is returned as {id, url}"`
  - `test "a past-prescription edit returns the copy id"`
  - tenant 404s for every workout and schedule route
- [ ] **Step 9: Dev seed.** Update `priv/repo/dev_workout_week.exs` to the new content shape. Run it once: `cd backend && rtk mix run priv/repo/dev_workout_week.exs --reset`. Expected: exit 0.
- [ ] **Step 10: Precommit.** Run `cd backend && rtk mix precommit`. Expected: exit 0, with only the tagged old log modules skipped. This is the first precommit gate. It also certifies Task 2.

---

### Task 4: Backend: logging data model and migration

**Spec:** ADR 0011, 0012, 0014, 0015; W64–W83.

**Files:**
- Create: `backend/priv/repo/migrations/20261020000300_activity_logging.exs`
- Create, ported from the draft: `lib/easy/workouts/result_units.ex`, `lib/easy/workout_measurements.ex` (`Easy.Workouts.ResultMeasurements`), `lib/easy/workouts/exercise_log.ex`, `lib/easy/workout_recording.ex` (`Easy.Workouts.Recording`)
- Replace: `lib/easy/workouts/workout_log.ex`. Port the draft without `swaps`, `sets`, `swaps_changeset/4`, and the `ExerciseSwap` alias (Decision 1). Keep `for_client/3`. Change `include_content/2` to preload `exercise_logs` (ordered by position then id), their `sets` (ordered by round, side, then id), and `workout`.
- Replace: `lib/easy/workouts/exercise_set.ex`. Port the draft and keep the legacy read-only fields `speed_m_s`, `power_w`, `cadence_rpm`, `heart_rate_bpm`, and `grade`. Declare `workout_log_id`, `workout_exercise_id`, and `exercise_id` as plain fields (not `belongs_to`) that are never cast, because the trigger fills them (Decision 2).
- Edits in `Recording`, per Decision 1:
  - `require_session/2` drops `session.sets == [] and session.swaps == []`
  - `validate_session/1` drops the clause `(activities == [] or (get_field(changeset, :swaps) == [] and session.sets == []))`
  - `WorkoutLog.edit_changeset/5` drops the `swaps_changeset/4` step
- Delete: the old `lib/easy/workout_logs.ex`, `lib/easy_web/controllers/clients/workout_log_controller.ex`, their routes, the `WorkoutLog`, `ExerciseSet`, `WorkoutSwaps`, `SwapExercises`, `EnteredUnits`, and `LogRestore` types (keep `LogRestore` if nutrition uses it; check first), and the two tagged test modules. Task 5 recreates the writer and controllers.
- Modify: `lib/easy/client_days.ex`. It drops `workout_logs` and `active_workout` from `day/3` until Task 5 adds them back. Also update `EasyWeb.Types.ClientDay` and `exercise_in_use?/2` (add `exercise_logs`).
- Tests: `test/easy/workouts/measurements_test.exs` (port all 17 cases of `.scratch/workout/measurements_test.exs`), `test/easy/workouts/recording_test.exs` (port the 22 cases of `.scratch/workout/recording_test.exs`, with structs built in memory as in the draft; drop only the cases that assert rejection of mixed legacy rows, and list the dropped names in a comment at the top), `test/easy/workout_logging_schema_test.exs` (new, database constraints)
- Migration check: `.scratch/workout/migration-check/03.sql`, `03-check.sql`, and `03-unknown-recorder.sql`

**Migration contents:**
1. Workout logs:
   - **Recorder (Decision 6).** Find the user links first: `clients.user_id`, and the coach schema in `lib/easy/orgs/coach.ex` with its migration. Add `recorded_kind text` and `coach_id uuid`, and fill them:
     - `client` when `recorded_by` equals the log client's `user_id`
     - `coach` plus `coach_id` when it equals the `user_id` of a coach row in the same business
     - otherwise `RAISE EXCEPTION 'unresolved workout log recorders: %'` with the log ids
   - Then drop the old uuid `recorded_by` and rename `recorded_kind` to `recorded_by`. Make it `NOT NULL CHECK(recorded_by IN ('client','coach'))`.
   - Add `workout_logs_coach_id_business_id_fkey FOREIGN KEY(coach_id, business_id) REFERENCES coaches(id, business_id)` and `workout_logs_recorder_valid CHECK((recorded_by='client' AND coach_id IS NULL) OR (recorded_by='coach' AND coach_id IS NOT NULL))`.
   - Add `effort smallint` with `workout_logs_effort_valid CHECK(effort IS NULL OR effort BETWEEN 1 AND 5)` and `workout_logs_text_length CHECK(text IS NULL OR char_length(text)<=10000)`.
   - Replace `workout_logs_values` with `CHECK(state IN ('active','completed','discarded') AND (schedule_id IS NULL)=(scheduled_date IS NULL) AND (schedule_id IS NULL OR workout_id IS NOT NULL))`. Drop `at_utc` (Decision 8).
   - Keep `difficulty`, `pain_note`, and `swaps` as unmapped columns, with no constraints.
2. `exercise_logs` table:
   - Columns as in the draft schema: decimals are `numeric`, `targets jsonb NOT NULL`, `entered_units jsonb` (nullable), and `state text NOT NULL DEFAULT 'active'`.
   - `exercise_logs_workout_log_business_fkey FOREIGN KEY(workout_log_id, business_id) REFERENCES workout_logs(id, business_id) ON DELETE CASCADE`
   - `exercise_id uuid NOT NULL REFERENCES exercises ON DELETE RESTRICT`, plus a BEFORE INSERT/UPDATE trigger that raises `foreign_key_violation` with constraint `exercise_logs_exercise_tenant` unless the exercise is built-in or in the same business
   - `exercise_logs_values CHECK(...)`, covering:
     - `state IN ('active','completed','skipped')`, `side_mode IN ('combined','per_side')`, `rounds BETWEEN 1 AND 10000`, `targets_mode IN ('same_for_all','per_round')`
     - `jsonb_typeof(targets)='array' AND jsonb_array_length(targets) = CASE targets_mode WHEN 'same_for_all' THEN 1 ELSE rounds END`
     - `position >= 0`
     - the ADR 0015 bounds: every count, total, and average is >= 0, except `weight_kg`, `incline_pct`, and `score`; `level >= 1`; `effort BETWEEN 1 AND 10`; `successes <= attempts` when both are present
     - `state <> 'skipped' OR` every measurement column is null
   - `exercise_logs_session_position UNIQUE(workout_log_id, position)`, `UNIQUE(id, business_id)`, an index on `(business_id, workout_log_id)`, and an index on `(business_id, exercise_id)`
   - A BEFORE UPDATE trigger rejects changes to `workout_log_id` or `workout_exercise_id`.
3. Exercise sets:
   - Add `exercise_log_id uuid`, `state text`, `avg_speed_m_s`, `avg_power_w`, `avg_cadence_per_min`, and `avg_heart_rate_bpm` (all numeric). `ALTER COLUMN duration_s TYPE numeric`.
   - Fill the data (item 4), then make `exercise_log_id` and `state` NOT NULL.
   - Add `exercise_sets_activity_business_fkey FOREIGN KEY(exercise_log_id, business_id) REFERENCES exercise_logs(id, business_id) ON DELETE CASCADE`.
   - Add `exercise_sets_outcome_values CHECK(state IN ('completed','skipped') AND (state='completed' OR` every new and legacy value column is null`))`.
   - Replace `exercise_sets_values` with the same bounds as `exercise_logs_values`, plus `reserve BETWEEN 0 AND 10` and `round BETWEEN 1 AND 10000`.
   - Make `exercise_snapshot` nullable; it is kept, unmapped.
   - Trigger `exercise_sets_inherit` (BEFORE INSERT OR UPDATE) sets `NEW.workout_log_id`, `NEW.workout_exercise_id`, and `NEW.exercise_id` from the parent ExerciseLog. It raises `check_violation` with constraint `exercise_sets_side_valid` when `side` contradicts the parent's `side_mode` (combined requires null; per_side requires left or right).
   - Drop `exercise_sets_prescribed_round`, and create `exercise_sets_prescribed_slot UNIQUE ON (workout_log_id, workout_exercise_id, round, COALESCE(side,'')) WHERE workout_exercise_id IS NOT NULL` and `exercise_sets_activity_round_side UNIQUE ON (exercise_log_id, round, COALESCE(side,'')) WHERE workout_exercise_id IS NULL`.
4. Data conversion, per legacy log (Decision 1):
   - **Grouping.** Group the legacy sets by `(workout_exercise_id, exercise_id)`. Each group becomes one ExerciseLog with `business_id` from the log and `state 'active'`. Never invent a completion.
   - **Side mode.** `side_mode` is `'per_side'` when the group's sets have a side, else `'combined'`. Raise if a group mixes sided and unsided rows. Also raise if two ExerciseLogs for the same `(workout_log_id, workout_exercise_id)` end up with different side modes (the draft's `consistent_sides?`).
   - **Rounds.** A linked group gets `rounds = GREATEST(the prescribed group's rounds from workouts.groups, max(set.round))`. An unlinked group gets `GREATEST(1, max(set.round))`.
   - **Targets for a linked group on the prescribed exercise.** Copy the entry's `targets_mode` and `targets`. When `rounds` exceeds a `per_round` list, pad it with `{"rest":{"mode":"client_chooses"}}`.
   - **Targets for a replacement.** Keep the entry's `targets_mode`, and copy only the rest of each target entry, padded the same way.
   - **Targets for an unlinked group.** `same_for_all` with `[{"rest":{"mode":"client_chooses"}}]`.
   - **Position.** Linked groups come first, in prescribed order (group index, entry index). Within one entry, the prescribed exercise comes first, then replacements by their earliest set `inserted_at`. Unlinked groups follow, by earliest set `inserted_at`, then exercise id.
   - **Swaps without sets.** For each `swaps` key (entry id) whose replacement (`value->>'id'`) has no sets on that entry, add one untouched active ExerciseLog after that entry's other activities, with rest-only instructions.
   - **Sets.** Every set gets `state 'completed'` and `exercise_log_id`. Values, legacy statistic columns, and `entered_units` stay as they are.
   - **Renumbering.** Renumber all positions per log from 0 in the order above.

Steps:
- [ ] **Step 1: Write the migration fixtures (`03.sql`)**, using the 20261020000200 schema.
  - Business, client (with `user_id`), and coach (with `user_id`). Workout W has a group with 3 rounds and entry E (back squat, combined).
  - Log L1 is client-recorded: sets on E with back squat for rounds 1 and 2, a set on E with goblet squat for round 3, one unlinked plank set, and `swaps {"E": {"id": goblet}}`.
  - Log L2 is client-recorded: `swaps {"E": {"id": goblet}}` and no sets.
  - Log L3 is recorded with the coach's user id.

  `03-unknown-recorder.sql` holds the same base plus one log whose `recorded_by` is a random uuid.
- [ ] **Step 2: Write the assertions (`03-check.sql`).**
  - L1 has 3 ExerciseLogs:
    - position 0: back squat, rounds 3, E's targets
    - position 1: goblet, rest-only targets
    - position 2: plank, `same_for_all`
  - All four set ids exist, with `state 'completed'`, their original values, and the right `exercise_log_id`.
  - L2 has 1 goblet ExerciseLog with 0 sets.
  - L3 has `recorded_by 'coach'` and the coach's id. L1 and L2 have `recorded_by 'client'` and a null `coach_id`.
  - `difficulty`, `pain_note`, and `swaps` are unchanged.
- [ ] **Step 3: Write the failing tests.** Port the draft tests (measurements and recording). In `test/easy/workout_logging_schema_test.exs`:
  - `test "a prescribed slot is unique across replacement activities"`: inserting `(E, round 1, left)` through two ExerciseLogs fails on `exercise_sets_prescribed_slot`, which `Recording`'s `set_constraints/1` translates to a changeset error. Register that name in place of `exercise_sets_activity_round_side` for linked sets.
  - `test "the same added exercise twice has independent slots"`
  - `test "a skipped activity cannot hold measurements"`
  - `test "a set inherits its parent's references"`
  - `test "an activity cannot move to another session or entry"`
  - `test "the recorder combination is enforced"`
- [ ] **Step 4: Run them.** Run `rtk mix test test/easy/workouts test/easy/workout_logging_schema_test.exs`. Expected: FAIL.
- [ ] **Step 5: Implement.**
- [ ] **Step 6: Run the migration check** with `<prev> = 20261020000200` and `<NN> = 03`. Then run the negative check: the same procedure with `03-unknown-recorder.sql`, but expect the `mix ecto.migrate` step to fail, with the log id in the error. Finish with `MIX_ENV=test mix ecto.drop`.
- [ ] **Step 7: Run the tests again** (the Step 4 command). Expected: PASS.
- [ ] **Step 8: Precommit.** Run `cd backend && rtk mix precommit`. Expected: exit 0.

---

### Task 5: Backend: recording writer and typed API for client and coach

**Files:**
- Create: `lib/easy/workout_logs.ex` (`Easy.WorkoutLogs`), `lib/easy_web/controllers/clients/workout_log_controller.ex`, `lib/easy_web/controllers/coaches/client_workout_log_controller.ex`
- Modify: `lib/easy/client_days.ex` (restore `workout_logs` and `active_workout`, with the new preload), `lib/easy_web/types/client_logging.ex`, `lib/easy_web/router.ex`
- Tests: `test/easy/workout_logs_test.exs`, `test/easy/workout_logs_concurrency_test.exs` (`async: false`; follow `test/easy/coaching_terms_concurrency_test.exs` for real concurrent transactions), `test/easy_web/controllers/clients/logging_test.exs`, `test/easy_web/controllers/coaches/client_workout_logs_test.exs`

**Context interface** (`Easy.WorkoutLogs`). Every mutation returns `{:ok, WorkoutLog.t}` with the hierarchy preloaded (`WorkoutLog.include_content/2`), the recorder's display name, and the workout's exercises loaded. Errors are `{:error, :not_found | :conflict | Ecto.Changeset.t}`.

| Client (`ctx.client_id`) | Coach (`client_id` second) | Draft command |
|---|---|---|
| `start_client_workout_log(ctx, attrs)` | `start_workout_log_for_client(ctx, client_id, attrs)` | `WorkoutLog.insert_changeset/7` |
| `get_client_workout_log(ctx, id)` | `get_workout_log_for_client(ctx, client_id, id)` | |
| `list_client_workout_logs(ctx, opts)` | `list_workout_logs_for_client(ctx, client_id, opts)` | |
| `update_client_workout_log(ctx, id, attrs)` | `update_workout_log_for_client(ctx, client_id, id, attrs)` | `update_changeset/5` |
| `finish_client_workout_log(ctx, id, attrs)` | `finish_workout_log_for_client(ctx, client_id, id, attrs)` | `finish_changeset/5` |
| `discard_client_workout_log(ctx, id)` | `discard_workout_log_for_client(ctx, client_id, id)` | `discard_changeset/1` |
| `reopen_client_workout_log(ctx, id)` | `reopen_workout_log_for_client(ctx, client_id, id)` | `reopen_changeset/1` |
| `start_client_activity(ctx, log_id, attrs)` | `start_activity_for_client(ctx, client_id, log_id, attrs)` | `Recording.start_activity/4` |
| `update_client_activity(ctx, log_id, activity_id, attrs)` | `update_activity_for_client(...)` | `update_activity/4` |
| `complete_client_activity(ctx, log_id, activity_id, attrs)` | `complete_activity_for_client(...)` | `complete_activity/4` |
| `skip_client_activity(ctx, log_id, activity_id)` | `skip_activity_for_client(...)` | `skip_activity/2` |
| `reopen_client_activity(ctx, log_id, activity_id)` | `reopen_activity_for_client(...)` | `reopen_activity/2` |
| `replace_client_activity(ctx, log_id, activity_id, attrs)` | `replace_activity_for_client(...)` | `replace_activity/4` |
| `record_client_set(ctx, log_id, activity_id, attrs)` | `record_set_for_client(...)` | `record_set/5` when `state: completed`, `skip_set/4` when `state: skipped` |
| `correct_client_set(ctx, log_id, activity_id, set_id, attrs)` | `correct_set_for_client(...)` | `record_set/5` or `skip_set/4`, with `existing` |
| `remove_client_set(ctx, log_id, activity_id, set_id)` | `remove_set_for_client(...)` | `remove_set/3` |

**Rules:**
- Authorization:
  - The client side uses `Ctx.fetch_client_id/1`.
  - The coach side uses `ClientAccess.authorize_client_id/2` and requires `ctx.coach_id`. The recorder is `{:coach, ctx.coach_id}`.
  - Every log, activity, or set id outside the authorized client's locked session returns `:not_found`.
- One private core serves both actors: `in_session(ctx, client_id, log_id, fun)`, inside `Repo.transact`:
  1. For start and reopen only, lock the client row `FOR UPDATE`, because they affect one-active-per-client.
  2. Lock the `workout_logs` row `FOR UPDATE`, scoped by business and client.
  3. Preload the hierarchy, the workout (with `Content.load_exercises/2`), and the schedule.
  4. Build `Content.exercises_by_id/2` for every exercise in the hierarchy plus the command's `exercise_id`.
  5. Run `fun.(session, lookup)`, persist its changeset or changesets, and return `{:error, changeset}` on a constraint error.
  6. Reload and return the session.
- Start:
  - resolves the prescription like the old `prescription/3` (the `nil`, `workout_id`, and `schedule_id` + `scheduled_date` cases), without the coach-led restriction (Decision 11)
  - defaults the date to the client's local today
  - rejects future dates
  - checks availability (no other active log; occurrence not claimed by a non-discarded log)
  - maps the unique-index errors `workout_logs_one_active` and `workout_logs_current_occurrence` to `:conflict`
- Activities:
  - A linked `start_activity` passes `{workout, workout_exercise_id}` as the source. `exercise_id` defaults to the entry's exercise; a different id is a replacement chosen before starting.
  - Selecting an exercise uses the archive rule from Task 3.
  - `replace_activity` returns the updated or newly inserted activity's session. The new activity uses the request `id`.
- Retries (Decision 3):
  - Creates take a client `id`. If that id already exists in the session with equal identifying fields (log: workout, schedule, scheduled date; activity: `exercise_id`, `workout_exercise_id`, `side_mode`; set: round, side, state, values), return `{:ok, session}`. Otherwise return `:conflict`.
  - A transition whose target state already holds returns `{:ok, session}` without calling the changeset: complete on completed with empty attrs, skip on skipped, activity reopen on active, finish on completed with empty attrs, discard on discarded, log reopen on active.
- Lists: `opts` takes `date`, `offset` (default 0), and `limit` (default 20, max 100), and returns `%{count, workout_logs}`, newest date first, then id.

**Routes.** Client routes go under `/v1/client`. Coach routes go under `/v1/coach/clients/:client_id`, with the same suffixes. Path ids are typed `Ecto.UUID.t()`.

```text
GET    /workout-logs                                               index            query WorkoutLog.list_query
POST   /workout-logs                                               start            body WorkoutLog.start      201
GET    /workout-logs/:id                                           show
PATCH  /workout-logs/:id                                           update           body WorkoutLog.update
POST   /workout-logs/:id/finish                                    finish           body WorkoutLog.feedback
POST   /workout-logs/:id/discard                                   discard
POST   /workout-logs/:id/reopen                                    reopen
POST   /workout-logs/:id/exercise-logs                             start_activity   body ExerciseLog.start     201
PATCH  /workout-logs/:id/exercise-logs/:activity_id                update_activity  body ExerciseLog.update
POST   /workout-logs/:id/exercise-logs/:activity_id/complete       complete_activity body Measurements.t
POST   /workout-logs/:id/exercise-logs/:activity_id/skip           skip_activity
POST   /workout-logs/:id/exercise-logs/:activity_id/reopen         reopen_activity
POST   /workout-logs/:id/exercise-logs/:activity_id/replace        replace_activity body ExerciseLog.replace
POST   /workout-logs/:id/exercise-logs/:activity_id/sets           record_set       body ExerciseSet.record    201
PATCH  /workout-logs/:id/exercise-logs/:activity_id/sets/:set_id   correct_set      body ExerciseSet.correct
DELETE /workout-logs/:id/exercise-logs/:activity_id/sets/:set_id   remove_set
```

Every action returns `data(WorkoutLog.t)` (200 unless marked 201), except `index`, which returns `WorkoutLogIndex.t`. There is no log delete, no restore, and no undo token (Decision 10).

**Wire types** (in `lib/easy_web/types/client_logging.ex`; each module's last segment becomes the TypeScript name):
- `WorkoutLog.t`:
  - `id`, `client_id`, `date`, `time | nil` (`"HH:MM"`), `state`
  - `recorded_by: :client | :coach`, `coach_id | nil`, `recorder_name: String.t`
  - `effort | nil`, `pain | nil`, `text | nil`
  - `workout_id | nil`, `schedule_id | nil`, `scheduled_date | nil`
  - `exercise_logs: [ExerciseLog.t]`, `inserted_at`, `updated_at`
- `WorkoutLog` bodies:
  - `list_query`: `date?`, `offset?`, `limit?`
  - `start`: `id?`, `date?`, `time?`, `workout_id?`, `schedule_id?`, `scheduled_date?`
  - `update`: `date?`, `time?`, `effort?`, `pain?`, `text?`
  - `feedback`: `effort?`, `pain?`, `text?`
- `WorkoutLogIndex.t`: `%{count, workout_logs: [WorkoutLog.t]}`
- `Measurements.t`: optional `number | nil` for each ADR 0015 overall field, `result?: :win | :draw | :loss | nil`, and `entered_units?: ResultUnits.t | nil`
- `ResultUnits.t`: optional enum per `Easy.Workouts.ResultUnits` field
- `ExerciseLog.t`:
  - `id`, `exercise_id`, `exercise: Exercise.t`, `workout_exercise_id | nil`
  - `state`, `position`, `side_mode`, `rounds`, `targets_mode`, `targets: [WorkoutRoundTargets.t]`
  - the overall measurement fields, `entered_units`, `sets: [ExerciseSet.t]`
- `ExerciseLog` bodies:
  - `start`: `id`, `exercise_id`, `workout_exercise_id?`, `side_mode?`
  - `update`: `rounds?`, `targets_mode?`, `targets?`, plus the `Measurements.t` fields
  - `replace`: `id`, `exercise_id`
- `ExerciseSet.t`: `id`, `state: :completed | :skipped`, `round`, `side`, the detail measurement fields (including `reserve`), `entered_units`, and the read-only `speed_m_s`, `power_w`, `cadence_rpm`, `heart_rate_bpm`, `grade`
- `ExerciseSet` bodies:
  - `record`: `id`, `state`, `round`, `side?`, plus the detail measurement fields
  - `correct`: `state?`, plus the detail measurement fields
- `ClientDay`: `workout_logs: [WorkoutLog.t]` and `active_workout: WorkoutLog.t | nil` return. `workouts` entries carry `exercise`.

Steps:
- [ ] **Step 1: Write the failing context tests** in `test/easy/workout_logs_test.exs`:
  - `test "client and coach starts set the recorder and reopen keeps it"`
  - `test "a coach can start a coach-led occurrence and the client reads the same active log"`
  - `test "a second active log for the client is a conflict"`
  - `test "a claimed occurrence cannot be started twice; a discarded one frees it"`
  - `test "a future date is rejected"`
  - `test "starting an activity creates only that activity with the entry's targets"`
  - `test "a replacement before saved work reuses the activity"`
  - `test "a replacement after a recorded set creates a new activity and keeps the set"`
  - `test "a side-specific swap keeps left on the original and right on the replacement"`: recording `(1, left)` again on the replacement returns `{:error, %Ecto.Changeset{}}` with an error on `round`.
  - `test "skipped and missing sets stay distinct through finish and reopen"`: record round 1, skip round 2, leave round 3 absent, then finish, reopen, and finish. There are two set rows, `completed` and `skipped`, and no round 3 row. The activity stays `active`.
  - `test "partial intervals keep the reported overall result"`: overall `distance_m` 5000 with two 1000 m sets keeps 5000, and no sum is stored.
  - `test "completing without measurements stores no numbers"`
  - `test "skipping recorded work is rejected"`
  - `test "a closed workout rejects activity and set writes"`
  - `test "retrying start_activity with the same id returns the session; different content conflicts"`
  - `test "retrying record_set with the same id is idempotent"`
  - `test "repeated transitions return the session unchanged"`
  - `test "finish accepts no feedback and stores effort from 1 to 5"`
  - `test "an archived prescribed exercise can still be logged; an archived replacement cannot be newly chosen"`
  - Cross-tenant: for every function, another business's coach, a coach without access to the client, and another client each get `{:error, :not_found}`.
- [ ] **Step 2: Write the concurrency tests** in `test/easy/workout_logs_concurrency_test.exs`:
  - `test "coach and client recording the same prescribed slot store exactly one set"`: two `Task`s; one returns `{:ok, _}` and the other `{:error, _}`.
  - `test "a coach edit racing a client start never changes content the log references"`: afterwards, the log's `workout_id` row equals its content at start.
- [ ] **Step 3: Run them.** Run `rtk mix test test/easy/workout_logs_test.exs test/easy/workout_logs_concurrency_test.exs`. Expected: FAIL.
- [ ] **Step 4: Implement** the context, types, routes, and controllers. Each controller action makes one context call and returns through `ok/2`.
- [ ] **Step 5: Controller tests** in `test/easy_web/controllers/clients/logging_test.exs` and `coaches/client_workout_logs_test.exs`:
  - statuses 201, 200, 404, 409, and 422
  - JSON values for states, ordering, the recorder fields, and `recorder_name`
  - the removed `DELETE /v1/client/workout-logs/:id` and `/restore` routes no longer exist
- [ ] **Step 6: Precommit.** Run `cd backend && rtk mix precommit`. Expected: exit 0.

---

### Task 6: Frontend: shared package `@easy/workouts`

**Files:** `frontend/packages/workouts/package.json`, `tsconfig.json`, `src/index.ts`, `src/metrics.ts`, `src/targets.ts`, `src/measurements.ts`, `src/recording.ts`, `tests/metrics.test.ts`, `tests/targets.test.ts`, `tests/measurements.test.ts`, `tests/recording.test.ts`; both apps' `package.json` (`"@easy/workouts": "workspace:*"`)

Mirror `packages/utils/package.json`: `"main": "./src/index.ts"`, per-file exports `./metrics`, `./targets`, `./measurements`, and `./recording`, and a script `"check": "node ../../scripts/run-checks.mjs tests"`. Run `rtk pnpm -C frontend install` after adding it.

**Interfaces (produced):**
- `metrics.ts`:
  - `type MetricKey`, the 20 selectable keys (the draft's `ExerciseMetric` list)
  - `metricCatalogue: Record<MetricKey, {label: string; unit: string; text?: boolean}>`, moved from `coachapp/src/exercises/exercise.ts` `metricInfo`
  - `historicalMetrics = {grade: {label: 'Grade', unit: '', text: true}}`
  - `metricLabel(key: MetricKey | 'grade', metric?: {label: string | null}): string`
  - `defaultMetrics: Record<'movement' | 'activity' | 'sport' | 'practice', MetricKey[]>`
- `targets.ts`:
  - `type Target = {mode: 'client_chooses' | 'exact' | 'range' | 'max'; value?: number | string; min?: number; max?: number}`
  - `type RestTarget = {mode: 'client_chooses' | 'none' | 'exact' | 'range'; value_s?: number; min_s?: number; max_s?: number}`
  - `formatTarget(metric, target: Target | null | undefined): string`: "Any" for null or `client_chooses`
  - `formatRest(rest: RestTarget): string`: "Any" for `client_chooses`, "None" for `none`, `m:ss` otherwise
  - `targetModes(metric): readonly Target['mode'][]`: no `max` and no `range` for `result` and `tempo`
- `measurements.ts`:
  - `measurementFields: Record<MetricKey, {field: string; scope: 'both' | 'detail'; integer: boolean; min?: number; max?: number}>`, with the ADR 0015 field names: `reps`, `weight_kg`, `duration_s`, `distance_m`, `elevation_gain_m`, `height_cm`, `calories_kcal`, `avg_speed_m_s`, `incline_pct`, `level`, `avg_power_w`, `avg_cadence_per_min`, `avg_heart_rate_bpm`, `effort`, `reserve` (detail only), `successes`, `attempts`, `score`, `result`. `tempo` has no field.
  - `parseMeasurement(metric, input: string, unit?: string): {ok: true; value: number | string | null} | {ok: false; message: string}`
    - an empty string gives `null`; `"0"` gives `0`
    - lb converts to kg, `min` to seconds, and `m:ss` to seconds (canonical units)
    - integers, bounds, and finiteness follow ADR 0015
    - it never reads a target
- `recording.ts` (minimal structural inputs `RecordingWorkout` and `RecordingLog` that the generated types of both apps satisfy):
  - `type Slot = {round: number; side: 'left' | 'right' | null}`
  - `slotsFor(activity: {side_mode: 'combined' | 'per_side'; rounds: number}): Slot[]`
  - `slotOutcome(log, activity, slot): {kind: 'unrecorded'} | {kind: 'completed' | 'skipped'; activityId: string; setId: string}`. A linked activity looks across every activity with the same `workout_exercise_id`.
  - `rowsFor(workout, log): RecordingRow[]`: one row per prescribed entry in workout order, then one per added activity by position. Each row has `entry | null`, `activities` in position order, `current` (the last activity whose state is `active`, else null), and `slots`.
  - `mismatch(activity): string | null`: when `distance_m` or `reps` is reported overall and the completed sets' sum differs, it returns e.g. `"Sets total 6 km; the overall result is 5 km."`. It returns null when there is no overall value. Durations are never compared.

Steps:
- [ ] **Step 1: Write the failing tests.**
  - `metricLabel` returns the catalogue label for a null label and the custom label otherwise
  - `formatRest({mode: 'none'})` is `'None'`, and `formatRest({mode: 'client_chooses'})` is `'Any'`
  - `slotsFor` with `per_side` and 3 rounds gives 6 slots
  - a replacement shares slot (1, right) with the original entry
  - the same added exercise twice has independent slots
  - `parseMeasurement('weight', '', 'kg')` is `{ok: true, value: null}`
  - `parseMeasurement('reps', '2.5')` fails
  - `parseMeasurement('effort', '11')` fails
  - `parseMeasurement('weight', '100', 'lb')` returns about 45.359 kg
  - `mismatch` returns the message for 5 km overall against 6 km of sets, and null with no overall distance
- [ ] **Step 2: Run the checks.** Run `rtk pnpm -C frontend/packages/workouts check`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the checks again.** Expected: PASS.

---

### Task 7: Frontend: coach exercises, builder and week

**Files:** `coachapp/src/api/exercises.ts`, `workouts.ts`, `workout-week.ts`; `coachapp/src/exercises/*`; `coachapp/src/workout-builder/*`; `coachapp/src/workout-week/*`; `coachapp/src/workouts/workouts.tsx`; `coachapp/tests/workout-builder/model.test.ts`; `coachapp/tests/workout-week-model/model.test.ts`; `coachapp/tests/workout-week/workout-week.browser.mjs`; `coachapp/tests/exercises/exercises.browser.mjs` (new); the `test:exercises` script; `.scratch/workout/browser-fixtures.json`

- [ ] **Step 1: Regenerate the API.** Run `rtk just gen-api`. Expected: both `schema.ts` files change. The clientapp build is fixed in Task 8.
- [ ] **Step 2: Exercise editor.**
  - Ordered metric rows: a key select (grade is not offered) and an optional "Label" input, moved with the existing `move` helper.
  - Textareas "Instructions" and "Equipment".
  - The muscles list as before.
  - A media list. Each item is a URL, filled by the existing library-media upload or a pasted link, with an optional "Caption", Move up/down, and Remove.
  - Archive and Restore buttons. `exercises.tsx` gets a "Show archived" filter, which passes `archived: true`.
  - Remove the `count_label`, `grade_scale`, and `unilateral` inputs. Use `metricCatalogue`, `metricLabel`, and `defaultMetrics` from `@easy/workouts/metrics`, and delete the copies in `exercise.ts`.
  - Update `exerciseBody` and `exerciseMatches` to the new body.
- [ ] **Step 3: Builder.**
  - `model.ts` `draftOf` and `bodyOf` read and write `targets[i]` with `rest` inside. The UI mode `choose` becomes `client_chooses`; `none` is a rest mode only. A metric left at "Any" is omitted.
  - Add `sideMode` to the draft exercise. Show an "Each side" control on each exercise row and the `each side` tag (U9). Keep the per-round target count equal to rounds.
  - The video field sends `video_url` and reads `video.url`.
  - Move `formatTarget` and the target modes to `@easy/workouts/targets`.
  - Update `save-queue.ts` (`readDraft` validates the new shape; `remapAfterSave` maps ids) and `workoutMatches`.
  - Add `tests/workout-builder/model.test.ts` cases:
    - `rest none round-trips`
    - `client chooses rest round-trips`
    - `side mode round-trips`
    - `per-round target count follows rounds`
- [ ] **Step 4: Week.** Update the types only, plus `tests/workout-week-model/model.test.ts`. Update `.scratch/workout/browser-fixtures.json` and the seed to the new content shape.
- [ ] **Step 5: Browser.**
  - The existing suite: `rtk pnpm -C frontend/apps/coachapp test:workout` (superset, per-round targets, autosave/Retry, library copy, repeating days, Undo, past-content preservation). Add one assertion: an exercise set to "Each side" shows the tag after a reload.
  - New `tests/exercises/exercises.browser.mjs` at 1280px and 375px:
    1. create an exercise with two labelled counts, a link with a caption, and equipment text
    2. reload and see the same values
    3. archive it; it is absent from the builder's exercise picker and present under "Show archived"
    4. restore it
- [ ] **Step 6: Verify.**
  - `rtk pnpm -C frontend lint:ci` passes.
  - `rtk pnpm -C frontend/apps/coachapp build` passes.
  - `test:workout` and `test:exercises` each pass three runs in a row.

---

### Task 8: Frontend: client Today logging

**Files:** `clientapp/src/api/workout-logs.ts`, `client-days.ts`, `exercises.ts`, `keys.ts`; `clientapp/src/today/model.ts`, `workout.tsx`, `workout-logger.tsx`, `today.tsx`; `clientapp/tests/today/model.test.ts`, `today.browser.mjs`, `fixtures.exs`

**Interfaces:**
- `useWorkoutLog(id)` is unchanged.
- `useRecording()` returns one async function per Task 5 route: `start`, `update`, `finish`, `discard`, `reopen`, `startActivity`, `updateActivity`, `completeActivity`, `skipActivity`, `reopenActivity`, `replaceActivity`, `recordSet`, `correctSet`, `removeSet`.
  - Each `onSuccess` writes `result.data` into `workoutLogKeys.detail(id)` and invalidates `dayKeys.all`. Keep the existing session guard, `networkMode: 'always'`, and `retry: false`.
  - Each create generates `crypto.randomUUID()` once per user action and stores it in the existing durable draft (`ui/use-durable-draft`) until it succeeds. Retry and reload reuse the same id (Decision 3).
- Delete from `today/model.ts`: swaps handling, `setInput`, `pendingSetCorrections`, `difficultyLabel`, `metricFields`, and `metricLabel`. Use `@easy/workouts` instead.

**Behavior** (ADR 0015):
- **Starting.** Opening a workout creates no records. The first saved target edit, result, or explicit skip for an activity calls `startActivity` and then the command.
- **Slots.** Each slot shows one of three states: Unrecorded (empty inputs), Done (values, or "Done" when there are none), and Skipped. "Done" with empty inputs records a set with no measurement keys. A Done or Skipped slot can be corrected (`correctSet`) or removed (`removeSet`, behind a confirmation).
- **Overall result.** An optional "Overall result" section per activity shows the exercise's selected metrics. Under it, a non-blocking mismatch line from `mismatch()`.
- **Plan edits.** The activity's planned rounds and rest are editable (`updateActivity`). The coach's workout is never changed.
- **Swap.** Swap opens the exercise search, then calls `replaceActivity`. Earlier rows stay under the original exercise's name. Replacement targets start blank. A "Copy targets" button copies compatible targets with `updateActivity`.
- **Finish.** The finish sheet has an optional "How hard was this session?" question with the choices Very easy, Easy, Moderate, Hard, Very hard; an optional "Any pain or discomfort?" question with Yes and No, unanswered by default; and one optional "Note". Finish never requires an answer. Unfinished activities stay as they are.
- **Completed logs.** A completed log shows read-only results and a Reopen action. Discard is behind a confirmation. Remove the log delete/Undo UI.
- **Another recorder.** When `recorded_by` is `coach`, show "<recorder_name> is recording this session".
- **Today card.** It shows the session effort label instead of the difficulty.

Steps:
- [ ] **Step 1: Model tests.** Update `tests/today/model.test.ts`: skipped vs missing render states, a per-side swap row, an empty-input Done that sends no measurement keys, and the reuse of the create id on retry.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Browser fixtures.** Update `fixtures.exs` to the new shape. Seed one per-side workout (split squat, 3 rounds) and one run (activity kind, distance and duration).
- [ ] **Step 4: Browser flow** in `today.browser.mjs`, at 375px:
  1. start the scheduled workout
  2. record (1, left) and (1, right) with values
  3. swap to the replacement; record (2, left) and skip (2, right); leave round 3 empty
  4. on the run, enter the overall result 5 km / 30:00 and one 1 km interval; no mismatch line appears, and no 2 km total appears
  5. finish with no answers
  6. reload; each slot shows Done, Skipped, or empty as recorded
  7. reopen, then finish with "Hard"
  8. the Today card shows "Hard"

  Save screenshots to the ignored `artifacts/` directory.
- [ ] **Step 5: Verify.**
  - `rtk pnpm -C frontend lint:ci` passes.
  - `rtk pnpm -C frontend/apps/clientapp build` passes.
  - `rtk pnpm -C frontend/apps/clientapp test:today` passes three runs in a row.

---

### Task 9: Frontend: coach recording and session viewing

**Files:** `coachapp/src/api/workout-logs.ts` (new; the same mutations as Task 8 with `clientId`), `coachapp/src/api/keys.ts` (`workoutLogKeys = {all, lists, list(clientId, filters), details, detail(clientId, id)}`), `coachapp/src/workout-session/workout-session.tsx` and `model.ts` (new), `coachapp/src/routes.ts` (`clientWorkoutSession: '/clients/:id/training/sessions/:logId'`), `coachapp/src/router.tsx`, `coachapp/src/workout-week/workout-week.tsx`, `coachapp/tests/workout-session/workout-session.browser.mjs` (new), the `test:workout-session` script

**Behavior:**
- **Recording rules** are the same as Task 8, built on `@easy/workouts/recording`.
- **Layout** uses the coach shell's `Page` and `editor-section-title`. At 1280px each slot is one row; at 375px slots stack.
- **Recent sessions.** The week screen gets a "Recent sessions" section, an infinite list using `ui/infinite-list.tsx` with the server count. Each item shows date, workout name, state, recorder, and effort label, and opens the session screen.
- **Starting.** Today's occurrences get "Start session" for an occurrence with a coach, or "Record session" otherwise, both calling `start`. An existing active log opens instead.
- **Another recorder.** When the client is the recorder, show "<client name> is recording this session".

Steps:
- [ ] **Step 1: Write the browser flow** at 1280px and 375px:
  1. the coach starts a session on a coach-led occurrence
  2. the coach records two sets and skips one
  3. in a second browser context, the client opens Today and sees "<coach name> is recording this session" with the same slot states
  4. the coach finishes
  5. Recent sessions lists it as completed, with the coach as recorder
  6. the coach opens a client-recorded session from the list and sees Done, Skipped, and empty slots
- [ ] **Step 2: Implement** until the flow passes.
- [ ] **Step 3: Verify.**
  - `rtk pnpm -C frontend lint:ci` passes.
  - `rtk pnpm -C frontend/apps/coachapp build` passes.
  - `rtk pnpm -C frontend/apps/coachapp test:visual-hierarchy` passes.
  - `test:workout-session` passes three runs in a row.

---

### Task 10: Whole-flow verification and the legacy-column report

**Files:** `.scratch/workout/verification-report-activity-logging.md` (new); `.scratch/workout/concept.md` (add row W84: "Implemented by activity-logging-plan.md", with a one-line summary of each numbered decision in that plan); `CONTEXT.md` only if a term changed meaning (expected: no change)

- [ ] **Step 1: Backend.** Run `cd backend && rtk mix precommit`. Expected: exit 0. Record the test count.
- [ ] **Step 2: Frontend.** Run `rtk pnpm -C frontend lint:ci`, `rtk pnpm -C frontend/packages/workouts check`, `rtk pnpm -C frontend/apps/coachapp build`, and `rtk pnpm -C frontend/apps/clientapp build`. Expected: all pass.
- [ ] **Step 3: Drift.** Run `rtk just gen-api`, then `cd backend && rtk mix typed_routes.gen --check`. Expected: no drift.
- [ ] **Step 4: Browser.** Run `test:exercises`, `test:workout`, `test:workout-session`, `test:today`, and `test:nutrition` (regression). Expected: all pass.
- [ ] **Step 5: Dev database.** Run `cd backend && rtk mix ecto.migrate` against the dev database (`easy_dev_refactoring`). Expected: success. If a guard raises (grade metric, unknown recorder, mixed sides, or a built-in exercise with media), stop and report the ids to the user. Do not edit data to get past it.
- [ ] **Step 6: Write the report** in `.scratch/workout/verification-report-activity-logging.md`:
  - the commands and their results
  - the screenshots reviewed
  - each Review Focus item with the test that covers it
  - **Legacy data pending the user's removal approval:**
    - columns `exercises.count_label`, `exercises.grade_scale`, `exercises.unilateral`, `exercises.media`
    - column `workouts.video`
    - tables `legacy_exercise_groups` and `legacy_workout_entries`
    - columns `workout_logs.difficulty`, `workout_logs.pain_note`, `workout_logs.swaps`
    - column `exercise_sets.exercise_snapshot`
  - the readable-by-design legacy statistics: `exercise_sets.speed_m_s`, `power_w`, `cadence_rpm`, `heart_rate_bpm`, and `grade`
- [ ] **Step 7: Final git check.** Run `rtk git status --short` and `rtk proxy git diff --cached --stat`. Expected: the staged set is identical to the record from Task 1 Step 1, and every change from this plan is unstaged or untracked. List the changed files in the report.
