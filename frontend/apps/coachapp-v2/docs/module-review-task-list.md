# Module Review Task List

**Date:** 2026-05-20  
**Purpose:** small, decision-friendly review tasks for taking the product module-by-module without overload.

---

## How to use this list

### Rules

1. Work on **one module only** until its review is done.
2. Keep a scratch note with only 3 headings:
   - **Good**
   - **Needs decision**
   - **Follow-up**
3. If a task reveals a big issue, do **not** fix it immediately unless it blocks understanding.
4. Finish the module review first, then make decisions.

### Definition of done for a module

A module is reviewed when you can answer all 6:

- What screens exist?
- What API endpoints does it use?
- What backend entities own the data?
- What is the happy path?
- What is missing / fragile?
- What decision do I want to make next?

### Review output format per module

Use this tiny template:

```md
## Module: X
- Good:
- Needs decision:
- Follow-up:
- Verdict: keep / polish / finish later / cut
```

---

## Recommended order

1. Clients + invitations
2. Exercises
3. Foods
4. Recipes
5. Nutrition plans + meal logs
6. Training plans + workout sessions
7. Auth + business onboarding
8. Shared shell / navigation / settings
9. Storefront (hidden MVP code)
10. Website storefront
11. Shared packages / backend contract sweep

---

# 1) Clients + Invitations

**Read first:**
- `apps/coachapp-v2/docs/adr-004-client-invitation-and-onboarding.md`
- `apps/coachapp-v2/docs/adr-005-client-management.md`

### Tasks

- [ ] Open `apps/coachapp-v2/src/clients/list-clients.tsx` and write down the exact list-page responsibilities.
- [ ] Open `apps/coachapp-v2/src/clients/client-detail.tsx` and list the sections shown on the page in order.
- [ ] Open `apps/coachapp-v2/src/clients/edit-client.tsx` and confirm which fields are truly editable.
- [ ] Open `apps/coachapp-v2/src/clients/invite-client.tsx` and describe the invite happy path in 3 bullets.
- [ ] Open `apps/coachapp-v2/src/api/clients.ts` and list every client endpoint used by the frontend.
- [ ] Open `apps/coachapp-v2/src/api/mappers/clients.ts` and confirm the canonical frontend shape.
- [ ] Open `apps/coachapp-v2/src/clients/components/client-nutrition-adherence.tsx` and decide whether it belongs inside the client module or should later become a shared “progress” pattern.
- [ ] Open `apps/coachapp-v2/src/clients/components/client-workout-history.tsx` and write down what is preview-only vs what deserves a full module.
- [ ] Backend: check the client endpoints in your backend repo / API implementation and confirm the source of truth for `status`, `invite_url`, and notes.
- [ ] Backend: verify whether invite resend, invite expiry, and client deletion are intentionally missing or just not wired.
- [ ] Run one manual flow: invite client → open client detail → edit status/notes.
- [ ] Make one decision: what is the next meaningful improvement for clients?

---

# 2) Exercises

**Read first:**
- `apps/coachapp-v2/docs/adr-000-architecture-and-stack.md`

### Tasks

- [ ] Open `apps/coachapp-v2/src/exercises/list-exercises.tsx` and note list filters/search behavior.
- [ ] Open `apps/coachapp-v2/src/exercises/create-exercise.tsx` and describe the create flow.
- [ ] Open `apps/coachapp-v2/src/exercises/edit-exercise.tsx` and confirm edit vs create differences.
- [ ] Open `apps/coachapp-v2/src/exercises/exercise-detail.tsx` and list the actions available from detail.
- [ ] Open `apps/coachapp-v2/src/exercises/exercise-form/` files and check whether any field is confusing or redundant.
- [ ] Open `apps/coachapp-v2/src/api/exercises.ts` and list all exercise-related endpoints, including muscles/equipment.
- [ ] Open `apps/coachapp-v2/src/api/mappers/exercises.ts` and confirm request/response normalization is complete.
- [ ] Backend: verify exercise schema, image handling, muscles, equipment, duplication behavior.
- [ ] Backend: confirm if search/filter/pagination behavior matches what the UI expects.
- [ ] Run one manual flow: create → edit → duplicate → delete test item.
- [ ] Make one decision: is the exercise library MVP-complete or does it need one more UX pass?

