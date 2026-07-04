# AGENTS.md

This file is the authority for this repository. If another repository instruction conflicts with it, this file wins.

Build small, explicit, boring software. Prefer simple data flow, direct names, database guarantees, and tests over clever abstractions.

Prefer:

- deletion over addition
- names over comments
- functions over macros
- explicit arguments over hidden state
- local clarity over global cleverness

## Working Rules

### Think First

Do not guess silently.

- State assumptions when they affect the change.
- If the request has multiple valid interpretations, name them before choosing.
- If the simple path is better, say so and take it.
- If the request is unclear enough that a reasonable change would be risky, stop and ask.
- Surface tradeoffs when the requested path has meaningful cost, risk, or scope.

### Keep It Small

Write the least code that solves the problem.

- No speculative features.
- No abstractions for one call site.
- No hidden magic.
- No configurability that was not requested.
- No defensive handling for impossible states.
- No new dependencies without explicit approval.

Do not build frameworks inside the application.

If the solution feels large, simplify it before continuing.

### Change Surgically

Every changed line must trace back to the user's request.

- Inspect the code before editing.
- Preserve behavior unless the request asks for a behavior change.
- Touch only the files needed.
- Match the local style where it does not conflict with this file.
- Do not invent architecture.
- Clean up only unused code your change creates.
- Mention unrelated dead code or design debt; do not delete it unless asked.

### Verify the Goal

Turn work into checks.

```text
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
```

Examples:

- "Add validation" -> test invalid input, then make it pass.
- "Fix a bug" -> reproduce it with a test, then make it pass.
- "Refactor X" -> verify behavior before and after when practical.

Run the narrowest relevant checks. Do not claim tests passed unless they were run.

## Architecture

The dependency direction is one-way:

```text
router
  -> controller
    -> context
      -> schema / query
        -> Repo
          -> Postgres
```

Never reverse it.

| Layer | Owns | Must not do |
|---|---|---|
| Router | Paths, pipelines, plugs | Business rules |
| Controller | HTTP params, status codes, rendering | Repo calls, business logic |
| Context | Application verbs, transactions, query composition | HTTP-specific behavior |
| Schema | Data shape, relationships, changesets, pure query builders | Repo calls, request handling |
| Repo | Persistence | Business decisions |
| Postgres | Constraints, indexes, tenant isolation support | Application workflow |

## Tenant Isolation

Every query that touches tenant-owned data must be scoped by `business_id`.

If unsure whether data is tenant-owned, assume it is.

Never trust `business_id` from request params.

```elixir
# Bad
Repo.get(Order, id)

# Good
Order
|> Order.for_business(business_id)
|> Repo.get(id)
```

Set trusted identifiers from runtime context, not client input.

```elixir
# Bad
cast(attrs, [:name, :business_id, :user_id])

# Good
struct
|> cast(attrs, [:name])
|> put_change(:business_id, business_id)
|> put_change(:user_id, user_id)
```

Test tenant isolation for context functions that read, list, update, or delete tenant-owned data.

## Return Values

Public context and service functions return:

```elixir
{:ok, value}
{:error, reason}
```

Expected failures are values, not exceptions.

Use bang functions only in tests, migrations, seeds, and truly impossible states. Controllers must not call bang functions.

Error reasons are **bare atoms or an `Ecto.Changeset.t()`** — not tagged tuples. Canonical atoms: `:not_found`, `:unauthorized`, `:forbidden`, `:conflict`. Domain-specific atoms (e.g. `:read_only_source`) are allowed. Use `Ecto.Changeset.t()` for validation failures. `FallbackController` is the single place that maps these to HTTP status codes.

```elixir
# Bad
{:error, {:validation, changeset}}
{:error, {:not_found, :exercise}}
{:error, {:conflict, "already assigned"}}

# Good
{:error, changeset}
{:error, :not_found}
{:error, :conflict}
```

Do not hide errors behind vague strings.

## Controllers

Controllers are HTTP adapters.

