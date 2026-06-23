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
%Easy.Ctx{business_id: uuid, user_id: uuid, role: :coach | :client, client_id: uuid | nil}
```

- Built once in the auth plug from JWT claims + router scope.
- `role` exists so a context function can guard its expected actor
  (`assert_coach(ctx)` / `assert_client(ctx)`) — cheap insurance against a coach
  function being wired under a client route. The function name declares intent;
  the guard enforces it.
- `client_id` is resolved once in the auth plug for `:client` actors (`user_id →
  client_id`), `nil` for coaches. Client-owned data is keyed by `client_id`, so
  Case-3 self-service reads `ctx.client_id` and the query layer never does the
  `user_id → client_id` lookup.

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
  `for_business/2` builder. Full builder taxonomy in §A6.
- **Trusted fields** are set with `put_change/3`, never `cast`. Cast only
  client-editable fields. Full identity/trust rules in §A7.
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

### A6. Query builder taxonomy

Query builders are pure, composable, take an optional queryable first
(`query \\ __MODULE__`), and return `Ecto.Query`. They never touch `Repo`.
`Repo.all` / `aggregate` / pagination live in the context, not the schema.

The **prefix names the category** so a call site reads its own meaning:

| Category | Convention | Examples |
|---|---|---|
| **Row filter** | `for_<dimension>(q, val)` — no-ops on `nil`/`""` | `for_status`, `for_search`, `for_muscle_ids` (identity filters `for_business`/`for_client`/`for_coach` follow §A7) |
| **Named subset** (arg-less) | bare predicate | `templates`, `active`, `published` |
| **Ordering** | named order, arg-less | `newest`, `oldest`, `alphabetical`, `by_position` |
| **Preload** | `include_<assoc>(q, …)` — *reserved for preloads* | `include_workouts`, `include_muscles_and_equipment`, `include_elements` |
| **Domain composite** | named multi-`where`, built **from** the primitives | `active_for_client(q, client_id, date)` |

Rules:

- **`for_` = filter, `include_` = preload.** Never mix. `with_*` is retired —
  it read ambiguously as a filter ("plans *with* status active"); `include_`
  only ever means "also load this association."
- **No-op on nil/blank is mandatory** for every `for_*` filter, so contexts pipe
  optional filters with zero conditionals
  (`for_client(q, nil) → q`, `for_search(q, "") → q`).
- **Ordering names carry direction and tie-breaks.** `newest` is
  `order_by: [desc: inserted_at, desc: id]` — the second key keeps pagination
  deterministic. A generic `ordered(q, dir)` can't encode that, so it is not
  used. `by_position` is the manual-order builder for schemas with a `position`
  field (Workout, Meal, PlannedSet, PlanItem) — a *different* concept from
  `newest`, not a synonym.
- **Preloads live in the schema**, never hand-rolled `from(... preload: ...)` in
  a context. A preload builder over tenant-scoped children **takes
  `business_id`** and scopes the nested query
  (`include_workouts(q, business_id)`), so nested reads can't leak across
  tenants.
- **Domain composites are sugar over primitives** — `active_for_client` is built
  by composing `for_client`/`active`/date filters internally, never by
  duplicating `where` logic.
- **Builder `@spec` is uniform:** queryable in, query out —
  `@spec for_status(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()`.

### A7. Identities, trust, and changesets

- **Identities are separate positional params, never in `attrs`.** A changeset
  casts only client-editable fields; every trusted FK —
  tenant (`business_id`), actor (`creator_id`), and parent
  (`plan_id`, `thread_id`, …) — is a separate argument set with `put_change/3`.
- **Canonical arg order:** `business_id` first, then actor, then parent, then
  `attrs`:

  ```elixir
  insert_changeset(business_id, creator_id, attrs)
  insert_changeset(business_id, creator_id, plan_id, attrs)
  ```

  Fix `Workout`/`Meal`, which put `plan_id` first. Cap at ~3 ids; more than that
  signals a tangled schema.
- **Changesets stay `Ctx`-ignorant.** A changeset never takes `%Ctx{}`. The
  context unpacks `ctx.business_id` / `ctx.user_id` / `ctx.client_id` into
  positional args, keeping the data layer free of the application layer.
- **Identity filters carry `business_id` so tenant scope can't be forgotten:**

  ```elixir
  for_business(business_id)              # tenant-wide list (Case 1)
  for_client(business_id, client_id)     # tenant + client, scope baked in
  for_coach(business_id, coach_id)       # tenant + coach
  ```

  When using `for_client` / `for_coach`, do **not** also pipe `for_business` —
  it is already scoped. `for_business` is for unfiltered tenant lists.
- **Client-owned data is keyed by `client_id`.** Case 2 passes `client_id` from
  the param; Case 3 passes `ctx.client_id`. Both reach the same
  `for_client/2` builder. There is no `for_user` builder.

### A8. Documented exceptions

- **AuthController** (signup, OTP verify, token refresh, etc.) renders raw
  `json(%{...})`. These are not resource views; forcing them into `render(:show)`
  would manufacture views for non-resource payloads. Allowed exception.
- **Route naming:** new multi-word path segments are **kebab-case**
  (`/workout-sessions`). Existing snake_case paths (`/training_plans`) are
  **flagged debt** — migrated only with coordinated frontend + OpenAPI changes,
  not churned for cosmetics.

### A9. List functions, filters, and pagination

- **One trailing `opts` keyword list**, never a long positional tail. List
  functions are `list_x(ctx, opts \\ [])`. Replaces
  `list_exercises(ctx, search, muscle_ids, offset, limit)`.

  ```elixir
  list_plans(ctx, status: :active, search: "press", offset: 0, limit: 20)
  ```

- **Standard pagination keys** are `:offset` and `:limit`, read off `opts` at the
  context boundary. Defaults `offset: 0`, `limit: 20`, **clamped to `max 100`**
  in the context before hitting `Easy.Utils.paginate/3`. Offset/limit, not
  cursors (frontend pages by offset; cursors are YAGNI).
- **Filter keys are domain-specific** (`:status`, `:search`, `:muscle_ids`) and
  map one-to-one onto `for_*` builders, each no-op on `nil`. The context pipes
  them unconditionally.
- **count + list is two explicit queries** over the same filtered base — count
  the base, then paginate the base — returned as
  `{:ok, %{count: n, <resource_plural>: items}}` (`%{count, plans}`,
  `%{count, exercises}`). No shared abstraction; the two-query shape is written
  out in each list function.
- **Search** is trimmed once at the context boundary (`String.trim/1`); the
  builder receives a clean term, no-ops on `""`, and uses `ilike(col, "%term%")`
  (case-insensitivity is `ilike`'s job — no manual `downcase`).

### A10. Attrs and error reasons

- **`attrs` is always string-keyed.** Public write endpoints run
  `CastAndValidate`, so the body reaches the context with string keys. Contexts
  and changesets treat `attrs` as string-keyed; the
  `Map.get("x") || Map.get(:x)` dual-key pattern is deleted. Tests pass
  string-keyed attrs.
- **Error reasons are bare atoms or a changeset**, not tagged tuples. Canonical
  set: `:not_found`, `:unauthorized`, `:forbidden`, `:conflict`, domain-specific
  atoms (`:read_only_source`, …), and `Ecto.Changeset.t()` for validation
  failures. `FallbackController` is the **single place** that maps these to
  `Easy.Error` + HTTP status — contexts never build HTTP-shaped errors.

### A11. Transactions

- **`Ecto.Multi` for multi-step writes** — composable, inspectable, each step
  named. Use it whenever a workflow writes more than one row or mixes a write
  with a dependent read.
- **Bare `Repo.transaction(fn -> ... end)` only for trivial** read-modify-write
  on a single aggregate. Both live in the context, never in a schema or
  controller.

### A12. Function structure

Canonical internal shape of a context function:

```elixir
def update_exercise(%Ctx{} = ctx, id, attrs) do
  with {:ok, ex} <- get_owned_exercise(ctx, id) do   # fetch-or-fail, scoped
    ex
    |> Exercise.update_changeset(attrs)               # build
    |> Repo.update()                                  # persist
  end
end
```

- **`with` for the happy path.** Expected errors fall through untouched and reach
  `FallbackController`.
- **Mutations fetch first** via a scoped `get_owned_*` inside `with`, so tenant
  ownership is enforced before any write. Cross-tenant fetch → `:not_found`.
- **Reads** pipe builders → `Repo` → `ok_or_not_found/1`.
- **One public function = one verb.** No internal role branching — the three-case
  naming (§A2) already splits actors into separate functions.
- Results are normalized by tiny private helpers (`ok_or_not_found`,
  `preload_*`), never inline.

### A13. Authorization in the context layer

Three layers, each with one job:

1. **Role gate = router scope.** The `:coach_api` / `:client_api` pipelines
   separate endpoints; this is the primary actor gate. Per "no defensive
   handling for impossible states," contexts do **not** re-assert role on every
   function.
2. **Tenant + ownership = scoped queries.** `for_business` / `for_client` bake
   scope in. A cross-tenant or wrong-owner lookup returns empty → `:not_found`,
   **never `:forbidden`** (no existence leak).
3. **Explicit role guard only when one function genuinely serves both actors and
   must diverge** — rare. Then `with :ok <- assert_coach(ctx)` returning
   `:forbidden`. Not blanket ceremony.

No policy/Authz framework (YAGNI). `role` on `Ctx` earns its keep through
stamping (e.g. thread `author_type`) and the occasional guard.

### A14. Function ordering within a module

```
1. use / alias / import / @type / @attrs
2. public READS    — list, get, get_owned        (three-case grouped)
3. public WRITES   — create, update, delete
4. public DOMAIN verbs — duplicate, assign, copy, …
5. sub-resource block (if the module owns one) — same order inside
6. private helpers — load_*, preload_*, ok_or_not_found
```

- Reads before writes; CRUD order within each.
- Private helpers always last.
- **No mandatory comment headers** (names over comments). The consistent order is
  the navigation; a light `# Muscles` divider is allowed only to separate a
  sub-resource block.

### A15. Parent-entity ownership

Premise: **every tenant-owned table denormalizes `business_id`**, so tenancy is
always a direct filter, never a join.

- **Create-under-parent** (no child row yet): fetch the parent scoped first, then
  attach.

  ```elixir
  with {:ok, _plan} <- get_owned_plan(ctx, plan_id) do
    Workout.insert_changeset(ctx.business_id, plan_id, attrs) |> Repo.insert()
  end
  ```

  The scoped getter proves the parent is in the tenant (and, for client-owned
  parents, that it belongs to `ctx.client_id`, since the getter uses
  `for_client`). Then `put_change(parent_id)` + `put_change(:business_id)`.

- **Read/update/delete an existing child**: scope the child query directly by
  both tenant and parent in one query — no separate parent fetch.

  ```elixir
  Workout |> for_business(bid) |> for_plan(plan_id) |> Repo.get(id)
  # wrong tenant OR wrong parent → nil → :not_found
  ```

- **Check the immediate parent only.** Deeper ancestry is guaranteed
  transitively — every level denormalizes `business_id`, and each parent was
  already scoped when fetched/created.
- Wrong tenant or wrong parent → `:not_found`, never `:forbidden`.

**OPEN (parked):** client ownership on deep nesting (e.g. `performed_set` whose
owning `client_id` rides through `session`). Two candidates — (A) scope through
the parent that carries `client_id`, or (B) denormalize `client_id` onto hot
client-owned tables (sessions, sets, logs) for a direct `for_client` filter.
Decision deferred.

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

### Query builders (§A6/§A7)

| Rule | Fix targets |
|---|---|
| `with_*` preload → `include_*` | `training_plan.ex` (`with_workouts`, `with_plan_items`), `workout.ex` (`with_elements`) |
| `load_*` preload → `include_*` | `exercise.ex:116` (`load_muscles_and_equipment`) |
| `with_*` filter → `for_*` | `training_plan.ex:125` (`with_status` → `for_status`) |
| Ordering name → `newest` | `exercise.ex:111` (`newest_first`) |
| Manual order → `by_position` | `workout.ex`, `nutrition/meal.ex`, `planned_set`, `plan_item` (`ordered`) |
| Scope-or-system → one name | `exercise.ex:88` (`owned_or_system`) vs `nutrition/food.ex` (`for_business_or_system`) — pick `for_business_or_system` |
| Identity filters carry `business_id` | audit `for_client`/`for_coach` builders that take only the id |
| Preloads in schema, not context | `nutrition_plans.ex` hand-rolled preload `from`s (`with_full_preloads`, `with_meal_and_items`, …) → schema `include_*` builders |

### Lists, attrs, transactions (§A9–A11)

| Rule | Fix targets |
|---|---|
| Positional list tail → `opts` keyword | `exercises.ex` (`list_exercises/5`), `clients.ex` (`list_clients/6`), and every other multi-arg `list_*` |
| Delete dual-key `Map.get("x") \|\| Map.get(:x)` | `exercises.ex:80-81,116-117`, others doing string/atom attr probing |
| Clamp `limit` (default 20, max 100) at context | all paginated `list_*` |

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