---

# 3) Foods

**Read first:**
- `apps/coachapp-v2/docs/api-mapping-refactor-checklist.md`

### Tasks

- [ ] Open `apps/coachapp-v2/src/foods/list-foods.tsx` and note search/list behavior.
- [ ] Open `apps/coachapp-v2/src/foods/create-food.tsx` and confirm create-path simplicity.
- [ ] Open `apps/coachapp-v2/src/foods/edit-food.tsx` and check edit-path differences.
- [ ] Open `apps/coachapp-v2/src/foods/food-detail.tsx` and list what coaches can actually inspect there.
- [ ] Open `apps/coachapp-v2/src/foods/food-form/food-form.tsx` and decide whether serving sizes/macros are easy enough for future you.
- [ ] Open `apps/coachapp-v2/src/foods/components/ingredient-list.tsx` and note any leftover complexity.
- [ ] Open `apps/coachapp-v2/src/api/foods.ts` and list endpoints + filters.
- [ ] Open `apps/coachapp-v2/src/api/mappers/foods.ts` and confirm create/update payload rules.
- [ ] Backend: verify food schema, macro normalization, serving-size persistence, duplicate behavior.
- [ ] Backend: confirm whether source/category/notes are optional by design.
- [ ] Run one manual flow: create food with macros + serving size → edit → use inside another module.
- [ ] Make one decision: is the food model “good enough” or does it need one simplification before launch?

---

# 4) Recipes

**Read first:**
- `apps/coachapp-v2/docs/api-mapping-refactor-checklist.md`

### Tasks

- [ ] Open `apps/coachapp-v2/src/recipes/list-recipes.tsx` and summarize list responsibilities.
- [ ] Open `apps/coachapp-v2/src/recipes/create-recipe.tsx` and describe how ingredient drafting works.
- [ ] Open `apps/coachapp-v2/src/recipes/edit-recipe.tsx` and confirm edit hydration is clear.
- [ ] Open `apps/coachapp-v2/src/recipes/recipe-detail.tsx` and list detail-page actions.
- [ ] Open `apps/coachapp-v2/src/recipes/recipe-form/recipe-form.tsx` and verify what the coach must input vs what is derived.
- [ ] Open `apps/coachapp-v2/src/domain/recipes.ts` and confirm all nutrition computation logic lives there.
- [ ] Open `apps/coachapp-v2/src/api/recipes.ts` + `src/api/mappers/recipes.ts` and list contract assumptions.
- [ ] Backend: verify recipe ingredient persistence, macro calculation rules, and duplicate behavior.
- [ ] Backend: confirm whether macros are stored, derived, or both.
- [ ] Run one manual flow: create recipe from foods → edit quantities → inspect computed totals.
- [ ] Make one decision: should recipes stay lightweight or gain more structure later?

---

# 5) Nutrition Plans + Meal Logs

**Read first:**
- `apps/coachapp-v2/docs/adr-001-nutrition-plan-builder.md`

### Tasks

