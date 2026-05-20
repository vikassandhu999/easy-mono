# Module Review — End-to-End Walkthrough

> **How to use this file**
>
> - Pick **one task at a time**. Do not scroll ahead.
> - Each task is sized for ~2–15 minutes. If a task feels too big, stop and split it into a sub-task underneath.
> - When you finish a task, tick the box and write a one-line **outcome** next to it. Outcomes are: ✅ ok / 🔧 needs fix / ❓ undecided / ❌ remove.
> - At the end of each module, write a **"Module verdict"** in 1–2 sentences. That's the only summary you owe yourself.
> - Backend lives at `/Users/vikassandhu/Desktop/10x/easy-backend`. Coach app is `apps/coachapp-v2`. Client app is `apps/clientapp-v2`.
> - Skip a module entirely if you'd rather start with a different one. Order does not matter — but **finish a module before switching**.

---

## Legend

- `[BE]` backend (Elixir/Phoenix — `easy-backend`)
- `[API]` frontend API client (`src/api/*.ts`)
- `[UI]` screen / component
- `[UX]` user-experience decision
- `[DOC]` documentation / ADR
- `[NAV]` routing / navigation

---

## Phase 0 — Spin everything up (one-time, ~15 min)

Do these once so every later task can actually run.

- [ ] **T-000** Start the backend locally and confirm it boots
      Path: `/Users/vikassandhu/Desktop/10x/easy-backend` → run `mix phx.server` (or `./run.sh`)
      Outcome: Note the port. Note any startup errors.
- [ ] **T-001** Start the coach app and log in
      Path: `pnpm dev:coachapp` (port 2021)
      Outcome: ✅ login works / 🔧 something blocks login
- [ ] **T-002** Start the client app and accept an invite
      Path: `pnpm dev:clientapp-v2` (port 1314)
      Outcome: ✅ / 🔧 (note where it breaks)
- [ ] **T-003** Read the architecture ADR top to bottom (1× pass, no edits)
      Path: `apps/coachapp-v2/docs/adr-000-architecture-and-stack.md`
      Outcome: write **one sentence** of anything that surprised you.

---

# COACH APP (`coachapp-v2`)

## Module 1 — Auth & Onboarding

**Goal:** A new coach can sign up, verify, register their business, and log back in.

### Frontend screens

- [ ] **T-100** Read the login screen end-to-end
      Path: `apps/coachapp-v2/src/auth/login.tsx`
      Outcome: anything confusing about field labels, error states, or "next" CTA?
- [ ] **T-101** Read the signup screen
      Path: `apps/coachapp-v2/src/auth/signup.tsx`
      Outcome: same questions as above.
- [ ] **T-102** Read both OTP screens
      Paths: `apps/coachapp-v2/src/auth/verify-login-otp.tsx`, `verify-signup-otp.tsx`
      Outcome: is the "resend code" timer wording clear?
- [ ] **T-103** Read the register-business screen
      Path: `apps/coachapp-v2/src/auth/register-business.tsx`
      Outcome: which business fields are required vs optional? Are any unused on detail pages later?

### Frontend API + state

- [ ] **T-104** Read the auth API client
      Path: `apps/coachapp-v2/src/api/auth.ts`
      Outcome: every endpoint used by a screen? any orphan endpoint?
- [ ] **T-105** Read token refresh + 401 handling
      Path: `apps/coachapp-v2/src/api/base.ts`
      Outcome: trust the refresh logic for production? note edge cases.

### Backend

- [ ] **T-106** Read the auth controller
      Path: `easy-backend/lib/easy_web/controllers/auth_controller.ex`
      Outcome: endpoints match the frontend's `auth.ts`? any unused actions?
- [ ] **T-107** Read the accounts/auth contexts
      Paths: `easy-backend/lib/easy/accounts.ex`, `easy-backend/lib/easy/auth/`
      Outcome: write one line about how the OTP is generated/expired.

### UX decisions

