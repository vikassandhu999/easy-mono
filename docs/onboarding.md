# Onboarding: application scope and vocabulary

This document explains what the product does and defines the words the codebase uses. Read it before reading code. For build commands and per-stack conventions, see the root `CLAUDE.md`, `frontend/AGENTS.md`, and `backend/AGENTS.md`.

## What the product is

Easy (also called CoachEasy) is a platform for fitness and nutrition coaches to run their coaching business. A coach signs up, creates a business, invites clients, designs training and nutrition plans, assigns them, and tracks how clients follow them. Clients use a separate app to view their assigned plans, log workouts and meals, and record their body weight.

The product has two sides:

* The coach side: client roster, plan authoring, and libraries of exercises, foods, and recipes.
* The client side: following assigned plans, logging workouts set by set, logging meals food by food, and tracking weight against a goal.

Coaches author; clients execute and log. A client never creates a plan.

## Where the code lives

* `backend/` is an Elixir/Phoenix API built on Ash. Domain logic lives in `backend/lib/easy`, grouped by domain (`identity`, `orgs`, `clients`, `training`, `nutrition`, `fitness`). The web layer is `backend/lib/easy_web`.
* `frontend/apps/coachapp-v2` is the coach web app (React 19, Vite, Redux Toolkit + RTK Query, HeroUI, Tailwind).
* `frontend/apps/clientapp-v2` is the client app, built as a PWA and wrapped with Capacitor for iOS and Android.
* `frontend/apps/website` is the Next.js marketing site.
* Generated OpenAPI is the API contract between frontend and backend. Backend changes update the OpenApiSpex operations and regenerate the frontend OpenAPI artifacts when needed.

## People and tenancy

A **User** is an identity account. Authentication is passwordless: the user enters an email, receives a one-time password (OTP), and verifies it to get a JWT. There are no passwords anywhere in the system.

A **Business** is the tenant. Every domain record carries a `business_id`, every query is scoped by the `business_id` from the JWT claims, and uniqueness constraints are composite with `business_id`. Never take a `business_id` from user input.

A **Coach** is a profile linking a User to a Business. The user who creates a business is its **owner**. A **Client** is a person being coached, belonging to one Business and created by a Coach. A Client may or may not be linked to a User: clients start as invitation records and only get a User when they accept.

The JWT `role` claim has four values: `owner`, `coach`, `client`, and `guest`. Routes are split by role (`/v1/coach/*`, `/v1/client/*`, public `/v1/public/*` and `/v1/auth/*`), enforced by the `Authenticate` and `EnsureRole` plugs.

### Client lifecycle

A coach invites a client by email, which creates a Client in `pending` status with an invitation token that expires after 30 days. When the client accepts, a User is created or linked and the status becomes `active`. From `active`, a coach can move the client to `inactive` or `archived`; there is no way back to `pending`. A coach can revoke a pending invitation before it is accepted. A user can have at most one active client per business.

## Training vocabulary

The training domain splits cleanly into what the coach plans and what the client performs. The planned and performed terms look similar, so learn the pairs.

A **TrainingPlan** is a coach-authored program. It is either a template (no client) or assigned to one client, and it can be duplicated from a template via `original_template`. It has a date range, a status (`active` or `archived`), and rest days as weekday names.

A **Workout** is one workout design inside a training plan. In the coach app, workouts are placed on weekdays, and a workout is either `primary` or `alternative` (alternatives offer substitutions).

A **WorkoutElement** is one exercise slot inside a workout, with a position and prescription (sets, reps, weight, duration, rest). A **PlannedSet** is the per-set target inside an element.

An **Exercise** is a movement definition (for example "Back squat") with instructions, images, a `mechanics` value (compound, isolation, isometric), a `force` value (push, pull, static), and many-to-many links to **Muscle** and **Equipment**. Exercises belong to the business, so each coach builds their own library.

On the client side, a **WorkoutSession** is one execution of a workout. It is `active` while in progress and ends as `completed` or `discarded`. A client can have only one active session at a time. The session stores a `planned_snapshot` so later edits to the plan do not rewrite history, plus an optional soreness rating from 1 to 5. A **PerformedSet** is one logged set within a session: the reps, weight, and duration the client actually did.

So: TrainingPlan → Workout → WorkoutElement → PlannedSet is the coach's side; WorkoutSession → PerformedSet is the client's side.

## Nutrition vocabulary

The nutrition domain follows the same author/log split.

A **Plan** (the nutrition domain calls it just `Plan`; the frontend says "nutrition plan") is a coach-authored nutrition program with a `macros_goal` map of daily targets (calories, protein, carbs, fat) and the same template/assigned/duplicate pattern as training plans.

A **Meal** is a named, reusable composition of foods (for example "High-protein breakfast") with computed nutrition totals. A **MealItem** is one food inside a meal with a quantity and serving size. A **PlanItem** places a meal into a plan at a **meal slot**: breakfast, lunch, dinner, or snack (the canonical list is `MEAL_SLOTS` in `@easy/utils`).

A **Food** is one entry in the food database with nutrition per serving. A **Recipe** is a composite food made of **RecipeIngredient** rows. A **ServingSize** defines portion units. Foods and recipes, like exercises, belong to the business.

On the logging side, a **MealLog** is a client's record for one meal slot on one date. It carries a `planned_snapshot` and compares `planned_calories` against `logged_calories`. A **FoodLogEntry** is one food logged inside a meal log; its source marks whether it was planned, a replacement, or unplanned. **Adherence** is the frontend's measure of logged versus planned intake, bucketed as none, low, medium, high, or future.

## Progress vocabulary

The fitness domain is small. A **WeightEntry** is one weight measurement per client per date, in kg or lbs. Clients have a `goal_weight_value` and unit on their record, and the apps show progress toward it.

## Easily confused pairs

* Workout vs WorkoutSession: the design vs one execution of it.
* PlannedSet vs PerformedSet: the target vs what was logged.
* TrainingPlan vs Plan: `Plan` with no qualifier is the nutrition domain's resource. The API and frontend disambiguate with `training_plans` and `nutrition_plans`.
* Meal vs MealLog: a reusable meal definition vs a client's daily log for a slot.
* Client vs User: a Client is a roster entry owned by a business; a User is a login. A pending Client has no User.

## How the pieces talk

Both React apps call the API through RTK Query against `/v1/...`, with a Bearer token that auto-refreshes and a redirect to login on 401/403. Cache invalidation uses RTK Query tags named after the resources above (Client, TrainingPlan, MealLog, and so on), so the vocabulary in this document is also the cache vocabulary.

Generated OpenAPI is the source of truth for routes and shapes. The backend also serves generated OpenAPI at `/api/openapi` and Swagger UI at `/swaggerui`.

`frontend/packages/websocket` provides a reconnecting `WebSocketClient`, and `frontend/packages/chat` provides a Lexical-based chat UI. Neither is wired into the MVP routes; they exist for the planned coach-client chat.

## A day in the life of the data

1. A coach invites a client, which creates a pending Client and emails an invitation.
2. The client accepts, gets a User and a JWT with role `client`, and installs the client app.
3. The coach duplicates a TrainingPlan template and a nutrition Plan template, assigns both to the client, and sets a goal weight.
4. Each training day, the client opens the assigned workout, starts a WorkoutSession, and logs PerformedSets.
5. Each meal slot, the client logs FoodLogEntries against the MealLog, and adherence is computed from planned versus logged calories.
6. The client logs WeightEntries; the coach watches sessions, meal logs, and weight from the coach app.