A controller action may:

- read `conn.assigns`
- accept params
- call one context function
- choose status codes
- render responses

A controller action must not:

- call `Repo`
- build business queries
- run transactions
- perform multi-step workflows
- decide domain policy
- render custom error JSON that belongs in `FallbackController`

Use `FallbackController` for expected error translation.

Controllers read `conn.assigns.ctx` and pass it to the context. Never destructure raw ids from `conn.assigns.claims`.

```elixir
# Bad
def create(conn, params) do
  business_id = conn.assigns.current_business.id
  user_id = conn.assigns.current_user.id

  with {:ok, order} <- Orders.create_order(business_id, user_id, params) do
    conn
    |> put_status(:created)
    |> render(:show, order: order)
  end
end

# Good
def create(conn, params) do
  ctx = conn.assigns.ctx

  with {:ok, order} <- Orders.create_order(ctx, params) do
    conn
    |> put_status(:created)
    |> render(:show, order: order)
  end
end
```

If an action needs comments to explain the workflow, move the workflow into a context.

## Contexts

Contexts expose application verbs.

### Actor context (`Ctx`)

`%Easy.Ctx{business_id: uuid, user_id: uuid, role: :coach | :client, client_id: uuid | nil}` is built once in the auth plug from JWT claims and router scope. Every tenant-scoped public context function takes `%Ctx{}` as its first argument. Pure reference reads with no tenant scope (e.g. `list_muscles`, `list_equipment`) may take plain args.

### Three-case naming convention

Every domain operation falls into one of three actor-cases. The function name's shape declares the actor and target without opening the body. `_for_user`, `_for_coach_user`, `_as_coach`, and `_as_client` are **retired**.

| Case | Actor → target | Name shape | Examples |
|---|---|---|---|
| **1. Coach in system** | coach → business/system scope | `verb_noun(ctx, …)` | `create_exercise(ctx, attrs)` · `list_plans(ctx, opts)` |
| **2. Coach for a client** | coach → a specific client | `verb_noun_{for,to}_client(ctx, client_id, …)` | `list_plans_for_client(ctx, client_id)` · `assign_plan_to_client(ctx, client_id, plan_id)` |
| **3. Client themselves** | client → self | `verb_client_noun(ctx, …)` | `list_client_plans(ctx)` · `create_client_session(ctx, attrs)` |

Rules:
- Case 1 (bare `verb_noun`): operates on `ctx.business_id` scope; stamps `creator_id = ctx.user_id`.
- Case 2 (`…_for_client` / `…_to_client`): `client_id` is always the second positional argument. Authz verifies the client belongs to `ctx.business_id`.
- Case 3 (`client_` noun-prefix): target is `ctx.client_id`, never a param. No `client_id` argument.

Good names:

```elixir
Orders.create_order/2           # Case 1: (ctx, attrs)
Orders.cancel_order/2           # Case 1: (ctx, id)
Orders.list_orders_for_client/3 # Case 2: (ctx, client_id, opts)
Orders.list_client_orders/2     # Case 3: (ctx, opts)
Billing.capture_invoice/3
Accounts.invite_user/3
```

Weak names:

```elixir
Orders.run/1
Orders.call/1
Orders.process/1
OrderService.execute/1
Handler.handle/1
```

Retired suffixes that must not appear in new code:

```elixir
Orders.create_order_for_user/3         # Bad — retired _for_user
Orders.list_orders_for_coach_user/3    # Bad — retired _for_coach_user
Orders.create_order_as_coach/3         # Bad — retired _as_coach
Orders.view_order_as_client/2          # Bad — retired _as_client
```

A context function may:

- receive trusted IDs from the caller
- authorize or receive authorization results
- compose schema query builders
- call `Repo`
- run transactions
- call external services through small boundary modules
- return `{:ok, value}` or `{:error, reason}`

A context function must not:

- know about `conn`
- render JSON
- depend on Phoenix controller state
- accept trusted tenant/user identifiers from params
- return raw external-service errors without normalizing them