- [ ] **T-108** Decide: do we keep both **email-OTP login** and **password login**, or pick one for MVP?
      Outcome: one sentence + write a note in `apps/coachapp-v2/docs/adr-000-…`.
- [ ] **T-109** Decide: should `register-business` be skippable, or always required after first signup?
      Outcome: confirm against `withAuth` HOC behavior in `apps/coachapp-v2/src/@hoc/with-auth.tsx`.

**Module 1 verdict:** _(fill in 1–2 lines when all the above are ✅)_

---

## Module 2 — App Shell & Navigation

**Goal:** The sidebar (desktop) and bottom nav (mobile) take you everywhere you actually need to go, and nowhere you don't.

- [ ] **T-200** Read the shell
      Path: `apps/coachapp-v2/src/@components/app-shell.tsx`
      Outcome: list every nav item shown. Mark each "keep / hide / rename".
- [ ] **T-201** Cross-check `ROUTES` with `router.tsx`
      Paths: `apps/coachapp-v2/src/@config/routes.ts`, `router.tsx`
      Outcome: any route defined but unreachable from the shell? any shell link without a route?
- [ ] **T-202** Decide: ship MVP with **Storefront hidden** (current state), or unhide?
      Path: `apps/coachapp-v2/src/router.tsx` (search "Storefront hidden for MVP")
      Outcome: 🔒 keep hidden / 🔓 unhide.
- [ ] **T-203** Decide: keep **Dashboard placeholder** in nav, or hide until built?
      Outcome: write one line.
- [ ] **T-204** Walk the app once on **mobile 375px width** (DevTools)
      Outcome: list any place the bottom nav covers content or buttons get cut off.

**Module 2 verdict:**

---

## Module 3 — Clients

**Goal:** A coach can invite a client, see them in the list, open the detail, edit them, add plans, take notes, and see their workout/nutrition adherence.

### Frontend screens

- [ ] **T-300** Read the list screen
      Path: `apps/coachapp-v2/src/clients/list-clients.tsx`
      Outcome: status filter values match the backend enum? empty state copy good?
- [ ] **T-301** Read the invite screen + confirmation
      Path: `apps/coachapp-v2/src/clients/invite-client.tsx`
      Outcome: WhatsApp share message wording — keep as-is or rewrite?
- [ ] **T-302** Read the client detail
      Path: `apps/coachapp-v2/src/clients/client-detail.tsx`
      Outcome: section order still matches ADR-005? any section you'd remove?
- [ ] **T-303** Read the edit screen + shared form
      Paths: `apps/coachapp-v2/src/clients/edit-client.tsx`, `clients/client-form/`
      Outcome: every field maps to a backend field?

### Sub-features inside Clients

- [ ] **T-304** Read `ClientPlans` (nutrition + training combined)
      Path: `apps/coachapp-v2/src/clients/components/` (find the file)
      Outcome: assign-plan flow has zero dead-ends?
- [ ] **T-305** Read `InlineNotes`
      Outcome: autosave or explicit save? matches keyboard rule (`AGENTS.md`)?
- [ ] **T-306** Read `ClientNutritionAdherence`
      Path: `apps/coachapp-v2/src/clients/components/client-nutrition-adherence.tsx`
      Outcome: what "adherence" means here in one line — confirm with backend.
- [ ] **T-307** Read `ClientWorkoutHistory` preview + full page
      Paths: `…/components/client-workout-history.tsx`, `clients/client-workout-history-page.tsx`
      Outcome: "View all" pagination works? load more or paginated?
- [ ] **T-308** Read session detail
      Path: `apps/coachapp-v2/src/clients/session-detail.tsx`
      Outcome: is the data shown useful, or just raw dump?

### API + Backend

- [ ] **T-309** Read the clients API client
      Path: `apps/coachapp-v2/src/api/clients.ts`
      Outcome: every hook used in a screen? any orphan?
- [ ] **T-310** Read the coach clients controller
      Path: `easy-backend/lib/easy_web/controllers/coach/client_controller.ex`
      Outcome: list endpoints + the JSON shapes match `api/clients.ts` types.
