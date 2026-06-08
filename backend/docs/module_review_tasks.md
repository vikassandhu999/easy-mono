# Module Review Tasks

End-to-end walkthrough of every module. **One checkbox = one sitting.** Each task is scoped to a single file or single concern so you can pick it up cold, finish it, and tick it off without losing the thread.

## How to use this

1. Pick the next unchecked box. Don't skim ahead.
2. Open **only** the files listed in that task.
3. Answer the **Decide** question at the end with: ✅ keep / ✏️ change (and write the change) / ❓ defer.
4. Tick the box, commit, close the file, move on.

If a task starts feeling bigger than "one sitting," split it in half right here in this doc before continuing. That's the rule.

**Cross-cutting reference (open in a side tab while reviewing):**
- `AGENTS.md` — coding standards (tenant isolation, fat schema, no `String.to_atom`, etc.)
- `docs/api_contract.yaml` — source of truth for frontend ↔ backend
- `docs/api_contract_rules.md` — when/how to edit the contract

---

## Phase 0 — Set up the review (do this first, ~10 min)

- [ ] **0.1** Run `mix precommit`. If it's not green, stop and fix before reviewing anything else. *Decide:* green ✅ / fix list ✏️.
- [ ] **0.2** Open `docs/api_contract.yaml` and search for `paths:`. Skim the endpoint names only — no bodies. Get a mental map of what exists. *Decide:* any endpoint name surprises you? Note them at the bottom of this doc under "Surprises."
- [ ] **0.3** Open `lib/easy_web/router.ex`. Confirm every scope (`/v1/auth`, `/v1/businesses`, `/v1/coach`, `/v1/client`, `/v1/public`) makes sense. *Decide:* any route that shouldn't exist or is missing?
- [ ] **0.4** Decide review order. Default order below goes smallest → largest. *Decide:* keep order ✅ / re-order ✏️.

**Default order:** Identity → Orgs → Storefront → Fitness (Weight) → Nutrition → Training.

---

## Phase 1 — Identity & Auth

Foundation. Every other module depends on `current_user` / `business_id` from here.

### Backend

- [ ] **1.1** Read `lib/easy/identity/user.ex`. Confirm: fields, role enum, changesets are operation-specific (no generic `changeset/2`). *Decide:* schema matches your mental model? ✅/✏️
- [ ] **1.2** Read `lib/easy/identity/user_session.ex` + `lib/easy/identity/user_sessions.ex`. Understand how a session is created and looked up. *Decide:* is session lifecycle clear?
- [ ] **1.3** Read `lib/easy/identity/one_time_token.ex` + `one_time_tokens.ex`. Note: dev bypass OTP "123456". *Decide:* OTP flow makes sense?
- [ ] **1.4** Read `lib/easy/identity/signup.ex`. Trace: email in → user out. *Decide:* signup flow correct?
- [ ] **1.5** Read `lib/easy/identity/invitations.ex`. Trace: coach invites client → token email → accept. *Decide:* matches what you want UX-wise?
- [ ] **1.6** Read `lib/easy/identity/auth_tokens.ex` + `token.ex`. JWT issuance + refresh. *Decide:* token lifetimes (access/refresh) correct for your product?
- [ ] **1.7** Read `lib/easy/identity/identity.ex` (top-level facade). *Decide:* the public surface is what controllers should call? Anything leak?
- [ ] **1.8** Read `lib/easy_web/plugs/` — every plug. *Decide:* auth/role plugs cover all routes correctly?
- [ ] **1.9** Read `lib/easy_web/controllers/auth_controller.ex`. Confirm: no business logic, only calls `Identity.*`. *Decide:* ✅/✏️.
- [ ] **1.10** Read `lib/easy_web/controllers/params/signup.ex`. *Decide:* param schema covers what frontend sends?

### Contract / Frontend

- [ ] **1.11** In `docs/api_contract.yaml`, find all `/v1/auth/*` endpoints. Confirm request/response shapes match the controller. *Decide:* contract in sync? ✅/✏️
- [ ] **1.12** **Frontend:** open the frontend repo's auth client (login, signup, accept-invite screens). Does it call the same endpoints with the same field names? *Decide:* matches ✅ / list mismatches ✏️.
- [ ] **1.13** **Frontend:** does the frontend store/refresh tokens the way the backend expects (refresh endpoint, expiry handling)? *Decide:* ✅/✏️.

### Tests

