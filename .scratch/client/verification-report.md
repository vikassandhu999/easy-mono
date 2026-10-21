# Client logging verification

Date: 14 October 2026. Branch: `prototype/workout-layout`.

The corrected brief is the implementation contract. W34 is withdrawn. No commit or stage command was run.

## Built

One migration creates exactly four tables: `nutrition_logs`, `food_logs`, `workout_logs`, and `exercise_sets`. Each carries `business_id`. Composite foreign keys, checks, and unique indexes enforce tenant links, valid copied values, one current log per occurrence, and one active workout per client. Deferred nutrition checks enforce the item count and selected meal option.

The logs use their own rows for history. They have no record spine integration: no `Easy.RecordJournal` calls, `record_changes` writes, `clients.last_change_seq` updates, or `records` view changes.

Food rows copy the food name, kind, basis, unit label, servings, and nutrients when saved. Corrections use that copy. Exercise sets have typed metric columns, round, side, entered units, and a copy of the performed exercise definition. Workout logs hold swaps per prescribed exercise and the required state, difficulty, pain, and pain note.

Nutrition and workout history now treat today's claimed occurrence as a fact. A later coach edit copies the prescription and retains the original followed by the log. Coach Undo also protects prescriptions referenced by client logs.

Seventeen typed routes were added to the existing `/v1/client` scope. They use `Ctx` and client context names of the form `verb_client_noun(ctx, ...)`:

| Method | Path after `/v1/client` | Purpose |
| --- | --- | --- |
| GET | `/days/:date` | Resolved plan, targets, records, and active workout |
| GET | `/week-markers` | Seven day strip markers from `from` |
| GET | `/foods` | Food and supplement search |
| GET | `/exercises` | Visible exercise search for swaps |
| POST | `/nutrition-logs` | Record planned or unplanned intake |
| GET, PATCH, DELETE | `/nutrition-logs/:id` | Read, correct, or delete intake |
| POST | `/nutrition-logs/restore` | Inverse Undo for correction or deletion |
| POST | `/workout-logs` | Start a workout |
| GET, PATCH, DELETE | `/workout-logs/:id` | Read, update recorded sets/swaps, or delete |
| POST | `/workout-logs/:id/finish` | Complete with feedback |
| POST | `/workout-logs/:id/discard` | Discard and release the occurrence |
| POST | `/workout-logs/:id/reopen` | Edit a completed workout |
| POST | `/workout-logs/restore` | Inverse Undo for a change or deletion |

The client home now shows Today, the day strip, targets, and plan above the existing trackers, check-ins, and messages. The meal and workout loggers have their own routes. The implementation includes Taken with Undo, meal options, decimal text, replace, Not eaten/Add back, time eaten, correction/deletion, workout preview, target-prefilled sets, sides, tick saves, extra sets, swaps, both finish choices, feedback, completed workout editing/deletion, and future read-only views. Coach-led sessions show the coach's name and remain read-only.

React Query hooks and invalidation are in `src/api/`. The screens use the client UI primitives. Meal drafts, unticked set inputs, and added rounds use the existing account-scoped durable device storage. Failed recorded-set corrections also remain recoverable after leaving and returning; Finish stays blocked until Retry succeeds or the saved values are restored.

The prototype source and route were kept as found. `clientapp-v2` was restored after API generation. `skills-lock.json` was not edited; existing index entries were preserved.

## Required checks

All commands below were run after the session restart. Output was saved under `/tmp/easy-client-logging-*-final*.log`. The backend command was run in `backend/`; all other commands were run at the repository root.

| Command | Result |
| --- | --- |
| `rtk proxy mix precommit` | Passed. 662 tests, 0 failures; typed route check found 152 routes; Credo found no issues. |
| `rtk pnpm -C frontend lint:ci` | Passed. Biome checked 443 files without fixes; design lint passed. |
| `rtk pnpm -C frontend/apps/clientapp build` | Passed. |
| `rtk pnpm -C frontend/apps/coachapp build` | Passed. |
| `rtk just gen-api` | Passed. Generated 152 typed routes. |
| `rtk git checkout -- frontend/apps/clientapp-v2` | Passed. No final difference under that app. |
| `rtk pnpm -C frontend/apps/clientapp test:today` | Passed three times in a row on the final implementation at 375px against the real API. Six flow groups per run; no browser errors. |
| `rtk pnpm -C frontend/apps/coachapp test:nutrition` | Passed at 375px and 1280px against the API. |
| `rtk pnpm -C frontend/apps/coachapp test:workout` | Passed at 375px and 1280px against the API. Repeated after the final Undo ordering change. |
| `rtk proxy git diff --check HEAD` | Passed. |