- [ ] **T-311** Read the clients context
      Path: `easy-backend/lib/easy/clients.ex` (+ `clients/` folder)
      Outcome: tenant isolation present (`business_id` in every query)? note exceptions.

### UX decisions

- [ ] **T-312** Decide: ship without **client deletion**, or add a hard-delete?
      Outcome: ✅ ship without / 🔧 add it.
- [ ] **T-313** Decide: keep adherence preview on detail page, or move behind a tab?
      Outcome: one line.
- [ ] **T-314** Walk the whole client flow on **mobile** once
      Outcome: list any > 2-tap journey that should be < 2 taps.

**Module 3 verdict:**

---

## Module 4 — Exercises (Library)

- [ ] **T-400** Read list + search + infinite scroll
      Path: `apps/coachapp-v2/src/exercises/list-exercises.tsx`
      Outcome: search debounce feels right? empty state ok?
- [ ] **T-401** Read create + edit + shared form
      Paths: `create-exercise.tsx`, `edit-exercise.tsx`, `exercise-form/`
      Outcome: every form field needed? any field unused by the rest of the app?
- [ ] **T-402** Read the detail screen
      Path: `apps/coachapp-v2/src/exercises/exercise-detail.tsx`
      Outcome: what action is missing here that you'd want as a coach?
- [ ] **T-403** Read the exercises API client
      Path: `apps/coachapp-v2/src/api/exercises.ts`
      Outcome: muscle/equipment endpoints powering the form pickers — covered?
- [ ] **T-404** Read the backend controllers (exercise, muscle, equipment)
      Paths: `easy-backend/lib/easy_web/controllers/coach/{exercise,muscle,equipment}_controller.ex`
      Outcome: list per-business or global? if global, which fields are coach-customizable?
- [ ] **T-405** Decide: support **video URL** on exercises, or skip for MVP?
      Outcome: ✅ skip / 🔧 add.
- [ ] **T-406** Decide: support **image upload** vs URL-only?
      Outcome: one line.

**Module 4 verdict:**

---

## Module 5 — Foods (Library)

- [ ] **T-500** Read list + create + edit + detail
      Paths: `apps/coachapp-v2/src/foods/*.tsx`
      Outcome: macro fields naming consistent everywhere?
- [ ] **T-501** Read `IngredientList` + `FoodPicker`
      Paths: `foods/components/ingredient-list.tsx`, `foods/food-pickers/` (or similar)
      Outcome: picker UX (autocomplete + add-new) — any dead ends?
- [ ] **T-502** Read the foods API client
      Path: `apps/coachapp-v2/src/api/foods.ts`
- [ ] **T-503** Read the backend `ingredient_controller` (this is the foods endpoint)
      Path: `easy-backend/lib/easy_web/controllers/coach/ingredient_controller.ex`
      Outcome: name mismatch (ingredient vs food) — keep, or align names?
- [ ] **T-504** Decide: barcode/scan support — in MVP or v2?
      Outcome: v2.

**Module 5 verdict:**

---

## Module 6 — Recipes (Library)

- [ ] **T-600** Read list / create / edit / detail
      Paths: `apps/coachapp-v2/src/recipes/*.tsx`
- [ ] **T-601** Read recipe form, focusing on ingredients sub-form
      Path: `apps/coachapp-v2/src/recipes/recipe-form/`
      Outcome: portion math correct? edge case — empty ingredients allowed?
- [ ] **T-602** Read recipes API + backend controller
      Paths: `apps/coachapp-v2/src/api/recipes.ts`, `easy-backend/lib/easy_web/controllers/coach/recipe_controller.ex`
- [ ] **T-603** Decide: recipe **scaling** (e.g. 2× portion) — included or deferred?
      Outcome: one line.

**Module 6 verdict:**

---

## Module 7 — Nutrition Plans

> Read **`apps/coachapp-v2/docs/adr-001-nutrition-plan-builder.md`** once before starting these tasks. It is the single most important context for this module.

### Builder