Compose queries at the context boundary.

```elixir
def list_active_orders(ctx, opts \\ []) do
  query =
    Order
    |> Order.for_business(ctx.business_id)
    |> Order.active()
    |> Order.newest()

  {:ok, Repo.all(paginate(query, opts))}
end
```

### List functions

List functions take one trailing `opts \\ []` keyword list, not a long positional tail. Standard pagination keys are `:offset` (default `0`) and `:limit` (default `20`, clamped to max `100`). Filter keys map to `for_*` builders. Count and list is two explicit queries returning `{:ok, %{count: n, <plural>: items}}`.

```elixir
# Bad
def list_exercises(ctx, search, muscle_ids, offset, limit), do: ...

# Good
def list_exercises(ctx, opts \\ []), do: ...
# called as: list_exercises(ctx, search: "press", muscle_ids: [...], offset: 0, limit: 20)
```

**Identity ids come from the path, not the body.** Tenant/actor/parent ids (`client_id`, `plan_id`, `meal_id`, `day`, `session_id`, …) are taken from `conn.path_params` (always strings) and passed to the context as explicit positional args (the §A7 trusted-id shape). The request **body** carries only client-editable fields, which go straight to the changeset.

`Ecto.Changeset.cast/3` is **key-agnostic** — it accepts string- or atom-keyed maps — so changeset-bound attrs need no key normalization regardless of what `CastAndValidate` produces (note: `CastAndValidate` with `struct?: false` yields **atom**-keyed maps, not string-keyed). Because ids come from the path and editable fields go through `cast`, the context never extracts a value out of the body by key — so the `Map.get("x") || Map.get(:x)` dual-key probe is retired entirely. If a context genuinely must read a non-changeset value from the body, normalize once at the controller and pass it explicitly; do not probe both key forms.

## Schemas

Schemas define data.

A schema module may contain:

- fields
- relationships
- operation-specific changesets
- pure query builders
- tiny data helpers that belong to the schema

A schema module must not call `Repo`.

### Changesets

Name changesets by operation: `insert_changeset` and `update_changeset` only. No `create_changeset`. No generic `changeset/2` for top-level schemas (embedded schemas may keep a single `changeset/2` when there is one valid write path).

Trusted identities (`business_id`, actor/`creator_id`, parent ids such as `plan_id` or `thread_id`) are **separate positional params** set with `put_change/3`, never cast, never in `attrs`. Canonical arg order: `business_id` first, then actor, then parent, then `attrs`.

```elixir
# Bad — trusted ids in attrs
def insert_changeset(struct, attrs) do
  cast(attrs, [:name, :business_id, :creator_id])
end

# Bad — create_changeset name
def create_changeset(struct, attrs), do: ...

# Good
def insert_changeset(business_id, creator_id, attrs) do
  %__MODULE__{}
  |> cast(attrs, [:name, :email])
  |> validate_required([:name, :email])
  |> put_change(:business_id, business_id)
  |> put_change(:creator_id, creator_id)
end

def insert_changeset(business_id, creator_id, plan_id, attrs) do
  %__MODULE__{}
  |> cast(attrs, [:name])
  |> put_change(:business_id, business_id)
  |> put_change(:creator_id, creator_id)
  |> put_change(:plan_id, plan_id)
end

def update_changeset(struct, attrs) do
  struct
  |> cast(attrs, [:name])
  |> validate_required([:name])
end
```

Changesets are **`Ctx`-ignorant** — they never take `%Ctx{}`. The context unpacks `ctx.business_id` / `ctx.user_id` / `ctx.client_id` into positional args.

Use `Ecto.Enum` for closed sets, not `:string` + `validate_inclusion`. Use `timestamps(type: :utc_datetime)`. Declare `binary_id` primary and foreign keys explicitly.

Read changeset values with `Ecto.Changeset.get_field/2`.

```elixir
# Bad
changeset.changes.email

# Good
Ecto.Changeset.get_field(changeset, :email)
```