- [ ] **1.14** Run `mix test test/easy/identity/`. *Decide:* all green ✅ / failures ✏️.
- [ ] **1.15** Skim test names only (`mix test test/easy/identity/ --trace`). Any obvious gap (e.g., no test for expired token)? *Decide:* add gaps to "Follow-ups" below.

**Module 1 done when:** every box above is ticked and "Surprises/Follow-ups" updated.

---

## Phase 2 — Orgs (Business + Coach)

Small module. Should be a quick win.

### Backend

- [ ] **2.1** Read `lib/easy/orgs/business.ex`. *Decide:* fields + changesets correct?
- [ ] **2.2** Read `lib/easy/orgs/businesses.ex`. *Decide:* public surface clean? (no Repo leaks, queries composable)
- [ ] **2.3** Read `lib/easy/orgs/coach.ex` + `coaches.ex`. *Decide:* ✅/✏️.
- [ ] **2.4** Read `lib/easy/orgs/orgs.ex` (facade). *Decide:* anything missing or extra?
- [ ] **2.5** Read `lib/easy_web/controllers/business_controller.ex` + `business_json.ex`. *Decide:* thin controller, no business logic?
- [ ] **2.6** Read `lib/easy_web/controllers/coaches/profile_controller.ex` + `profile_json.ex`. *Decide:* ✅/✏️.
- [ ] **2.7** Read `lib/easy_web/controllers/coaches/client_controller.ex` + `client_json.ex`. Largest in this phase. *Decide:* every action is a call to schema/service? ✅/✏️.

### Contract / Frontend

- [ ] **2.8** Contract check: `/v1/businesses/*` and `/v1/coach/me`, `/v1/coach/clients/*`. *Decide:* in sync?
- [ ] **2.9** **Frontend:** coach onboarding screen — does it call `POST /v1/businesses` then `GET /v1/coach/me` correctly? *Decide:* ✅/✏️.
- [ ] **2.10** **Frontend:** client list + invite + edit + delete screens — all wired to coach endpoints? *Decide:* ✅/✏️.

### Tests

- [ ] **2.11** Run `mix test test/easy/orgs/ test/easy_web/controllers/business_controller_test.exs test/easy_web/controllers/coaches/client_controller_test.exs`. *Decide:* green?

---

## Phase 3 — Storefront

Isolated, low-risk. Good momentum builder.

### Backend

- [ ] **3.1** Read `lib/easy/storefront/store_profile.ex`. *Decide:* slug logic + fields ok?
- [ ] **3.2** Read `lib/easy/storefront/offer.ex`. *Decide:* ✅/✏️.
- [ ] **3.3** Read `lib/easy/storefront/testimonial.ex`. *Decide:* ✅/✏️.
- [ ] **3.4** Read `lib/easy/storefront/lead.ex`. *Decide:* inquiry capture flow correct?
- [ ] **3.5** Read `lib/easy_web/controllers/coaches/store_profile_controller.ex` + json. *Decide:* ✅/✏️.
- [ ] **3.6** Read `lib/easy_web/controllers/coaches/offer_controller.ex` + json. *Decide:* ✅/✏️.
- [ ] **3.7** Read `lib/easy_web/controllers/coaches/testimonial_controller.ex` + json. *Decide:* ✅/✏️.
- [ ] **3.8** Read `lib/easy_web/controllers/public/storefront_controller.ex` + json. **Public — no auth.** Confirm no data leaks beyond what's intended. *Decide:* ✅/✏️.

### Contract / Frontend

- [ ] **3.9** Contract check: `/v1/coach/storefront/*`, `/v1/coach/offers/*`, `/v1/coach/testimonials/*`, `/v1/public/coaches/:slug/*`. *Decide:* in sync?
- [ ] **3.10** **Frontend (coach):** storefront editor — profile, offers, testimonials CRUD. *Decide:* wired correctly?
- [ ] **3.11** **Frontend (public marketing page):** coach landing page renders from `GET /v1/public/coaches/:slug/profile`. Inquiry form posts. *Decide:* ✅/✏️.

### Tests

- [ ] **3.12** Run `mix test` filtered to storefront paths. *Decide:* green?

---

## Phase 4 — Fitness (Weight Tracker)

One entity, one feature. Spec already exists: `docs/specs/ux-spec-weight-tracker-2026-04-22.md`. Handover: `docs/handovers/2026-04-22-weight-tracker-handover.md`.

### Backend