Both builds report Vite's warning about chunks over 500 kB. The builds exit successfully. No physical native device test was run.

## Browser evidence

Chromium starts. The browser test uses the real client app on port 1315 and API on port 4000, at 375 by 812 pixels. Fixtures reset their own business by stable handle and client email before each run. Tests wait for write responses before reading saved state and click visible radio labels.

The six flow groups cover the day strip, targets, retained home content, future/past days, focus return, Taken/Undo, unknown nutrients, all meal flows, unplanned food, all workout flows, video/open feedback, and coach-led previews. They also cover failed saves, Retry ordering, blank recorded metrics, delayed submission locks, and durable failed corrections after a return visit.

Screenshots are under `frontend/apps/clientapp/tests/today/artifacts/`. Today, meal, preview, active workout, and finish screenshots were compared with the prototype screenshots. The card slots, options, target labels, sides, controls, and finish sheet follow the prototype. Fixture content and recorded states differ. The real Today includes the existing app header, navigation, trackers, check-ins, and messages.

A final screenshot check found that the preview capture could start during navigation and retain the previous page's height. The test now waits for the focused preview heading and visible Start button. Its corrected screenshot has no extra blank page area.

## Implementation decisions not specified by the concepts

1. `recorded_by` uses the trusted authenticated user's UUID. Workout `at_utc` is the server start timestamp; the client-local calendar date and time are separate fields.
2. Food copies also retain `kind` and `position`. These support type validation and stable item order. Exercise definition copies are stored with saved sets and swaps so later catalogue edits cannot change the metrics of a saved record. The client sends the displayed base units in `entered_units`.
3. Delete removes the log rows. Undo of creation deletes them; Undo of a change or deletion restores the saved copy. The restore payload is encrypted and signed, tenant/client scoped, and valid for one day. The visible Undo message lasts eight seconds and pauses while focused, hovered, pending, or showing a retry error.
4. Restore checks the expected current row and the referenced prescription/schedule. A later edit, occupied occurrence, or active-workout collision returns conflict instead of overwriting new work. Catalogue changes do not invalidate the saved food or exercise copy.
5. Discard retains a workout row for history and releases its current occurrence claim. Retained workout logs, including discarded and unscheduled logs, protect their referenced workout from coach edits. A new current log can claim a discarded occurrence.
6. Client writes lock the client row and use a transaction, with database constraints as the final concurrency guard. Day and marker reads use the existing repeatable-read snapshot helper. List reads have a fixed order.
7. The day read includes logs whose actual date or claimed occurrence date matches the requested day. Nutrition totals use the actual intake date. Week markers use actual log dates, count active/completed workouts, and exclude discarded workouts. Untimed plan items sort after timed items, with IDs as ties.
8. Read/create/restore responses use `{data}`. Changed logs also return an `undo_token`; deletion returns the token. The extra log reads and exercise search support route reload and swaps. Invalid typed UUID paths return 422, missing scoped rows return 404, domain validation returns 422, and collisions or stale Undo return 409.
9. Updating `sets` replaces the submitted saved set values; omitted metrics are cleared. Omitting the `sets` field preserves saved sets. Device IDs are not sent for new sets; saved set IDs remain stable.
10. Range targets prefill their minimum. Maximum or unspecified targets leave the input blank. A swap uses only its own metrics and unilateral rule. A missing metric on an already recorded set stays blank and never falls back to the target. Additional recorded rounds retain the prescribed exercise link.
11. Drafts are scoped by verified account, date, schedule, and log. A pending correction after a return visit is derived from the existing device input and saved set; it needs no new server or durable field. Set writes and Retry share one queue. Reopen, Finish, Discard, and Delete hold a lock through the response and refresh; meal submission locks its fields and Back action.
12. The fixed workout footer is measured so errors and Retry controls do not cover the last content. Focus returns after the modal's inert state is removed. Toasts sit below modal sheets.
13. Starting a workout shows `Workout started.` with inverse Delete Undo. Empty intake shows `Not recorded`; an unknown-only nutrient total shows `Nutrients not listed`, as N34/N42 require. These labels replace the prototype's numeric placeholder in those states.
14. Direct `.mp4`, `.webm`, and `.mov` workout media use a video player; other media URLs open a link. One unplanned food/supplement is typed from the copied item; multiple unplanned items form a meal. The client never sends an unplanned schedule or type.
15. The coach's current week excludes ended archived prescription rows; historical day reads retain them. Coach Undo rejects changes that would alter a referenced prescription and retains referenced rows during a valid inverse operation.