Changesets should translate database constraint errors into useful changeset errors.

### Query Builders

Query builders are pure and composable. They take an optional queryable first (`query \\ __MODULE__`) and return `Ecto.Query`. They never touch `Repo`.

**Taxonomy — the prefix names the category:**

| Category | Convention | Examples |
|---|---|---|
| **Row filter** | `for_<dimension>(q, val)` — no-op on `nil`/`""` | `for_status`, `for_search`, `for_muscle_ids` |
| **Named subset** (arg-less) | bare predicate | `templates`, `active`, `published` |
| **Ordering** (arg-less) | named order | `newest`, `oldest`, `alphabetical`, `by_position` |
| **Preload** | `include_<assoc>(q, …)` | `include_workouts`, `include_muscles_and_equipment` |
| **Domain composite** | named multi-where, built from primitives | `active_for_client(q, client_id, date)` |

Rules:
- **`for_` = filter, `include_` = preload.** Never mix. **`with_*` is retired** — ambiguous between filter and preload; use `for_*` or `include_*` instead.
- **No-op on nil/blank is mandatory** for every `for_*` filter so contexts can pipe optional filters unconditionally.
- **Ordering names carry direction and a tie-break.** `newest` means `order_by: [desc: inserted_at, desc: id]`. `by_position` is the manual-order builder for schemas with a `position` field — a different concept from `newest`.
- **Preload builders live in the schema**, not hand-rolled in contexts. A preload builder over tenant-scoped children takes `business_id` to scope the nested query: `include_workouts(q, business_id)`.
- **Identity filters carry `business_id`** so tenant scope can't be forgotten. When using `for_client` or `for_coach`, do not also pipe `for_business` — scope is already baked in.

```elixir
for_business(business_id)           # tenant-wide list
for_client(business_id, client_id)  # tenant + client, scope baked in
for_coach(business_id, coach_id)    # tenant + coach

def for_business(query \\ __MODULE__, business_id) do
  from q in query, where: q.business_id == ^business_id
end

def active(query \\ __MODULE__) do
  from q in query, where: q.status == :active
end

def newest(query \\ __MODULE__) do
  from q in query, order_by: [desc: q.inserted_at, desc: q.id]
end
```

Use them at the context boundary.

```elixir
Invoice
|> Invoice.for_business(business_id)
|> Invoice.unpaid()
|> Invoice.oldest()
```

Do not hide trivial `list`, `get`, or `paginate` wrappers in schemas.

## Preloads

Preload deliberately.

If returned data needs an association, preload it before returning.

Do not rely on accidental lazy access or repeated per-row queries.

```elixir
Order
|> Order.for_business(business_id)
|> preload([:customer, :items])
|> Repo.all()
```

For list endpoints, check the rendered JSON. If the response includes associated data, the query path must preload it.

## Postgres

Application validation is not enough.

Important invariants belong in Postgres too:

- unique indexes
- foreign keys
- check constraints
- non-null constraints
- tenant-aware composite indexes
- transaction boundaries for multi-step writes

Prefer database-backed guarantees over application-only promises.

Use Ecto constraints to convert database errors into changeset errors where appropriate.

## Atom Safety

Never call `String.to_atom/1` on user input.

Map user-controlled strings explicitly.

```elixir
def status_from_param("draft"), do: {:ok, :draft}
def status_from_param("published"), do: {:ok, :published}
def status_from_param(_), do: {:error, :invalid_status}
```

Use `String.to_existing_atom/1` only when the atom set is already controlled and failure is handled.

## External HTTP

Use `Req` for outbound HTTP.

Do not introduce HTTPoison, Tesla, `:httpc`, or another HTTP stack.

Wrap external services behind small modules with explicit return values.

```elixir
PaymentsClient.capture(payment_id, amount_cents)
#=> {:ok, response} | {:error, reason}
```

External boundary modules must normalize errors before returning them to contexts.

## Specs and Docs

Add `@spec` for every public function.