- [ ] **4.1** Read `lib/easy/fitness/weight_entry.ex`. Confirm upsert-by-`(client_id, date)`, decimal value, unit enum. *Decide:* ✅/✏️.
- [ ] **4.2** Read `lib/easy_web/controllers/clients/weight_entry_controller.ex` + json. *Decide:* upsert semantics enforced?
- [ ] **4.3** Read `lib/easy_web/controllers/coaches/client_weight_entry_controller.ex` + json. Confirm `adherence` is computed and returned. *Decide:* ✅/✏️.
- [ ] **4.4** Check: is `goal_weight_value` / `goal_weight_unit` on `Easy.Orgs.Client` (or wherever clients live)? Coach can set, client cannot. *Decide:* ✅/✏️.

### Contract / Frontend

- [ ] **4.5** Contract check: `/v1/client/weight_entries/*`, `/v1/coach/clients/:id/weight_entries`. Match handover doc. *Decide:* in sync?
- [ ] **4.6** **Frontend (client):** Progress → Weight tab. Log/edit/delete entry. Range filter (30d/90d/all) is client-side. *Decide:* matches handover?
- [ ] **4.7** **Frontend (coach):** client detail → Weight section. Trend + adherence + goal editor. *Decide:* ✅/✏️.

### Tests

- [ ] **4.8** Run `mix test test/easy/fitness/ test/easy_web/controllers/clients/weight_entry_controller_test.exs test/easy_web/controllers/coaches/client_weight_entry_controller_test.exs`. *Decide:* green?

---

## Phase 5 — Nutrition

Bigger module: Food → Recipe → Plan/Meal/PlanItem → Logging. Do **one sub-phase per sitting.**

### 5a. Food (catalog primitive)

- [ ] **5.1** Read `lib/easy/nutrition/food.ex`. *Decide:* fields + changesets ok?
- [ ] **5.2** Read `lib/easy/nutrition/serving_size.ex`. Tiny embed. *Decide:* ✅/✏️.
- [ ] **5.3** Read `lib/easy_web/controllers/coaches/food_controller.ex` + json. *Decide:* CRUD clean?
- [ ] **5.4** Read `lib/easy_web/controllers/clients/food_controller.ex` + json. Read-only. *Decide:* ✅/✏️.
- [ ] **5.5** Contract check `/v1/coach/foods/*`, `/v1/client/foods/*`. *Decide:* in sync?
- [ ] **5.6** **Frontend:** food picker / food CRUD. *Decide:* wired?

### 5b. Recipe

- [ ] **5.7** Read `lib/easy/nutrition/recipe.ex` + `recipe_ingredient.ex`. *Decide:* nested ingredients handled cleanly?
- [ ] **5.8** Read `lib/easy/nutrition/macro_calc.ex`. Understand the formula. *Decide:* correct?
- [ ] **5.9** Read `lib/easy_web/controllers/coaches/recipe_controller.ex` + json. *Decide:* ✅/✏️.
- [ ] **5.10** Read `lib/easy_web/controllers/clients/recipe_controller.ex`. Read-only. *Decide:* ✅/✏️.
- [ ] **5.11** Contract check `/v1/coach/recipes/*`, `/v1/client/recipes/*`. *Decide:* ✅/✏️.
- [ ] **5.12** **Frontend:** recipe editor + viewer. *Decide:* matches?

### 5c. Nutrition Plan + Meal + PlanItem (structure)

- [ ] **5.13** Read `lib/easy/nutrition/plan.ex`. *Decide:* schema correct?
- [ ] **5.14** Read `lib/easy/nutrition/meal.ex` + `meal_item.ex`. *Decide:* ✅/✏️.
- [ ] **5.15** Read `lib/easy/nutrition/plan_item.ex`. *Decide:* relationship to plan/meal clear?
- [ ] **5.16** Read `lib/easy/nutrition/plans.ex` (service: assign, duplicate, copy-day, shopping-list, macros). This is the biggest one — read it twice if needed. *Decide:* each cross-schema workflow justified as a service vs. schema?
- [ ] **5.17** Read `lib/easy/nutrition/reads.ex`. *Decide:* read queries clean + composable?
- [ ] **5.18** Read `lib/easy_web/controllers/coaches/nutrition_plan_controller.ex` + json. *Decide:* ✅/✏️.
- [ ] **5.19** Read `lib/easy_web/controllers/coaches/meal_controller.ex` + `plan_item_controller.ex` + `meal_item_controller.ex` (+ jsons). *Decide:* all thin?
- [ ] **5.20** Read `lib/easy_web/controllers/clients/nutrition_plan_controller.ex` + json. Read-only + `today`. *Decide:* ✅/✏️.
- [ ] **5.21** Contract check all `/v1/coach/nutrition_plans/*`, `/v1/coach/meals/*`, `/v1/coach/plan_items/*`, `/v1/coach/meal_items/*`, `/v1/client/nutrition_plans/*`. *Decide:* in sync?
- [ ] **5.22** **Frontend (coach):** plan builder UI — create plan, add meals/days, plan items, duplicate, copy-day, shopping-list, macros view. Walk each one. *Decide:* matches?
- [ ] **5.23** **Frontend (client):** today's plan view + plan list/detail. *Decide:* ✅/✏️.

