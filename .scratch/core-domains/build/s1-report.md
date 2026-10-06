# Slice 1: shared foundation and training

Status: implemented and verified. Work is in `codex/core-domains`. Nothing was committed or pushed. Existing owner changes were preserved. `clientapp-v2` was not changed.

## Changes

The backend uses shared `templates`, `plans`, and immutable `plan_revisions`. Training content is an embedded-schema-validated document with workouts, blocks, items, typed sets, and stable schedule entries. Assignment copies the document. Publishing adds a revision. Future revisions can be withdrawn. Date changes and archive preserve past coverage.

Coverage, the E6 cutoff, prospective overlap, and expected workouts use shared SQL functions. Nutrition retains its tables and API. Its plan creation date is stored so a later timezone change cannot change E6. The training-only `records` view and `record_changes` journal are in place. Session and set writes use one client-locked transaction helper. The test suite includes separate database connections for concurrent writes and a reader holding a snapshot and sequence.

Training sessions identify their immutable prescription and an optional selected occurrence. Performed sets identify prescribed sets or extra work. They store outcomes, base-unit values, entered units, and removal tombstones. Request retries retain their identity. Completed-session corrections and workout notes in Messages remain supported. The retired snapshot, soreness, relational prescription, and set-request code was removed.

Exercises use measures, bodyweight, and one media reference. Built-in status is derived from the missing business id. The seed maps source tracking types, fixes weighted bodyweight movements, and creates system media. The unit registry converts kg/lb and m/km/mi; duration uses seconds.

The typed contract includes whole-document writes, revisions, expected occurrences with fulfilment, extra sessions, and per-exercise PR/history reads. Both retained apps use the generated schema. Retired training fields and the separate prescription save route were removed.

The coach builder edits straight, superset, and circuit blocks; exact, range, and AMRAP reps; load, effort, tempo, duration, distance, and rest. It saves details and content in one request. It supports several workouts per weekday, publishing today or later, scheduled-prescription preview, withdrawal, and the P4 notice. Client pages show weekly expected/done/not-recorded/extra work, prescribed-versus-performed sets, and PR history. Training plan deletion is replaced by archive in the client-plan interface. Exercise maintenance uses archive language.

The client Today screen reads occurrences. Training lets the client choose an earlier scheduled date, another current-plan workout, or a free workout. Recording retains each prescribed set id and supports extra sets and done/failed/skipped outcomes. Forms start with the client's units. Account-scoped local drafts and retry ids survive interruption. Corrections preserve measurement precision.

`CONTEXT.md` uses the frozen training vocabulary. Tests tied to the retired training shape were replaced with domain, router, concurrency, document, draft, live-browser, and correction/retry tests. The training test commands use the replacement browser flows.

## Choices where the documents were silent

1. Document ids are UUIDs, including schedule-entry ids. Assignment copies these local ids; the plan id keeps occurrence identity separate between copies. Duplicating a workout creates fresh ids for all its nodes.
2. An initial assignment can start in the past. An existing started start date cannot change, and an expired end date cannot be reopened. Archiving a future plan clears its future dates; archiving a started plan ends it today and retains the past.
3. Prepared plan periods are reserved before coaching starts. A scheduled coaching end does not release that reservation until it has actually passed in the client's timezone. This prevents acceptance or extension of coaching from activating two overlapping prepared plans. SQL owns this prospective rule and the E6 cutoff.
4. Several future revisions are supported. The builder lists their dates and prescriptions. A same-date publication uses the greatest revision number, as specified.
5. If several completed sessions fulfil one occurrence, the API returns the earliest completed session, then id as a tie-break. The occurrence appears once. Completed sessions without an occurrence appear as extra work, using the date they were performed.
6. Occurrence reads allow at most 367 inclusive dates. PRs require known reps and load; a missing value cannot produce a load-per-rep record. Set history retains other outcomes and set kinds in completed sessions.
7. A new workout starts with one empty straight block. Adding an exercise adds one working set with no numeric targets. A coach can add more sets. Selecting exact/range reps gives visible initial targets of 8 or 8–12; clearing a value leaves it unknown. Selecting a unit alone does not write zero.
8. The first source image is the exercise's single media reference. Published exercise names come from the authorised library. Recorded prescribed rows display that published name; extra library rows display the library name. Free-text rows store their name.
9. Draft format version 2 rejects the retired draft shape. It does not convert discarded prototype training data. An acknowledged retry does not create a second record or another journal change.
10. Empty templates can be saved. An unused highest revision number can be reused after withdrawal; revision ids remain distinct. Completed record corrections have no time-window limit, but require active coaching and cannot use a future execution date.
11. Set history is unpaginated for the chosen client and exercise. Base loads round to three decimal places and base distances to two, matching the database columns. External media can omit upload metadata such as content type and byte size.
12. Prototype migrations discard retired training data and preserve account, business, and nutrition data. Follow-up migrations keep databases that already applied the first migration consistent.
13. The live browser fixture backdates only its disposable client's coaching term. This permits a real earlier-occurrence workflow without changing the application clock. The session execution date remains today.

