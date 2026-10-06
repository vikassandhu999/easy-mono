You are implementing the second slice of a data-model redesign in this repository: the Nutrition domain, end to end (backend, API contract, coach app, client app), on the shared foundation that slice 1 built. Work in this working tree on the branch `codex/core-domains`. Do not create another branch or worktree. Do not commit and do not push.

## Context

Fitness-coaching product: Elixir/Phoenix + Postgres backend in `backend/`, React apps in `frontend/apps/coachapp` and `frontend/apps/clientapp`. Do not touch `frontend/apps/clientapp-v2`.

Read these first; they are the source of truth:
1. `.scratch/core-domains/decisions.md` — frozen decisions (M1–M18, P1–P4).
2. `.scratch/core-domains/overview.md` — the full model. Sections 3 (foods, recipes), 4 (plans, nutrition content), 6 (records), 7 (history), 9–10 (calculated values, policies), 13 (bugs).
3. `.scratch/core-domains/training.md` — the Postgres conventions, write protocol and queries that slice 1 implemented. Nutrition follows the same patterns.
4. `.scratch/core-domains/build/s1-report.md` — what slice 1 actually built and the choices it made. Reuse its shared pieces; do not build a second version of any of them.
5. `.scratch/core-domains/nutrition-report.md` — facts about today's nutrition code.
6. `AGENTS.md`, `CONTEXT.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`, and the app `AGENTS.md` files.

The design standard is Rich Hickey's "Simple Made Easy": separate identity, value and time; published values never change; one fact in one place; calculate states; no braiding of unrelated concerns. Prefer deleting code to adapting it. No compatibility shims or dead fields. This is a prototype with no real users: you may rewrite prototype migrations and reset the dev and test databases. Re-run the seeds afterwards.

## Part 1: fix three things in the slice-1 foundation first

`backend/lib/easy/record_journal.ex` has three problems. Fix them before you build on it:

1. **It checks the coaching term.** "A client may write only on a date a coaching term covers" is already enforced once, by the HTTP write gate (`RequireCoaching`). A second copy in the journal braids "record history" with "write eligibility", and it will block coach-recorded Tracker entries in the next slice. Remove the term check from the journal; keep the single gate where it is.
2. **The actor is hard-coded.** `changed_by_type` is always `"client"` and `changed_by_id` is `ctx.user_id`. Take the actor from `%Ctx{}`: a client write records `client` + the client id; a coach write records `coach` + the coach id. Use the same rule for the records' `recorded_by_type` / `recorded_by_id`, so both say the same thing.
3. **It increments the sequence and then resets it when nothing changed.** Run the operation under the client lock first; increment `last_change_seq` and insert the journal rows only if there are changes. The lock is held for the whole transaction, so the order is safe.

Also: the shared `templates` and `plan_revisions` schemas live under `Easy.Training`. Nutrition now uses them too, so move the shared plan schemas and functions (templates, plans, revisions, revision-in-force, publish, withdraw, assign/copy, archive, date rules) to one shared module namespace, with the domain-specific content validated by a per-domain module (decision: domain registry, overview section 8). Training must keep working unchanged after the move.

## Part 2: Nutrition

Build these as `overview.md` describes:

**Library**
- `foods`: nutrients per 100 g as a map keyed by nutrient code (`energy_kcal`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`, `sugar_g`, …), where an absent key means unknown and is never 0. A nutrient registry in code defines the codes and units. `servings` as `[{id, label, grams}]` with stable ids (a serving is no longer identified by its text). Keep a default serving if the current UI needs one. Archive instead of delete when something uses a food.
- `recipes`: `ingredients` as JSON inside the recipe (`[{food_id, portion}]`), `servings_count`, `cooked_weight_g`; drop the `nutrition_recipe_ingredients` table. Archive instead of delete when used.
- Fix the food seed: a missing or non-numeric source value must stay unknown, not become 0 (bug 7). Sugar must be seeded where the source has it.

**Plans** (on the shared tables, `domain = 'nutrition'`)
- Content shape from overview section 4: `targets` as `{nutrient_code: {min, max}}` (exact = min equals max; "at least" = only min); `meals[]` with `items[]`; each item has a tagged `source` (`{type: food | recipe, id}`), a tagged `portion` (`{type: grams, grams}` | `{type: serving, serving_id, amount}`), and the copied `name`, `grams` and `nutrients` (decision M5: copied at publish and at assignment, so later library edits do not change a published prescription); `day_patterns[]` with optional own `targets` (replaces the plan targets whole) and `slots[]` (`{id, name, meal_ids[]}`, any name; the old 11 slot names become suggestions); `schedule` with entries `{id, day, ref: day_pattern_id}`, exactly one entry per day.
- Publish = new immutable revision, now or a future date, withdraw, P4 notice, same as training. One request saves the whole document (bug 6).
- Migrate the existing nutrition plan API and tables onto the shared tables; delete `nutrition_plans`.

**Records**
- `diary_meals` (replaces `nutrition_diary_days` and `nutrition_diary_slots`): shared record fields, `plan_revision_id` + `slot_id` (both empty = a meal not in the plan), `name` (unique per client and date), `chosen_meal_id`, `note_to_coach`, `shared_at`.
- `diary_entries` as rows: `planned_item_id` (empty = extra food), tagged `source` or a quick add (nutrients with no food), tagged `portion`, `grams`, `nutrients` as eaten, `notes`, `deleted_at`, `request_id`. Saving a meal replaces its entries in one transaction through the record journal (`record_type = 'meal'`, row types `meal` and `entry`).
- Extend the `records` view with meals.
- An `expected_meals(client_ids, from, to)` SQL function, the same shape as `expected_workouts`: plan, revision in force, day pattern, slot, date. It must use the same `plan_covers` rule.

**Calculated, never stored**
- Daily totals per nutrient from `diary_entries`. Unknown stays unknown in totals; show how many entries had a value.
- The target for a day comes from the revision in force at the end of that day (policy P1); if the target changed during the day, the API says so.
- Expected vs recorded per slot: a planned slot with no meal is "Not recorded", never "skipped" (bug 1). Remove the calculated calorie adherence band (under/on/over) (bug 2). Show counts, not percentages (decision M18).
- Food metrics for one client: how often each food was eaten in a date range, average grams, nutrients supplied.

**Coach app**
- Nutrition builder on the new content: targets as ranges, per-pattern targets, custom slot names, meals and items with food/recipe and grams or servings, the weekly pattern schedule, publish now or a future date, withdraw, P4 notice, one save request.
- Food and recipe editors on the new library shape (nutrient map with "unknown" clearly different from 0, servings with ids, recipe ingredients).
- Assign a nutrition template to a client.
- Client page: a day view and a week view of expected vs recorded meals and daily totals against the target in force, and the food metrics.

**Client app**
- Today and the meal logger on the new shape: pick the planned option, log planned items, swap a food, add an extra food, quick add (calories and optional macros, no food), notes, note to coach. Keep the existing offline-safe drafts and `request_id` retries.
- Fix bug 3: the library picker shows nutrients for the portion it labels (not per-100 g values labelled as a serving).

**Out of scope:** trackers, reviews, occurrence exceptions, multi-week cycles, water and supplements (they become Trackers in slice 3), fasting days, micronutrient targets in the UI (the map supports them; the UI can show the main five plus fiber and sugar).

## How to work

- Backend: use the `elixir-production` skills (elixir-production plugin) for all backend work. Public context functions take `%Ctx{}` first. The contract is typed routes and `EasyWeb.Types`; run `rtk just gen-api` after API changes.
- Frontend: keep code quality as high as it is now; match the surrounding patterns, components, naming and data-fetching conventions, and the way slice 1 rebuilt the training builder. Follow the `AGENTS.md` files.
- Tests for what matters: the three foundation fixes (actor, no term check in the journal, no sequence bump without changes), copied item numbers survive a food edit, unknown nutrients stay unknown through totals, revision in force at end of day and the "target changed" flag, `expected_meals` with `plan_covers`, meal save through the journal (added/changed/removed entries), quick add, food metrics.
- Where the documents are silent, choose the simplest option that fits the decisions and list it in your report. Do not reopen frozen decisions.
- Dev servers may be running on :4000, :2022 and :1315. Restart them if needed.

## Verification (all must pass)

- `rtk mix precommit` in `backend/`.
- `rtk just gen-api`.
- `rtk pnpm -C frontend/apps/coachapp build` and `rtk pnpm -C frontend/apps/clientapp build`.
- `rtk pnpm -C frontend lint:ci`.
- The slice-1 training browser flow still passes.
- A new Playwright flow against the running apps (OTP `123456`): coach creates a food with an unknown fiber value, builds a nutrition template with a training-day and a rest-day pattern (different targets) and a custom slot name, assigns it, publishes a target change from today; client logs a planned meal, swaps one food, adds an extra food and a quick add; coach edits the food's calories and the client's published plan does not change; coach sees the day and week views with "Not recorded" for an unlogged slot, totals with the unknown fiber shown as unknown, the "target changed" note, and food metrics. Coach at 1280px and 375px, client at 375px. Screenshots in `.scratch/core-domains/build/s2-screens/`.

## Report

Write `.scratch/core-domains/build/s2-report.md`: what changed (foundation fixes, backend, contract, coachapp, clientapp), every choice where the docs were silent, anything not done, and verification results. End your final message with a short summary.