### 5d. Meal Logging (client-facing)

- [ ] **5.24** Read `lib/easy/nutrition/food_log_entry.ex`. *Decide:* schema ok?
- [ ] **5.25** Read `lib/easy/nutrition/meal_log.ex`. *Decide:* ✅/✏️.
- [ ] **5.26** Read `lib/easy/nutrition/meal_logging.ex` (service — `log_meal`, `log_day`). *Decide:* idempotency + tenant rules respected?
- [ ] **5.27** Read `lib/easy_web/controllers/clients/food_log_entry_controller.ex` + `meal_log_controller.ex` (+ jsons). *Decide:* ✅/✏️.
- [ ] **5.28** Read `lib/easy_web/controllers/coaches/meal_log_controller.ex` + `food_log_entry_controller.ex` (+ json). Coach can view + delete. *Decide:* ✅/✏️.
- [ ] **5.29** Contract check `/v1/client/food_log_entries/*`, `/v1/client/meal_logs/*`, `/v1/coach/meal_logs/*`, `/v1/coach/food_log_entries/:id`. *Decide:* in sync?
- [ ] **5.30** **Frontend (client):** log food, log meal, log day, daily summary. *Decide:* matches?
- [ ] **5.31** **Frontend (coach):** view client meal logs + summary, delete bad entries. *Decide:* ✅/✏️.

### Tests

- [ ] **5.32** Run `mix test test/easy/nutrition/`. *Decide:* green?
- [ ] **5.33** Run nutrition controller tests. *Decide:* green?

---

## Phase 6 — Training

Biggest module: Exercise → Plan/Workout/Item/Element → Session/PerformedSet. Spec: `docs/specs/training-plan-redesign-2026-04-21.md`. Handover: `docs/handovers/2026-04-21-training-plan-redesign-handover.md` + addendum. **One sub-phase per sitting.**

### 6a. Catalog: Exercise, Muscle, Equipment

- [ ] **6.1** Read `lib/easy/training/muscle.ex` + `equipment.ex`. Tiny lookup tables. *Decide:* ✅/✏️.
- [ ] **6.2** Read `lib/easy/training/exercise.ex`. *Decide:* fields + changesets ok?
- [ ] **6.3** Read `lib/easy/training/exercise_muscle.ex` + `exercise_equipment.ex`. Join tables. *Decide:* ✅/✏️.
- [ ] **6.4** Read `lib/easy/training/exercise_reads.ex`. Query composables. *Decide:* composable, no `Repo` inside?
- [ ] **6.5** Read `lib/easy_web/controllers/coaches/exercise_controller.ex` + json + `muscle_controller.ex` + `equipment_controller.ex` (+ jsons). *Decide:* ✅/✏️.
- [ ] **6.6** Read `lib/easy_web/controllers/clients/exercise_controller.ex` + json. Read-only. *Decide:* ✅/✏️.
- [ ] **6.7** Contract check `/v1/coach/exercises/*`, `/v1/coach/muscles`, `/v1/coach/equipment`, `/v1/client/exercises/*`. *Decide:* in sync?
- [ ] **6.8** **Frontend:** exercise library (coach CRUD + duplicate, client browse). *Decide:* matches?

### 6b. Plan Structure: TrainingPlan, Workout, PlanItem, WorkoutElement, PlannedSet