## Verification

The development and test databases are migrated through `20261005000400`. `rtk mix run priv/repo/seeds.exs` passed. The seed audit found 417 built-in exercises, 20 muscles, and 8 equipment rows. All 12 weighted exercises include added load. The food library remains available. The detailed backend results and choices are in [s1-backend-report.md](s1-backend-report.md).

Commands below ran against the final source and generated contract. All required gates passed.

| Command | Result |
|---|---|
| `rtk mix precommit` in `backend/` | Passed; 1,020 tests, zero failures, compile/format/Credo and contract drift checks passed |
| `rtk just gen-api` | Passed; 126 typed routes generated |
| `rtk pnpm -C frontend/apps/coachapp build` | Passed; typecheck, unit checks, and Vite build |
| `rtk pnpm -C frontend/apps/clientapp build` | Passed; typecheck, unit checks, and Vite build |
| `rtk pnpm -C frontend lint:ci` | Passed; Biome and design lint |
| `rtk proxy node frontend/apps/coachapp/tests/training/core-domains.browser.mjs` | Passed live against Phoenix, coach at 1280px and 375px, client at 375px |
| `rtk proxy node frontend/apps/clientapp/tests/training/corrections.browser.mjs` | Passed at 375px with controlled API responses |
| `rtk proxy env HIERARCHY_PHASE=s1 rtk pnpm -C frontend/apps/coachapp test:visual-hierarchy` | Passed 16 screen/viewport combinations |
| `rtk proxy git diff --check -- backend frontend CONTEXT.md` | Passed |

The live flow builds a superset template with typed sets, assigns it to an active client, publishes today, schedules and withdraws a future revision, records a skipped set and an extra set, recovers a lost set response, completes an earlier occurrence on a later day, records an extra free workout, and reads weekly results and PRs. It also checks local saving while offline and blank-unit preservation. Evidence is in [s1-screens](s1-screens/). Separate source reviews are in `s1-backend-review.md`, `s1-coach-review.md`, and `s1-client-review.md`.

## Limits and operational notes

All requested implementation and browser work is complete. Nutrition redesign, Trackers, reviews, occurrence exceptions, multiweek cycles, linked templates, and add-on programs remain outside this slice.

Native devices were not tested. Browser checks establish the requested browser behavior, not native storage or physical-device behavior. Vite reports the existing large-bundle warning; builds still exit successfully.

Phoenix was restarted because its running type cache retained the retired schedule type. A seeded-media response error found by the live flow was fixed. Development test accounts remain available for review; they use synthetic `example.test` addresses. Automatic approval review first rejected a local migration/reset step; the retry succeeded after the explicit reset authorization in the owner task was supplied. No additional owner permission was needed.

The existing session log `s1.log` was not edited by this implementation. Its generated terminal text includes trailing spaces, so the whitespace check above is scoped to source and the glossary.
