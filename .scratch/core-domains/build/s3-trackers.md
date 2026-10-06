You are implementing the third slice of a data-model redesign in this repository: Trackers, end to end (backend, API contract, coach app, client app). Before that, you restore test coverage that the first two slices lost. Work in this working tree on the branch `codex/core-domains`. Do not create another branch or worktree. Do not commit and do not push.

## Context

Fitness-coaching product: Elixir/Phoenix + Postgres backend in `backend/`, React apps in `frontend/apps/coachapp` and `frontend/apps/clientapp`. Do not touch `frontend/apps/clientapp-v2`.

Read these first; they are the source of truth:
1. `.scratch/core-domains/decisions.md` — frozen decisions (M1–M18, P1–P4). Trackers: M11, M12, M15, M17.
2. `.scratch/core-domains/overview.md` — sections 3 (trackers library), 5 (tracker list), 6 (records), 7 (history), 9 (calculated values).
3. `.scratch/check-ins/spec.md` — the Trackers section and "Focus and requests" (product behaviour: timings, "To record" on Today, coach-recorded entries, "Add something else", archive, units, photos and reports).
4. `.scratch/core-domains/build/s1-report.md` and `s2-report.md` — what slices 1 and 2 built and the choices they made. Reuse the shared pieces (`Easy.Plans`, `Easy.RecordJournal` with `write_for_client`, the `records` view, unit and nutrient registries, `templates` with `domain = 'trackers'`). Do not build a second version of any of them.
5. `.scratch/core-domains/shared-report.md` — facts about attachments and chat today.
6. `AGENTS.md`, `CONTEXT.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`, and the app `AGENTS.md` files.

Design standard: Rich Hickey's "Simple Made Easy" — separate identity, value and time; one fact in one place; calculate states; no braiding. Prefer deleting code to adapting it. Prototype with no real users: you may rewrite prototype migrations and reset dev/test databases; re-run seeds afterwards.

## Part 1: restore test coverage (do this first)

Slices 1 and 2 deleted 74 backend test files that tested the old training and nutrition shapes, and added 9 new ones. The suite went from about 1,000 tests to 672. The new tests cover the core rules, but whole areas now have no test. Add focused tests for the current behaviour (not the deleted shapes), at the level the old tests used:

- **Controller/contract tests** for the training and nutrition routes, coach and client side: authorisation and tenant scoping (a coach cannot read or write another business's or an unassigned client's plans, sessions, meals; a client cannot reach another client's data), validation errors and their response shape, `expected_revision` conflicts, cursor pagination where routes paginate, 404s.
- **Library**: exercise, food and recipe search, filters, pagination, create/update/archive, built-in items are read-only, usage reads.
- **Corrections**: completed-session and meal corrections, removals (tombstones) and their `record_changes` rows, retries with the same `request_id`.
- **Concurrency**: two simultaneous writes for one client get distinct sequence numbers and both journal; two simultaneous publishes of one plan with the same `expected_revision` — one wins, one conflicts.
- **The write gate**: `RequireCoaching` for today's term and for a path `date` outside any term.

Remove nothing to make tests pass. If a test finds a real bug, fix the code and say so in the report.

## Part 2: Trackers

**Library — `trackers`**: business (null = built-in), name, `kind` (`number`, `rating`, `yes_no`, `text`, `photo`, `document`), base unit (number), `scale_max` (rating), `archived_at`. Kind, unit and scale are fixed at creation. Archive instead of delete when used; a custom tracker with no entries can be deleted. Built-ins cannot be archived. Seed curated built-ins: body weight (kg), waist (cm), sleep hours, steps, water (ml), energy (rating 1–5), soreness (rating 1–5), hunger (rating 1–5), bloating (rating 1–5), reflection (text), progress photo front / side / back (three photo trackers), blood report (document), and a few yes/no habits (supplements taken, 10k steps reached, alcohol-free day).

**Tracker list — `tracker_assignments`** on the client: tracker, timing (`daily`, `weekly`, `after_workout`, `after_meal`), weekday (weekly only), `starts_on`, `ends_on`. A timing change ends the old row and adds a new row. An exclusion constraint stops overlapping rows for one client and tracker. No plan dates, no revisions, no E6.
- Tracker templates use the shared `templates` table with `domain = 'trackers'`, content `{items: [{tracker_id, timing, weekday}]}`. The coach can apply a template to a client (adds and ends assignments to match it).
- `businesses.default_tracker_template_id`. When a client's FIRST coaching term starts (invite acceptance or coach starting coaching), copy the default template into assignments in the same transaction. A seeded default template contains weekly Reflection.

**Records — `tracker_entries`**: shared record fields; tracker; value shaped by the tracker kind (number stored in the base unit + entered unit; rating; yes/no; text); photos and documents through `tracker_entry_attachments` (`entry_id`, `attachment_id`, `position`); `about_session_id` or `about_meal_id` (at most one, check constraint; the linked record must belong to the same client and business); `deleted_at`; `request_id`. Writes go through `Easy.RecordJournal` with `record_type = 'tracker_entry'`. Coaches can record entries for a client (actor = coach, shown as "Recorded by coach"); only clients record workouts and meals (M17). Extend the `records` view with tracker entries.

**Attachments**: allow PDF (`application/pdf`) in the private client attachment service, with a size limit equal to the current image limit unless a better existing limit applies. Add `captured_on` (optional date) to attachments.

**Requests — `tracker_requests`**: client, tracker, `requested_by`, `requested_at`, `cancelled_at`. "Open" is calculated: not cancelled and no entry of that tracker for the client since `requested_at`, within the current coaching term.

**Soreness and energy after a workout**: slice 1 removed `training_sessions.soreness_rating`. Soreness and energy are now built-in rating trackers. When a client finishes a workout and has an `after_workout` assignment, the finish screen asks those trackers and saves entries with `about_session_id`. Same for `after_meal` in the meal logger with `about_meal_id`.

**Calculated, never stored**
- Trackers due today (Today "To record"): from assignments active today and their timing; a daily/weekly item disappears when an entry exists for the day or the day ends; nothing is ever "late". Prompts show only on a date a coaching term covers.
- Coverage: "Energy after 3 of 4 workouts" = distinct completed sessions in a range with a linked entry, counting only sessions while the tracker was assigned.
- Tracker metrics for one client and tracker: latest, change since a previous date, min, max, average, series for a chart. For photo trackers, latest vs previous and a switch to the first.

**Coach app**
- Tracker library: built-ins and custom trackers, create, archive/restore, delete when unused.
- A client's tracker list: add, change timing (new row), remove (ends the row), apply a template; business settings: default tracker template.
- Record an entry for the client (coach-recorded).
- Request a tracker; see open requests ("Waiting on client since <date>"); cancel.
- Client page: tracker entries and charts (weight trend), photo comparison, report attachments (view/download), and coverage for event trackers.

**Client app**
- Today: "To record" list and "Your coach asked for" requests; record number (in the client's unit system), rating, yes/no, text, photo(s), document (PDF or images, ordered).
- "Add something else": record any library tracker that is not on the list.
- After-workout and after-meal prompts.
- Tracker history with trends.
- Native local notifications are out of scope.

**Out of scope:** reviews, focus, review frequency, occurrence exceptions, tracker goals/targets, composite values, device imports, AI parsing of reports.

## How to work

- Backend: use the `elixir-production` skills (elixir-production plugin). Public context functions take `%Ctx{}` first. Typed routes and `EasyWeb.Types`; run `rtk just gen-api` after API changes.
- Frontend: keep code quality as high as it is now; match the patterns slices 1 and 2 used (builders, drafts, `request_id` retries, TanStack Query conventions). Follow the `AGENTS.md` files.
- Tests for Part 2: kind/unit/scale fixed at creation; archive vs delete; assignment rows and the exclusion constraint; default template copied only at the first coaching start; entries through the journal (added/changed/removed, coach actor); link validation (same client); due-today rules and coaching-term gating; request open/closed; coverage counting distinct sessions only while assigned; unit conversion; PDF upload validation.
- Where the docs are silent, choose the simplest option that fits the decisions and list it in your report. Do not reopen frozen decisions.
- Dev servers may be running on :4000, :2022, :1315. Restart if needed.

## Verification (all must pass)

- `rtk mix precommit` in `backend/` — report the test count before and after Part 1.
- `rtk just gen-api`.
- `rtk pnpm -C frontend/apps/coachapp build` and `rtk pnpm -C frontend/apps/clientapp build`.
- `rtk pnpm -C frontend lint:ci`.
- The slice-1 training and slice-2 nutrition browser flows still pass.
- A new Playwright flow (OTP `123456`): a newly invited client accepts and gets the default Reflection assignment; coach adds weight (daily), energy (after workout) and a yes/no habit (daily), and requests a blood report; client records weight in lb with an imperial unit system, answers the habit, finishes a workout and answers energy, uploads a two-page report (a PDF and an image) for the request; coach records a waist measurement; coach sees the weight trend in kg/lb correctly, energy coverage "1 of 1 workouts", the request closed by the report, and the coach-recorded label. Coach at 1280px and 375px, client at 375px. Screenshots in `.scratch/core-domains/build/s3-screens/`.

## Report

Write `.scratch/core-domains/build/s3-report.md`: Part 1 coverage added (areas, test count before/after, any bugs found), what changed for Trackers (backend, contract, coachapp, clientapp), choices where docs were silent, anything not done, verification results. End your final message with a short summary.