- [ ] **T-700** Read the builder/detail screen
      Path: `apps/coachapp-v2/src/nutrition-plans/nutrition-plan-detail.tsx`
      Outcome: is the day-of-week vs flat-meal model clear from the UI?
- [ ] **T-701** Read `MealSection` + `MealItemRow` + inline edit forms
      Paths: `apps/coachapp-v2/src/nutrition-plans/components/{meal-section,meal-item-row}.tsx`
      Outcome: any place the user gets stuck mid-edit (no save / no cancel)?
- [ ] **T-702** Read `MealItemPicker` + `MealPicker` + `DayPlanner`
      Outcome: copy-from-day vs add-new — both reachable?

### Form + list

- [ ] **T-703** Read list / create / edit
      Paths: `list-nutrition-plans.tsx`, `create-nutrition-plan.tsx`, `edit-nutrition-plan.tsx`
- [ ] **T-704** Read `NutritionPlanPicker` (assigning a template to a client)
      Path: find under `nutrition-plans/components/`
      Outcome: the template→personal copy flow has a confirmation step?

### API + Backend

- [ ] **T-705** Read the nutrition plans API
      Path: `apps/coachapp-v2/src/api/nutritionPlans.ts` (428 lines — read in chunks if needed)
      Outcome: every mutation invalidates the right tag (esp. `LIST` vs `CLIENT_LIST`)?
- [ ] **T-706** Read the meals + meal items API
      Path: `apps/coachapp-v2/src/api/meals.ts`
      Outcome: cache invalidation is consistent with `nutritionPlans.ts`?
