You are implementing the first slice of a data-model redesign in this repository: the shared foundation plus the Training domain, end to end (backend, API contract, coach app, client app). Work in this working tree on the branch `codex/core-domains`. Do not create another branch or worktree. Do not commit and do not push; leave all changes in the working tree for the owner to review.

## Context

This is a fitness-coaching product: Elixir/Phoenix + Postgres backend in `backend/`, React apps in `frontend/apps/coachapp` (coach) and `frontend/apps/clientapp` (client). Do not touch `frontend/apps/clientapp-v2`; it is unmaintained.

The owner spent several days designing a new core model for Training, Nutrition and Trackers. The design is frozen. Read these files fully before you start; they are the source of truth:

1. `.scratch/core-domains/decisions.md` — the frozen decisions (M1–M18, P1–P4). Start here.
2. `.scratch/core-domains/overview.md` — the full model for all domains.
3. `.scratch/core-domains/training.md` — the training model in Postgres: DDL, JSON content shape, write protocol, queries. Follow it closely.
4. `.scratch/coaching-terms/spec.md` — coaching terms and the plan-coverage rule E6 (already implemented; keep it working).
5. `AGENTS.md`, `CONTEXT.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`, and the app `AGENTS.md` files — the repository's contracts.

Background reading if you need facts about today's code: `.scratch/core-domains/training-report.md` and `shared-report.md`.

The design standard is Rich Hickey's "Simple Made Easy": separate identity, value and time; published values never change; one fact in one place; calculate states instead of storing them; no braiding of unrelated concerns. Prefer deleting code to adapting it. No compatibility shims, dead fields, or "just in case" code.

This is a prototype with no real users. Discard old training data freely. You may rewrite the prototype migrations from a clean baseline, and you may reset the local development and test databases. Re-run the seeds afterwards (`mix run priv/repo/seeds.exs`) so the dev database has the exercise and food library again.

## Scope of this slice

Build these, exactly as `training.md` describes:

**Shared foundation (used later by nutrition and trackers):**
- `templates`, `plans`, `plan_revisions` (shared tables with `domain`). In this slice only the `training` domain uses them. Nutrition stays on its current tables until the next slice; do not break it.
- The `forbid_update` trigger on `plan_revisions` and `record_changes`.
- `clients.last_change_seq` and the `record_changes` journal, with ONE helper module that every record write goes through (lock the client row, increment `last_change_seq`, write the record rows and the `record_changes` rows in one transaction). Training session and set writes use it in this slice.
- The `plan_covers(plan_id, date)` SQL function (coaching terms + E6, using `plans.created_local_date`) and `expected_workouts(client_ids, from, to)` SQL function. These are the single place for the coverage and schedule rules. The Elixir `PlanCoverage`/`PlanOverlap` code must use the same rule, not a second copy.
- The `records` view, with only the training part for now (later slices add meals and tracker entries).
- A unit registry in code (kg/lb, m/km/mi, s) used at write time to fill `load_kg` / `distance_m` and the entered unit.

**Training:**
- `exercises` with `measures` + `bodyweight` (replacing `tracking_type`), media via `media_id` only (no `images[]`), no `source` column ("built-in" = `business_id is null`). Keep `mechanics`, `force`, `import_id`. Update the seed: map each old tracking type to `measures` + `bodyweight`, create system `library_media` rows for seeded image URLs (as the food seed already does), and fix the "(Weighted)" exercises so they record added load.
- Training templates and client plans on the shared tables. Content is the JSON document in `training.md` section 4 (workouts → blocks → items → sets; schedule entries with stable ids). Validate it with Ecto embedded schemas. Keep ids stable across revisions.
- Publishing a client plan adds a new immutable revision. Default `effective_on` is today; the coach may choose a future date. A future revision can be withdrawn. Policy P4: when a future revision exists, the builder tells the coach the edit applies until that date. Plan dates change only in the future; archive keeps the past (decision M4).
- Assignment copies the template content into revision 1 (copy only, never linked).
- `training_sessions` and `performed_sets` as in the DDL: prescription used, optional occurrence (`schedule_entry_id` + `occurrence_date`), typed values, `outcome`, `kind`, `deleted_at`, `request_id`. Remove the snapshot, `soreness_rating` (it becomes a Tracker in a later slice; until then it is simply not recorded), and `training_set_requests`.
- Expected vs done: an API that returns the client's expected workout occurrences for a date range (via `expected_workouts`) with the completed session that fulfils each one.
- PRs: an API that returns, for one client and one exercise, the best load per rep count (policy P2) and the set history.