- [ ] Open `apps/coachapp-v2/src/nutrition-plans/list-nutrition-plans.tsx` and note what distinguishes templates from personal plans.
- [ ] Open `apps/coachapp-v2/src/nutrition-plans/create-nutrition-plan.tsx` and write the exact step-1 create flow.
- [ ] Open `apps/coachapp-v2/src/nutrition-plans/nutrition-plan-detail.tsx` and list its sections in order.
- [ ] Open `apps/coachapp-v2/src/nutrition-plans/components/meal-section.tsx` and note how adding/editing meal items works.
- [ ] Open `apps/coachapp-v2/src/nutrition-plans/components/day-planner.tsx` and explain day assignment in 3 bullets.
- [ ] Open `apps/coachapp-v2/src/api/nutritionPlans.ts`, `src/api/meals.ts`, and `src/api/mappers/*.ts` for this module and list all moving parts.
- [ ] Open `apps/coachapp-v2/src/domain/nutrition-plans.ts` and `src/domain/client-nutrition.ts` and confirm which computations are frontend-only.
- [ ] Open `apps/clientapp-v2/src/nutrition/` screens and identify the client-side meal logging happy path.
- [ ] Backend: verify boundaries between plan, meal, meal item, plan item, meal log, and summary endpoints.
- [ ] Backend: confirm what is computed server-side vs client-side for macros/adherence.
- [ ] Run one coach flow: create plan → add meals → assign to day → assign to client.
- [ ] Run one client flow: log a meal against that plan and inspect coach-side adherence.
- [ ] Make one decision: what is the single highest-leverage improvement left in nutrition?

---

# 6) Training Plans + Workout Sessions

**Read first:**
- `apps/coachapp-v2/docs/adr-002-training-plan-builder.md`
- `apps/coachapp-v2/docs/2026-04-21-training-plan-redesign-handover.md`

### Tasks

- [ ] Open `apps/coachapp-v2/src/training-plans/list-training-plans.tsx` and note list responsibilities.
- [ ] Open `apps/coachapp-v2/src/training-plans/create-training-plan.tsx` and write the step-1 create flow.
- [ ] Open `apps/coachapp-v2/src/training-plans/plan-builder/plan-builder.tsx` and list the major sections in order.
- [ ] Open `apps/coachapp-v2/src/training-plans/components/weekly-overview/weekly-overview.tsx` and explain the weekly schedule UX in 5 bullets max.
- [ ] Open `apps/coachapp-v2/src/training-plans/components/workout-section.tsx` and identify the add/edit/remove exercise flows.
- [ ] Open `apps/coachapp-v2/src/training-plans/components/inline-exercise-form.tsx` and decide if it feels easy enough for future iteration.
- [ ] Open `apps/coachapp-v2/src/api/trainingPlans.ts`, `src/api/workoutSessions.ts`, and related mappers and list all plan/session endpoints.
- [ ] Open `apps/clientapp-v2/src/workout/active-workout.tsx` and `apps/clientapp-v2/src/training/` screens and describe the client workout logging path.
- [ ] Open `apps/coachapp-v2/src/clients/session-detail.tsx` and `src/domain/workout-sessions.ts` and confirm how planned-vs-performed is derived.
- [ ] Backend: verify the split between training plan, workout, workout element, plan item, workout session, and performed set.
- [ ] Backend: confirm snapshot rules, duplication semantics, and cache-sensitive mutations.
- [ ] Run one coach flow: create plan → create workout → assign day → edit exercise targets.
- [ ] Run one client flow: start session → log sets → finish session → inspect coach-side history.
- [ ] Make one decision: what is the single biggest remaining risk in training?

---

# 7) Auth + Business Onboarding

**Read first:**
- `apps/coachapp-v2/docs/adr-000-architecture-and-stack.md`

### Tasks

- [ ] Open `apps/coachapp-v2/src/auth/login.tsx` and write the login happy path.
- [ ] Open `apps/coachapp-v2/src/auth/signup.tsx` and `verify-signup-otp.tsx` and note the signup flow.
- [ ] Open `apps/coachapp-v2/src/auth/verify-login-otp.tsx` and confirm login verification states.
- [ ] Open `apps/coachapp-v2/src/auth/register-business.tsx` and define what onboarding is considered complete.
- [ ] Open `apps/coachapp-v2/src/api/base.ts` and confirm token refresh / auth failure behavior.
- [ ] Backend: verify OTP expiration, refresh token behavior, and business registration edge cases.
- [ ] Run one manual flow: signup/login/logout from a clean state.
- [ ] Make one decision: is auth “done” or does it need a reliability pass before launch?

---

# 8) Shared Shell + Navigation + Settings

**Read first:**
- `apps/coachapp-v2/docs/adr-000-architecture-and-stack.md`