- [ ] **6.9** Read `lib/easy/training/training_plan.ex`. *Decide:* ✅/✏️.
- [ ] **6.10** Read `lib/easy/training/workout.ex`. *Decide:* ✅/✏️.
- [ ] **6.11** Read `lib/easy/training/plan_item.ex`. *Decide:* relationship plan↔workout clear?
- [ ] **6.12** Read `lib/easy/training/workout_element.ex`. *Decide:* ✅/✏️.
- [ ] **6.13** Read `lib/easy/training/planned_set.ex`. *Decide:* ✅/✏️.
- [ ] **6.14** Read `lib/easy/training/plan_reads.ex` + `workout_reads.ex`. *Decide:* composable queries clean?
- [ ] **6.15** Re-read `docs/handovers/2026-04-21-training-plan-redesign-review-addendum.md`. *Decide:* every addendum item addressed in code?
- [ ] **6.16** Read coach controllers: `training_plan_controller.ex`, `workout_controller.ex`, `training_plan_item_controller.ex`, `workout_element_controller.ex` (+ jsons). *Decide:* thin?
- [ ] **6.17** Read client controllers: `training_plan_controller.ex` (read-only) + json. *Decide:* ✅/✏️.
- [ ] **6.18** Contract check `/v1/coach/training_plans/*`, `/v1/coach/workouts/*`, `/v1/coach/training_plan_items/*`, `/v1/coach/workout_elements/*`, `/v1/client/training_plans/*`. *Decide:* in sync?
- [ ] **6.19** **Frontend (coach):** plan builder — create plan, add workouts, add elements + planned sets, duplicate plan/workout, assign. *Decide:* matches?
- [ ] **6.20** **Frontend (client):** view assigned training plans + workout detail. *Decide:* ✅/✏️.

### 6c. Execution: WorkoutSession, PerformedSet

- [ ] **6.21** Read `lib/easy/training/workout_session.ex`. State machine (active/completed/discarded). *Decide:* transitions clean?
- [ ] **6.22** Read `lib/easy/training/performed_set.ex`. *Decide:* ✅/✏️.
- [ ] **6.23** Read `lib/easy/training/session_reads.ex`. *Decide:* composable?
- [ ] **6.24** Read client controllers: `workout_session_controller.ex` + `performed_set_controller.ex` (+ jsons). Confirm "active" endpoint + complete/discard semantics. *Decide:* ✅/✏️.
- [ ] **6.25** Read coach controllers: `workout_session_controller.ex` + `performed_set_controller.ex` (+ jsons). Coach can view + manage sessions on behalf of client? Confirm intended behavior. *Decide:* ✅/✏️.
- [ ] **6.26** Read `lib/easy/tracking/policies/` (whatever lives there). *Decide:* authorization rules correct for sessions?
- [ ] **6.27** Contract check `/v1/coach/workout_sessions/*`, `/v1/coach/performed_sets/*`, `/v1/client/workout_sessions/*`, `/v1/client/performed_sets/*`. *Decide:* in sync?
- [ ] **6.28** **Frontend (client):** start session → log sets → complete/discard. *Decide:* matches?
- [ ] **6.29** **Frontend (coach):** review client sessions, edit sets if needed. *Decide:* ✅/✏️.

### Tests

- [ ] **6.30** Run `mix test test/easy/training/`. *Decide:* green?
- [ ] **6.31** Run training controller tests. *Decide:* green?

---

## Phase 7 — Cross-cutting sweep

Quick passes across the whole codebase. Each is ~10 minutes.

- [ ] **7.1** `rg "String.to_atom" lib/`. Must be empty (or only safe usages). *Decide:* clean?
- [ ] **7.2** `rg "Repo\." lib/easy_web/`. Must be empty — no `Repo` in controllers. *Decide:* clean?
- [ ] **7.3** `rg "HTTPoison|Tesla|:httpc" lib/`. Must be empty — `Req` only. *Decide:* clean?
- [ ] **7.4** `rg "@moduledoc|@doc" lib/`. Must be empty per AGENTS.md. *Decide:* remove any found?
- [ ] **7.5** `rg "cast\(.*business_id" lib/easy/`. business_id must never be in `cast/3`. *Decide:* clean?
- [ ] **7.6** `rg "cast\(.*user_id" lib/easy/`. Same rule. *Decide:* clean?
- [ ] **7.7** `rg "def [a-z]" lib/easy/ | wc -l` vs `rg "@spec" lib/easy/ | wc -l`. Public funcs roughly covered by `@spec`? *Decide:* good enough / list gaps.
- [ ] **7.8** Open `docs/api_contract.yaml` and search for endpoints not yet wired to a controller (orphans). *Decide:* delete orphans or wire them.
- [ ] **7.9** Run `mix precommit` one final time. *Decide:* green ✅.

---

## Surprises

(Things you notice during review that don't fit a checkbox. Drop a one-liner here so you don't forget.)

- 

---

## Follow-ups

(Decisions deferred or work to schedule next. One line each, with the task number that uncovered it.)

- 