**Coach app (`frontend/apps/coachapp`):**
- Training builder for templates and client plans on the new content shape: blocks (straight, superset, circuit), sets with typed reps (exact, range, AMRAP), load with unit, RPE, RIR, tempo, duration, distance, rest; schedule entries per weekday (zero or more workouts per day). Save the whole document in ONE request (this fixes the existing two-request partial save).
- Publish with "from today" or a future date; show and withdraw a scheduled revision; show the P4 notice.
- Assign a template to a client.
- Client page: the week's expected workouts with done / not recorded / extra, session detail (prescribed vs performed by set), and an exercise PR view.

**Client app (`frontend/apps/clientapp`):**
- Today: today's expected workouts from occurrences. Starting a workout from an occurrence records that occurrence; starting any other plan workout records no occurrence; free workouts still work. If a workout for an earlier date is not done, the client can pick that occurrence (the system must not guess).
- Session recording on the new shape: one row per prescribed set with its `set_id`, extra sets, done/failed/skipped, units from the client's `unit_system` (stored in base units, shown as entered).
- Keep the existing offline-safe drafts and retry behaviour (`request_id`) working.

**Out of scope for this slice:** nutrition, trackers, reviews, occurrence exceptions (move/skip/cancel), multi-week cycles (`cycle_weeks` stays 1), linked templates, add-on programs.

## How to work

- Backend: use the `elixir-production` skills (from the elixir-production plugin) for all backend work: production-quality Elixir, test design, cognitive complexity, and precommit. Public context functions take `%Ctx{}` first. The FE↔BE contract is typed routes and `EasyWeb.Types` under `backend/lib/easy_web/`; after API changes run `rtk just gen-api`.
- Frontend: keep the code quality as high as it is now. Match the surrounding patterns, components, naming and data-fetching conventions (TanStack Query, `keys.ts`, hook-free command modules where the builders use them). Follow `frontend/AGENTS.md` and each app's `AGENTS.md`.
- Write tests for the rules that matter: revision immutability and "revision in force", plan dates only in the future, E6 with `created_local_date`, `expected_workouts`, occurrence fulfilment counted once, the `record_changes` protocol (including that a concurrent write cannot be missed by a reader holding `last_change_seq`), PRs, unit conversion.
- If the design documents are silent on a detail, choose the simplest option that fits the decisions, and list it in your report. Do not reopen frozen decisions.
- Dev servers may already be running (backend on :4000, coach app on :2022, client app on :1315). Restart them if you need to.

## Verification (all must pass before you finish)

- `rtk mix precommit` in `backend/`.
- `rtk just gen-api`.
- `rtk pnpm -C frontend/apps/coachapp build` and `rtk pnpm -C frontend/apps/clientapp build`.
- `rtk pnpm -C frontend lint:ci`.
- Playwright against the running apps (dev login OTP `123456`): coach builds a template with a superset and typed sets, assigns it to a client with an active coaching term, publishes a change from today and schedules one for a future date, withdraws it; client sees today's workout, records it with one skipped set and one extra set; client completes an earlier date's occurrence on a later day; coach sees expected vs done for the week and the exercise PR. Coach at 1280px and 375px, client at 375px. Save screenshots under `.scratch/core-domains/build/s1-screens/`.

## Report

Write `.scratch/core-domains/build/s1-report.md`: what changed (backend, contract, coachapp, clientapp), every choice you made where the docs were silent, anything you could not do, and the verification commands with their results. End your final message with a short summary of that report.