### Tasks

- [ ] Open `apps/coachapp-v2/src/@components/app-shell.tsx` and list global responsibilities.
- [ ] Open `apps/coachapp-v2/src/router.tsx` and confirm the app’s real route map.
- [ ] Open `apps/coachapp-v2/src/@config/routes.ts` and note any stale or hidden routes.
- [ ] Open `apps/coachapp-v2/src/@hooks/use-go-back.ts` and verify back-navigation assumptions.
- [ ] Open `apps/coachapp-v2/src/settings/settings.tsx` and decide whether settings is intentionally placeholder-level.
- [ ] Backend: verify which shell/settings features actually need server support now.
- [ ] Run one manual pass on mobile width and one on desktop width.
- [ ] Make one decision: what global UX paper cut should be fixed before feature work resumes?

---

# 9) Storefront (hidden in MVP)

**Read first:**
- `apps/coachapp-v2/docs/adr-003-storefront-and-leads.md`

### Tasks

- [ ] Open `apps/coachapp-v2/src/storefront/storefront.tsx` and note the intended hub structure.
- [ ] Open `apps/coachapp-v2/src/storefront/storefront-editor.tsx` and list editor sections.
- [ ] Open offer CRUD files and describe the offer lifecycle.
- [ ] Open testimonial CRUD files and describe the testimonial lifecycle.
- [ ] Open `apps/coachapp-v2/src/api/storefront.ts`, `api/offers.ts`, and `api/testimonials.ts` and list all storefront endpoints.
- [ ] Open `apps/coachapp-v2/src/api/mappers/storefront.ts` and confirm profile/request shaping is understandable.
- [ ] Backend: verify publish/preview behavior, slug uniqueness, and profile upsert assumptions.
- [ ] Backend: decide whether pending-client intake belongs on Client directly or needs a separate entity before launch.
- [ ] Make one decision: keep hidden for now, or schedule reactivation after core coaching loop is done?

---

# 10) Website Storefront

**Read first:**
- `apps/coachapp-v2/docs/adr-003-storefront-and-leads.md`

### Tasks

- [ ] Open `apps/website/app/coach/[slug]/page.tsx` and describe the server-rendered data flow.
- [ ] Open `apps/website/app/coach/[slug]/` components and list which ones are server vs client.
- [ ] Check how preview mode works and write down exactly what bypasses cache.
- [ ] Verify how offers, testimonials, FAQ, and intake form compose on the public page.
- [ ] Backend: verify public profile endpoint shape and preview behavior.
- [ ] Backend: verify intake submission endpoint contract, or confirm it is intentionally deferred.
- [ ] Make one decision: what must exist before this can be safely unhidden?

---

# 11) Shared Packages + Backend Contract Sweep

**Read first:**
- `apps/coachapp-v2/docs/api_contract.yaml`
- `apps/coachapp-v2/docs/adr-000-architecture-and-stack.md`

### Tasks

- [ ] Open `packages/utils/src` and note which helpers are now shared across apps.
- [ ] Open `packages/ui/src` and list which components are genuinely shared vs app-specific.
- [ ] Open `packages/hooks/src` and note any hooks you rely on but haven’t reviewed.
- [ ] Skim `packages/chat`, `packages/websocket`, and `packages/error-parser` and decide whether they matter for the current launch scope.
- [ ] Read `apps/coachapp-v2/docs/api_contract.yaml` and list any endpoints in the contract that are not clearly exercised by the frontend.
- [ ] Backend: compare real API implementation vs contract and write down drift.
- [ ] Backend: list any missing observability / logs / admin scripts needed to support launch.
- [ ] Make one decision: what backend cleanup is required before end-to-end QA?

---

## Final sweep questions

After all modules are reviewed, answer these:

- [ ] Which modules are truly launch-ready?
- [ ] Which modules need one polish pass?
- [ ] Which modules should be explicitly deferred?
- [ ] Which backend assumptions still feel risky?
- [ ] What is the shortest path to “usable by first real coach”?
