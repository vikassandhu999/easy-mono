# Workout rebuild verification

The new workout feature is complete on `prototype/workout-layout`. No commit or staging action was made. The existing staged `skills-lock.json` and its file contents are unchanged. Both retained prototype folders and routes, and `clientapp-v2`, are unchanged.

## Removed feature

Removed the old training contexts, content schemas, plans, revisions, coverage and overlap code, exercise library, sessions, performed sets, controllers, routes, types, seeds and tests. Removed the old coach training-plans, training-sessions and plan-management screens and API hooks. Removed the maintained client training screens, API hooks, routes, navigation and session-only shared controls.

Removed training records from the records view, journal types, chat embeds and Review summaries. Removed training-only browser and native test sections. Tracker templates retain the `templates` table and their public contract. Their schema and operations now use `Easy.Trackers.Template` and `Easy.Trackers.Templates`; the old `plans/` directory is gone.

The development migration deletes the retired training data and has no reverse migration.

## Built feature

Five tables: `exercises`, `workouts`, `exercise_groups`, `workout_exercises`, and `workout_schedules`. Two migrations enforce the taxonomy, target shapes, content type, rounds, positions, tenant ownership and schedule details. Nine shared built-in exercises have no business owner. Coaches can search shared exercises and create, copy, edit and delete their own exercises.

All new endpoints use `/v1/coach`:

| Resource | Endpoints |
| --- | --- |
| Exercise catalogue | GET and POST `/exercises`; GET, PATCH and DELETE `/exercises/:id`; POST `/exercises/:id/copy` |
| Workout library | GET and POST `/workouts`; GET, PATCH and DELETE `/workouts/:id`; POST `/workouts/:id/copy` |
| Client workouts | GET and POST `/clients/:client_id/workouts`; GET, PATCH and DELETE `/clients/:client_id/workouts/:id`; POST copy and assign actions |
| Training week | GET `/clients/:client_id/workout-week` |
| Schedules | POST `/clients/:client_id/workout-schedules`; PATCH and DELETE `/clients/:client_id/workout-schedules/:id` |
| Undo | POST `/clients/:client_id/workout-undo` |

Coach screens: Exercise library and editor, Workout library, the card Workout builder, and the client Training week. The builder supports supersets, circuits, same or per-round targets, rest transfer, reorder, removal Undo, autosave, device recovery and Retry. The week supports independent library copies, repeating days, live-session details, removal and signed Undo. Shared week columns, tabs, dialogs, recovery, weekday controls and Undo serve both Training and Nutrition.

W14, W32 and W37 preserve past prescriptions without logs. Workout exercises retain frozen exercise details. An edit after a past applicable date copies the workout, moves future schedules and archives the original. Today is not a fact.

No logging, history-copy, max, program, skip or one-off tables were added.

## Final commands and results

Commands run from the repository root except where stated.

| Command | Result |
| --- | --- |
| `rtk mix precommit` in `backend/` | Passed: 613 tests, zero failures; Credo clean; compile with warnings as errors; 135 typed routes checked; format passed |
| `rtk pnpm -C frontend lint:ci` | Passed: Biome and design lint |
| `rtk pnpm -C frontend/apps/coachapp build` | Passed: typecheck, all discovered unit suites and Vite |
| `rtk pnpm -C frontend/apps/clientapp build` | Passed: typecheck, all discovered unit suites and Vite |
| `rtk just gen-api` | Passed; generated both maintained API schemas |
| `rtk git checkout -- frontend/apps/clientapp-v2` | Passed after each generation; no final changes in V2 |
| `rtk pnpm -C frontend/apps/coachapp test:workout` | Three consecutive final passes; each run resets its fixtures and tests 375px and 1280px |
| `rtk pnpm -C frontend/apps/coachapp test:nutrition` | Passed at 375px and 1280px |
| `rtk pnpm -C frontend/apps/coachapp test:visual-hierarchy` | Passed: 12 screen and viewport combinations |
| `rtk rg -n 'training_session\|plan_revision\|content_block\|performed_set\|training-plans' backend/lib frontend/apps/coachapp/src frontend/apps/clientapp/src` | No matches. Ripgrep exit 1 means no matches |
| `rtk git diff --check` | Passed |

The actual search used the alternation expression `training_session|plan_revision|content_block|performed_set|training-plans` without escaped bars. The broader check also found no `about_session_id` or `Easy.Plans` references in these trees.

Additional focused checks passed for workout schemas, context operations, router responses, builder serialization, concurrent edits during autosave, recovery, tracker drafts and conversation drafts. A mocked client coaching-access browser test also passed. Physical-device tests were not run.

Earlier browser runs found list-response wrapping, formatter double calls, target label IDs, phone overflow, stale child IDs and restoration after a W37 route change. Those defects were fixed before the final three passes. Final API generation exposed stale tracker session-link consumers; those consumers were removed before the final builds.

## Browser evidence

The workout test verifies catalogue creation and editing, shared read-only exercises, superset construction, per-round targets, rest transfer, reorder, removal Undo, retained failed saves after reload, Retry, library copying, weekday merging, time changes, day removal, signed content Undo and unchanged past prescriptions. It also changes the catalogue after prescription and checks that a later save and cross-card move keep the frozen exercise details.

Screenshots are in the ignored `frontend/apps/coachapp/tests/workout-week/artifacts/` directory. Builder, week and schedule-dialog screenshots were inspected against both retained prototypes at both widths. The mobile round table fits, desktop shows seven columns, and Save, Edit workout and Remove retain their mobile order. Screenshots wait for the loaded week before capture.

## Decisions not settled by the concept

- Dropped the old bodyweight, mechanics and force fields. The locked facets and metrics replace them.
- Result and grade support exact text targets or client choice. Grade targets use the exercise's ordered scale. Tempo is an exact text target. Numeric ranges and max do not apply to these text metrics.
- Successes and attempts are separate count metrics. The exercise count label can name reps or the paired count metrics.
- Shared exercises are read-only for coaches. A coach copies a shared exercise before an edit.
- An empty prescribed workout is a valid draft. An empty saved card is invalid. The first creation requires a name; content edits then autosave.
- The wire format has one target map for all rounds or one map per round. Rest uses parallel slots; null means no rest.
- Mobile Training uses the shared Nutrition day tabs, following the explicit sibling-screen instruction. The retained client-week prototype still shows a day list and remains unchanged.
- Video supports a URL or an MP4 or WebM upload through the existing media API. Stored video URLs use HTTP or HTTPS.
- A partial type change that leaves incompatible content returns 422. A type change with explicit empty groups can succeed.
- Undo expires in the UI after eight seconds. The encrypted server token is valid for one day, only on its original client-local date, and only while its state fingerprint and references remain valid.
- Own exercise deletion returns an in-use error when a workout references the exercise. Copy names use the existing `(copy)` suffix.
- Validation limits: names have at most 200 characters, rounds are 1–100, tempo has at most 100 bytes, and numeric target magnitudes are below `1e15`. Count, level, cadence and heart-rate targets use integers. Exercises require at least one metric.

The requested `test-designer` skill was not available. Backend test work used the available production-quality testing guide and the other requested Elixir skills.