Private functions get specs only when they clarify non-obvious data.

Do not add `@moduledoc`.

Do not add `@doc`.

Use names, small functions, tests, and OpenAPI contracts instead.

Remove nearby module/function docs when touching code unless explicitly instructed otherwise.

## OpenAPI

OpenAPI is the API contract. A public JSON endpoint is unfinished until the implementation, generated OpenAPI, and Swagger UI agree.

Use `OpenApiSpex` for:

- operation specs
- request schemas
- response schemas
- error schemas
- request casting and validation
- rendered OpenAPI output
- Swagger UI

For every public JSON endpoint, document:

- method
- path
- tags
- summary
- request body when a body is accepted
- success responses
- error responses
- auth/security requirements

Every new public JSON endpoint must have an OpenApiSpex operation before the endpoint is complete.

Do not add fields to JSON responses, accept request fields, or change status codes without updating the operation and schemas.

Keep the OpenAPI operation close to the controller action.

Every write action must have `OpenApiSpex.Plug.CastAndValidate` and a co-located `operation`. Controllers read `conn.assigns.ctx` and pass it to the context.

```elixir
operation :create,
  summary: "Create order",
  tags: ["orders"],
  request_body: {"Order create request", "application/json", OrderCreateRequest, required: true},
  responses: [
    created: {"Order", "application/json", OrderResponse},
    unprocessable_entity: {"Validation error", "application/json", ErrorResponse},
    unauthorized: {"Unauthorized", "application/json", ErrorResponse}
  ]

def create(conn, _params) do
  ctx = conn.assigns.ctx

  with {:ok, order} <- Orders.create_order(ctx, conn.body_params) do
    conn
    |> put_status(:created)
    |> render(:show, order: order)
  end
end
```

Exceptions (§A8):
- **`AuthController`** (signup, OTP verify, token refresh) may render raw `json(%{...})`. These are non-resource payloads; forcing them into `render(:show)` would manufacture views for nothing. Allowed exception.
- **Route naming:** new multi-word path segments are **kebab-case** (`/workout-sessions`). Existing snake_case paths (`/training_plans`) are flagged debt — migrated only with coordinated frontend + OpenAPI changes, not churned cosmetically.

Use boundary validation.

```elixir
plug OpenApiSpex.Plug.CastAndValidate, json_render_error_v2: true
```

After validation, read the validated body explicitly.

```elixir
attrs = conn.body_params
```

Prefer explicit schema modules over inline anonymous maps when the schema is reused or public.

Expose generated OpenAPI and Swagger UI intentionally.

```elixir
pipeline :api do
  plug :accepts, ["json"]
  plug OpenApiSpex.Plug.PutApiSpec, module: MyAppWeb.ApiSpec
end

scope "/api" do
  pipe_through :api

  get "/openapi", OpenApiSpex.Plug.RenderSpec, []
end

scope "/" do
  get "/swaggerui", OpenApiSpex.Plug.SwaggerUI, path: "/api/openapi"
end
```

Keep Swagger UI usable. If it cannot explain and try the API, fix the spec.

## API Contract

The generated OpenAPI spec is the source of truth.

When endpoint behavior changes, update OpenApiSpex operations, request schemas, response schemas, and validation so generated OpenAPI and Swagger UI match Phoenix behavior.

## Testing

Use `SchemaCase` for schema/model tests.

Use factories. Do not hand-roll persisted structs unless the test requires it.

```elixir
# Bad
Repo.insert!(%User{email: "a@example.com"})

# Good
user = insert(:user)
```

Test the rule, not the implementation detail.

For changesets, test:

- valid input
- missing required fields
- invalid enum/status values
- tenant/user fields are not cast from attrs
- database constraints that matter

For contexts, test:

- success
- expected failure
- tenant scoping
- not found inside the correct tenant
- cross-tenant access does not leak
- expected errors return `{:error, reason}`

For controllers, test:

- status codes
- rendered response shape
- expected fallback errors
- auth failures
- Swagger/OpenAPI request validation where relevant

