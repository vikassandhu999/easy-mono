# Elixir Backend Conventions — Strengthen & Apply

**Date:** 2026-06-23
**Status:** Approved design, ready for planning
**Scope:** `backend/` (Elixir / Phoenix / Ecto)

## Problem

`backend/AGENTS.md` is already a strong, mostly-followed conventions doc. The
real problem is not missing rules — it is that the code is mid-migration and a
few **keystone patterns were never pinned down**, so newer contexts
(`exercises`, `foods`, `threads`) and older ones (`training_plans`,
`nutrition_plans`, `workouts`, `meals`, `clients`, `sessions`) disagree with
each other.

This spec does two things:

- **Part A — Conventions.** Pin the keystone patterns that were undecided, and
  re-state the `AGENTS.md` rules that the code violates in stragglers.
- **Part B — Divergence ledger.** Name every file that violates each rule. This
  is the migration backlog, sliced per-context for implementation plans.

`AGENTS.md` remains the authority. Once these conventions are locked, the
relevant parts of `AGENTS.md` get updated to match (notably the context-layer
examples, which still show raw-id signatures).

---

## Part A — Conventions

### A1. The actor model: `Ctx` carries the actor

`Easy.Ctx` is extended to carry the acting identity **and role**:

```elixir
%Easy.Ctx{business_id: uuid, user_id: uuid, role: :coach | :client}
```

- Built once in the auth plug from JWT claims + router scope.
- `role` exists so a context function can guard its expected actor
  (`assert_coach(ctx)` / `assert_client(ctx)`) — cheap insurance against a coach
  function being wired under a client route. The function name declares intent;
  the guard enforces it.

### A2. The three-case naming convention

Every domain operation falls into one of three actor-cases. Each case has a
distinct **lexical shape**, so the actor and target are readable without
opening the function body. This **retires** `_for_coach_user`, `_for_user`,
`_as_coach`, `_as_client` entirely.

| Case | Actor → target | Name shape | Examples |
|---|---|---|---|
| **1. Coach in system** | coach → business/system scope | `verb_noun(ctx, …)` | `create_exercise(ctx, attrs)` · `list_plans(ctx, filters)` |
| **2. Coach for a client** | coach → a specific client | `verb_noun_{for,to}_client(ctx, client_id, …)` | `list_plans_for_client(ctx, client_id)` · `assign_plan_to_client(ctx, client_id, plan_id)` |
| **3. Client themselves** | client → self | `verb_client_noun(ctx, …)` | `list_client_plans(ctx)` · `create_client_session(ctx, attrs)` |

Rules that make it mechanical:

- **No marker = coach-in-system.** Bare `verb_noun`. `ctx.role` asserted
  `:coach`. Operates on `ctx.business_id` scope; stamps `creator_id = ctx.user_id`.
- **`…_for_client` / `…_to_client` suffix + `client_id` second arg =
  coach-for-client.** The `client_id` is *always* the second positional
  argument. Authz verifies the client belongs to `ctx.business_id`. The
  preposition follows the verb naturally (`list_…_for_client`,
  `assign_…_to_client`).
- **`client_` noun-prefix = client-for-self.** Target is `ctx.user_id`, never a
  param. `ctx.role` asserted `:client`.
- A client reading a **shared reference library** (exercises, foods) uses the
  Case-1 shape with authz that allows both roles. Reads, not a fourth case.

The position of "client" (suffix-with-preposition vs noun-prefix) plus the
presence/absence of a `client_id` argument disambiguates Case 2 from Case 3:
`list_plans_for_client(ctx, client_id)` vs `list_client_plans(ctx)`.

### A3. Context layer

- **`Ctx`-first.** Every tenant-scoped public function takes `%Ctx{}` as its
  first argument. Pure reference reads with no tenant scope (e.g. `list_muscles`,
  `list_equipment`) may take plain args.
- **Return values.** `{:ok, value} | {:error, reason}`. `reason` is an atom
  (`:not_found`, `:read_only_source`, …) or an `Ecto.Changeset.t()`. No bang
  functions outside tests, migrations, and seeds.
- **List shape.** Paginated / searchable lists return
  `{:ok, %{count: integer, <plural_noun>: [...]}}`. Small fixed reference lists
  return bare `{:ok, [items]}`. The count is only paid where the UI needs it.
- **Query composition** happens at the context boundary by piping schema query
  builders. `ok_or_not_found/1` is the standard nil→`{:error, :not_found}` helper.

### A4. Schema layer

- **Changeset names:** `insert_changeset` / `update_changeset` only. No
  `create_changeset`. No generic `changeset/2` for top-level schemas (embedded
  schemas may keep a single `changeset/2` when there is one valid write path).
- **Query builders:** every tenant-scoped schema exposes at minimum a
  `for_business/2` builder. Builders are pure, composable, take an optional
  queryable first, return `Ecto.Query`.
- **Trusted fields** are set with `put_change/3`, never `cast`. Cast only
  client-editable fields.