- [ ] **T-707** Read the backend controllers
      Paths: `easy-backend/lib/easy_web/controllers/coach/{nutrition_plan,meal,meal_item}_controller.ex`
      Outcome: the "template vs personal" split is enforced server-side (per ADR-000 Discovery #10).
- [ ] **T-708** Read the nutrition context
      Path: `easy-backend/lib/easy/nutrition/` + `nutrition.ex`
      Outcome: one line on how a personal plan is created from a template (clone? reference? snapshot?).

### UX decisions

- [ ] **T-709** Decide: keep **meal mapping by day-of-week**, or simplify to "meal slots"?
      Outcome: 🔒 keep / 🔧 simplify (and note migration cost).
- [ ] **T-710** Decide: should edits to a personal plan ever sync back to the template?
      Outcome: ✅ never (current) / 🔧 add an opt-in flow.
- [ ] **T-711** Walk through "assign nutrition plan to client" once on mobile
      Outcome: count taps from client detail → plan picked → plan visible. Acceptable?

**Module 7 verdict:**

---

## Module 8 — Training Plans

> Read **`apps/coachapp-v2/docs/adr-002-training-plan-builder.md`** before starting (this is the biggest ADR — 684 lines). Pace yourself: read the **Context** and **Decisions** sections only on the first pass.

### Builder

- [ ] **T-800** Read the plan builder root
      Path: `apps/coachapp-v2/src/training-plans/plan-builder/plan-builder.tsx`
      Outcome: what is the top-level layout (left = list of workouts, right = workout detail)?
- [ ] **T-801** Read `WorkoutSection` + `ExerciseElement`
      Outcome: drag/reorder UX — does it work on touch?
- [ ] **T-802** Read set scheme inputs
      Paths: `training-plans/components/{set-scheme-input,set-detail-editor}.tsx`
      Outcome: schemes supported (straight / pyramid / drop / etc) match what coaches actually program?
- [ ] **T-803** Read `ExercisePicker` + inline `inline-exercise-form`
      Outcome: "add exercise on the fly" feels native?

### Form + list

- [ ] **T-804** Read list / create / edit screens
      Paths: `list-training-plans.tsx`, `create-training-plan.tsx`, `edit-training-plan.tsx`
- [ ] **T-805** Read `TrainingPlanPicker`
      Outcome: parity with nutrition plan assign flow.

### API + Backend

- [ ] **T-806** Read the training plans API (814 lines — split across 2 sittings)
      Path: `apps/coachapp-v2/src/api/trainingPlans.ts`
      Outcome (sitting 1): list, get, create, update, delete endpoints sane.
      Outcome (sitting 2): workout + workout-element endpoints + cache tags.
- [ ] **T-807** Read the cache helpers
      Path: `apps/coachapp-v2/src/api/trainingPlanCache.ts`
- [ ] **T-808** Read the backend training controllers
      Paths: `easy-backend/lib/easy_web/controllers/coach/{training_plan,planned_workout,workout_element}_controller.ex`
- [ ] **T-809** Read the training context
      Path: `easy-backend/lib/easy/training/` + `training.ex`
      Outcome: how is a plan assigned to a client (clone vs link)? note in one line.

### UX decisions

- [ ] **T-810** Decide: support **week-based plans** (Week 1, Week 2…) for MVP, or single-week templates only?
      Outcome: one line.
- [ ] **T-811** Decide: do we want a **"copy workout"** button inside a plan?
      Outcome: ✅ yes / ❌ later.
- [ ] **T-812** Walk through "create plan → add 3 workouts → assign to client" on mobile
      Outcome: count taps. Note any step where you forgot what you were doing — that's a UX bug.

**Module 8 verdict:**

---

## Module 9 — Storefront (currently hidden)

Only do these if you decided to **unhide** Storefront in T-202.

- [ ] **T-900** Read ADR-003
      Path: `apps/coachapp-v2/docs/adr-003-storefront-and-leads.md`
      Outcome: what's the **value** of storefront in MVP? if you can't write 1 sentence, keep it hidden.
- [ ] **T-901** Read the visual editor
      Path: `apps/coachapp-v2/src/storefront/storefront-editor.tsx` + `storefront/components/*-editor.tsx`
      Outcome: live preview works without flicker?
- [ ] **T-902** Read offers + testimonials CRUD
      Paths: `storefront/{list,create,edit}-{offer,testimonial}.tsx`
- [ ] **T-903** Read the public storefront page
      Path: `apps/coachapp-v2/src/storefront/storefront.tsx` (and any client-facing route in `website`)
      Outcome: where does the public view live — coach app, website app, or both?
- [ ] **T-904** Read the storefront API + controllers
      Paths: `apps/coachapp-v2/src/api/{storefront,offers,testimonials}.ts`
- [ ] **T-905** Decision: should leads/intake become a real entity in v2?
      Outcome: one line + maybe a stub ADR.

**Module 9 verdict:**

---

## Module 10 — Settings (placeholder)

- [ ] **T-1000** Read what exists today
      Path: `apps/coachapp-v2/src/settings/settings.tsx` + `settings/components/`
- [ ] **T-1001** List the **minimum** settings a coach needs for MVP (write 3–6 items)
      Outcome: bullet list in this file under "Settings MVP".
- [ ] **T-1002** For each item above, find the matching backend endpoint or write "needs BE".
      Outcome: gap list.

**Settings MVP:**

1.
2.
3.

**Module 10 verdict:**

---

## Module 11 — Dashboard (placeholder)

- [ ] **T-1100** Decide: ship MVP with placeholder, or pick **3 widgets** and build now?
      Outcome: one line. If building, write the widget names below.
- [ ] **T-1101** If building: open a sub-task list per widget here.

**Dashboard widgets (if any):**

1.
2.
3.

**Module 11 verdict:**

---

# CLIENT APP (`clientapp-v2`)

## Module 12 — Client Auth & Invitation

- [ ] **T-1200** Read accept-invite screen
      Path: `apps/clientapp-v2/src/auth/accept-invite.tsx`
- [ ] **T-1201** Read login + OTP screens
      Paths: `apps/clientapp-v2/src/auth/{login,verify-login-otp,verify-invite-otp}.tsx`
- [ ] **T-1202** Read the auth API
      Path: `apps/clientapp-v2/src/api/auth.ts`
- [ ] **T-1203** Read the public_join controller (where the invite link lands)
      Path: `easy-backend/lib/easy_web/controllers/public_join_controller.ex`
      Outcome: token expiry / re-use rules clear?
- [ ] **T-1204** Walk: open an invite link in **incognito** on mobile. Note every weird moment.

**Module 12 verdict:**

---

## Module 13 — Client App Shell

- [ ] **T-1300** Read the shell
      Path: `apps/clientapp-v2/src/@components/app-shell.tsx`
      Outcome: tabs match `ROUTES`? mobile bottom nav comfortable for thumbs?
- [ ] **T-1301** Decide: keep **4 tabs** (Training / Nutrition / Progress / Settings) or fewer?
      Outcome: one line.

**Module 13 verdict:**

---

## Module 14 — Training (Client side)

- [ ] **T-1400** Read training home
      Path: `apps/clientapp-v2/src/training/training-home.tsx`
      Outcome: empty state (no plan) is obvious + tells the client what to do?
- [ ] **T-1401** Read plan detail
      Path: `apps/clientapp-v2/src/training/training-plan-detail.tsx`
- [ ] **T-1402** Read active workout (the most-used screen)
      Path: `apps/clientapp-v2/src/workout/active-workout.tsx`
      Outcome: every primary action is one thumb-tap?
- [ ] **T-1403** Read workout components
      Path: `apps/clientapp-v2/src/workout/components/`
- [ ] **T-1404** Read the training API client
      Path: `apps/clientapp-v2/src/api/trainingPlans.ts`
- [ ] **T-1405** Read the workout sessions API
      Path: `apps/clientapp-v2/src/api/workoutSessions.ts`
- [ ] **T-1406** Read the backend client schedule controller
      Path: `easy-backend/lib/easy_web/controllers/client/schedule_controller.ex`
- [ ] **T-1407** Read the workout_session + performed_set controllers
      Paths: `easy-backend/lib/easy_web/controllers/{workout_session,performed_set}_controller.ex` and `coach/workout_session_controller.ex`
      Outcome: which one the **client** writes to? confirm.
- [ ] **T-1408** Decide: support **offline-first** workout logging (cache then sync), or require connectivity?
      Outcome: 🔧 add later / ✅ require online MVP.
- [ ] **T-1409** Walk: log a complete workout on mobile.
      Outcome: write the **single most annoying thing**.

**Module 14 verdict:**

---

## Module 15 — Workout History

- [ ] **T-1500** Read history list
      Path: `apps/clientapp-v2/src/history/workout-history.tsx`
- [ ] **T-1501** Read session detail
      Path: `apps/clientapp-v2/src/history/session-detail.tsx`
      Outcome: same fields shown on coach-side `session-detail.tsx`? note differences.
- [ ] **T-1502** Decide: support exporting history (CSV / PDF) for client?
      Outcome: v2.

**Module 15 verdict:**

---

## Module 16 — Nutrition (Client side)

- [ ] **T-1600** Read nutrition daily
      Path: `apps/clientapp-v2/src/nutrition/nutrition-daily.tsx`
      Outcome: progress vs target visible? does it default to **today**?
- [ ] **T-1601** Read add-food
      Path: `apps/clientapp-v2/src/nutrition/add-food.tsx`
      Outcome: is the create/replace branch (see CLAUDE.md) intuitive?
- [ ] **T-1602** Read nutrition components
      Path: `apps/clientapp-v2/src/nutrition/components/`
- [ ] **T-1603** Read the meal logs API
      Path: `apps/clientapp-v2/src/api/mealLogs.ts`
- [ ] **T-1604** Backend: confirm meal-log endpoints exist for **client-side writes**
      Path: search controllers for `meal_log` (likely under `coach/` only — verify)
      Outcome: gap? note it.
- [ ] **T-1605** Decide: should the client be able to **swap a food** they didn't have today?
      Outcome: ✅ already / 🔧 add.
- [ ] **T-1606** Walk: log 1 meal on mobile, then edit it.
      Outcome: total taps + any confusion.

**Module 16 verdict:**

---

## Module 17 — Progress

- [ ] **T-1700** Read progress home
      Path: `apps/clientapp-v2/src/progress/progress-home.tsx`
- [ ] **T-1701** Read progress components
      Path: `apps/clientapp-v2/src/progress/components/`
      Outcome: what metrics are shown today? what's missing for MVP?
- [ ] **T-1702** Backend: which endpoints feed progress?
      Outcome: list them or write "TODO BE: …"
- [ ] **T-1703** Decide: include **body weight / measurements** in MVP, or just training+nutrition adherence?
      Outcome: one line.

**Module 17 verdict:**

---

## Module 18 — Client Settings

- [ ] **T-1800** Read settings
      Path: `apps/clientapp-v2/src/settings/settings.tsx`
- [ ] **T-1801** List minimum client settings (3–5).
      Outcome: bullet list under "Client settings MVP" below.

**Client settings MVP:**

1.
2.
3.

**Module 18 verdict:**

---

## Module 19 — Capacitor Native Shell

- [ ] **T-1900** Read the capacitor TODO
      Path: `apps/clientapp-v2/docs/capacitor_todo.md`
- [ ] **T-1901** Decide which items are **store-submission blockers** (move them to a new "Pre-launch" list at the bottom of this file).
- [ ] **T-1902** Confirm bundle ID + display name with yourself.

**Module 19 verdict:**

---

# CROSS-CUTTING

## Module 20 — Shared Packages

- [ ] **T-2000** Read `packages/error-parser` API surface
      Path: `packages/error-parser/README.md`
      Outcome: every app uses it consistently?
- [ ] **T-2001** Read `packages/utils` exports
      Path: `packages/utils/README.md`
- [ ] **T-2002** Read `packages/ui` — is it actively used, or dead?
      Outcome: keep / merge into app / delete.
- [ ] **T-2003** Read `packages/chat` + `packages/websocket`
      Outcome: are these wired into an app yet? If no, defer.
- [ ] **T-2004** Decide: are any packages **half-built** and should be deleted to reduce cognitive load?
      Outcome: list them.

**Module 20 verdict:**

---

## Module 21 — Backend Health

- [ ] **T-2100** Tenant isolation spot-check
      Path: pick **3** files at random from `easy-backend/lib/easy_web/controllers/coach/`
      Outcome: every query call goes through a context that filters by `business_id`?
- [ ] **T-2101** Read the router
      Path: `easy-backend/lib/easy_web/router.ex`
      Outcome: scope structure (`/v1/coach/*`, `/v1/client/*`, public) sane? any old/unused scope?
- [ ] **T-2102** Read the fallback + response helpers
      Paths: `easy-backend/lib/easy_web/controllers/{fallback_controller,response_helpers,error_json}.ex`
      Outcome: error shapes match frontend `ErrorResponse` / `ValidationErrorResponse`?
- [ ] **T-2103** Run `mix format --check-formatted` + any linter
      Outcome: clean?
- [ ] **T-2104** Decide: do we want **integration tests** before shipping MVP?
      Outcome: bare minimum smoke tests (login, invite, log workout) or none.

**Module 21 verdict:**

---

## Module 22 — Polish & Pre-launch (do last)

- [ ] **T-2200** Check every screen renders on 375px and 1280px
      Outcome: list any breakage.
- [ ] **T-2201** Run `pnpm build` for **all 3 apps**
      Outcome: ✅ green / 🔧 list errors.
- [ ] **T-2202** Run `pnpm lint`
      Outcome: ✅ / 🔧.
- [ ] **T-2203** Decide on **error monitoring** (Sentry / nothing)
      Outcome: one line.
- [ ] **T-2204** Decide on **analytics** (PostHog / nothing) for MVP.
      Outcome: one line.

---

# Pre-launch Blockers

_(Move items here from any module once you mark them as MUST-FIX-BEFORE-LAUNCH.)_

- [ ]
- [ ]

---

# Notes & Open Questions

_(Catch-all. Dump anything that pops up so it doesn't break your focus during a task.)_

-
-