For OpenAPI changes, test or validate:

- generated OpenAPI renders
- Swagger UI still loads
- documented examples are realistic and safe

## Refactoring

Refactor by removing complexity, not moving it.

When asked to refactor:

1. Delete dead code inside the requested surface.
2. Inline needless indirection.
3. Rename unclear functions.
4. Extract only when the extracted name improves understanding.
5. Move business logic out of controllers.
6. Move `Repo` calls out of schemas.
7. Move HTTP details out of contexts.
8. Move trusted ID assignment out of `cast/3`.
9. Add tests around risky behavior before changing it.
10. Keep the diff small enough to review.

Do not preserve a bad pattern when it is part of the boundary you touch or it conflicts with this file. Fix only the boundary you touch.

Unrelated dead code is a note, not a change.

## Enforcement

- Run `mix precommit` before finishing any backend change (format, compile --warnings-as-errors, credo, test).
- `mix credo` (stock checks) catches mechanical issues; the `.agents/skills/review` skill's Standards axis reviews the diff against this file; the superpowers SDD review loop carries these rules in its per-task constraints.
- Rules not yet satisfied by legacy code are tracked in `docs/superpowers/specs/2026-06-23-elixir-conventions-design.md` Part B and fixed per-context, not big-bang.

## Review Checklist

Before finishing, check:

- [ ] Every tenant-owned query includes `business_id`.
- [ ] Context functions use three-case naming (§A2): bare `verb_noun` for coach-in-system, `verb_noun_for_client` for coach-for-client, `verb_client_noun` for client-for-self. No `_for_user`, `_for_coach_user`, `_as_coach`, `_as_client`.
- [ ] Public context functions take `%Ctx{}` as first arg (Ctx-first). Never pass raw `business_id` / `user_id` positional ids from the caller.
- [ ] Controllers read `conn.assigns.ctx` and pass it to the context. No destructuring of `conn.assigns.claims` into raw ids.
- [ ] Controllers do not call `Repo`.
- [ ] Controllers do not contain business logic.
- [ ] Contexts expose clear application verbs.
- [ ] Schemas do not call `Repo`.
- [ ] Public functions return `{:ok, value}` or `{:error, reason}` for expected outcomes.
- [ ] Error reasons are bare atoms or `Ecto.Changeset.t()` — no tagged tuples (`{:validation, …}`, `{:not_found, …}`, `{:conflict, …}`).
- [ ] Public functions have `@spec`.
- [ ] No `String.to_atom/1` on user input.
- [ ] No trusted IDs in `cast/3`.
- [ ] Trusted ids use canonical arg order in changesets: `business_id` first, then actor, then parent, then `attrs`.
- [ ] Query builders use `for_*` (filter), `include_*` (preload), bare predicates (named subsets), and named-order functions. No `with_*`.
- [ ] Identity filters `for_client`/`for_coach` carry `business_id`; don't also pipe `for_business` when using them.
- [ ] List functions take one trailing `opts \\ []`; pagination defaults `offset: 0`, `limit: 20`, max `100`.
- [ ] `attrs` is string-keyed. No `Map.get("x") || Map.get(:x)` dual-key probes.
- [ ] Associations are preloaded where response data needs them.
- [ ] Database constraints protect important invariants.
- [ ] Swagger/OpenAPI specs are updated when endpoint behavior changes.
- [ ] New public JSON endpoints include an OpenApiSpex operation and `CastAndValidate`.
- [ ] Swagger UI still renders after API changes.
- [ ] Tests cover success and failure.
- [ ] Tests cover tenant isolation for tenant-owned data.
- [ ] New code is simpler than the code it replaced.

## Response Format

When reporting back, be direct:

```text
Changed:
- ...

Tested:
- ...

Notes:
- ...
```

Do not claim tests were run if they were not.

Do not hide uncertainty.

Do not call work complete if contract, tests, tenant isolation, or Swagger/OpenAPI behavior are unresolved.