- **Closed sets** use `Ecto.Enum`, not `:string` + `validate_inclusion`.
- **Timestamps:** `timestamps(type: :utc_datetime)` is the standard.
  `:utc_datetime_usec` only where sub-second precision is genuinely needed.
- **Keys:** `binary_id` primary and foreign keys, declared explicitly.
- **Docs:** no `@moduledoc`, no `@doc`. `@spec` on every public function.
- **Changeset arg order:** trusted ids passed in a consistent documented order,
  `business_id` first (e.g. `insert_changeset(business_id, creator_id, parent_id,
  attrs)`), not parent-id-first.

### A5. Web layer

- Every controller reads `conn.assigns.ctx` and passes it to the context. Stop
  destructuring `conn.assigns.claims` into raw ids.
- Action shape: `with {:ok, x} <- Context.fn(ctx, …)` → render. One context call.
  Expected errors flow to `FallbackController`. No `Repo`, no query building, no
  multi-step workflows in controllers.
- `OpenApiSpex.Plug.CastAndValidate` on every write action.
- A co-located `OpenApiSpex` `operation` for every public JSON endpoint.

### A6. Documented exceptions

- **AuthController** (signup, OTP verify, token refresh, etc.) renders raw
  `json(%{...})`. These are not resource views; forcing them into `render(:show)`
  would manufacture views for non-resource payloads. Allowed exception.
- **Route naming:** new multi-word path segments are **kebab-case**
  (`/workout-sessions`). Existing snake_case paths (`/training_plans`) are
  **flagged debt** — migrated only with coordinated frontend + OpenAPI changes,
  not churned for cosmetics.

---

## Part B — Divergence ledger (migration backlog)

Concrete file references from the codebase audit. Each row is a fix.

### Context layer — `Ctx`-first + three-case naming

| Status | Context |
|---|---|
| ✅ Done (reference shape) | `exercises.ex`, `foods.ex`, `threads.ex` |
| ⬜ Migrate raw-ids → `Ctx` + rename to three-case | `training_plans.ex`, `nutrition_plans.ex`, `workouts.ex`, `meals.ex`, `clients.ex`, `sessions.ex` |

Rename targets (examples): `create_training_plan_for_coach_user` →
`create_plan(ctx, attrs)` / `assign_plan_to_client(ctx, client_id, plan_id)`;
`create_client_workout_session_for_user` → `create_client_session(ctx, attrs)`;
`list_client_plans_for_user` → `list_client_plans(ctx)`.

### Schema layer

| Rule | Fix targets |
|---|---|
| `create_changeset` → `insert_changeset` | `training/equipment.ex:21`, `training/muscle.ex:21`, `training/training_plan.ex:40` |
| **`put_change` not `cast` for trusted ids (SECURITY)** | `identity/one_time_token.ex:33` casts `:user_id` |
| `for_business/2` builder missing | `storefront/lead.ex`, `threads/thread_message.ex` |
| `Ecto.Enum` for closed sets | `threads/thread.ex:35` (`status` is `:string` + `validate_inclusion`) |
| Strip `@doc` | `nutrition/recipe.ex:49`, `client_profiles/client_profile.ex:60` |
| Timestamp type → `:utc_datetime` | `training/equipment.ex:16`, `training/muscle.ex:16` (`_usec`); `identity/user.ex:20`, `identity/one_time_token.ex:26`, `identity/user_session.ex:28`, `clients/client.ex:37` (bare) |
| Changeset trusted-id arg order (`business_id` first) | `training/workout.ex:24`, `nutrition/meal.ex:39` (currently `plan_id` first) |
| Missing `@spec` on public fns | `identity/user.ex` helpers, `identity/coach.ex:99-105` |

### Web layer

| Rule | Fix targets |
|---|---|
| Use `conn.assigns.ctx`, not `claims` raw-ids (~120 uses) | `coaches/training_plan_controller.ex`, `coaches/nutrition_plan_controller.ex`, `coaches/workout_controller.ex`, `clients/workout_session_controller.ex`, others |
| `Repo` out of controller → context | `coaches/testimonial_controller.ex:77-86,104-107`, `coaches/offer_controller.ex` |
| `case` → `with` + FallbackController | `coaches/testimonial_controller.ex`, `coaches/offer_controller.ex` |
| Add `CastAndValidate` on write actions | 37 controllers currently missing it |
| Add co-located `OpenApiSpex` operation | controllers with partial/missing operations |

---

## Migration approach

Conventions are one coherent spec; applying them is a large migration touching
~6 contexts, ~50 schemas, ~40 controllers. Slice the work **per context**
(context + its schemas + its controllers + its tests in one vertical slice), so
each slice is independently reviewable and the API contract stays coherent.
Order by risk: do the `OneTimeToken` security fix and the mechanical schema
stragglers first (low blast radius), then the per-context `Ctx`/naming
migrations.

The implementation plan (next step) breaks this ledger into those slices.
