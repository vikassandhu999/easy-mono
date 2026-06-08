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

Use specific error reasons:

```elixir
:error_atom
{:validation, changeset}
{:not_found, resource}
{:conflict, reason}
{:external, service, reason}
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

```elixir
def create(conn, params) do
  business_id = conn.assigns.current_business.id
  user_id = conn.assigns.current_user.id

  with {:ok, order} <- Orders.create_order(business_id, user_id, params) do
    conn
    |> put_status(:created)
    |> render(:show, order: order)
  end
end
```

If an action needs comments to explain the workflow, move the workflow into a context.

## Contexts

Contexts expose application verbs.

Good names:

```elixir
Orders.create_order/3
Orders.cancel_order/3
Orders.list_open_orders/2
Billing.capture_invoice/3
Accounts.invite_user/4
```

Weak names:

```elixir
Orders.run/1
Orders.call/1
Orders.process/1
OrderService.execute/1
Handler.handle/1
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
def list_active_orders(business_id, opts) do
  query =
    Order
    |> Order.for_business(business_id)
    |> Order.active()
    |> Order.newest()

  {:ok, Repo.all(paginate(query, opts))}
end
```

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

Name changesets by operation.

```elixir
def insert_changeset(struct, attrs) do
  struct
  |> cast(attrs, [:name, :email])
  |> validate_required([:name, :email])
end

def update_changeset(struct, attrs) do
  struct
  |> cast(attrs, [:name])
  |> validate_required([:name])
end
```

Avoid generic `changeset/2` unless the schema truly has one valid write path.

Cast only client-editable fields. Set trusted fields with `put_change/3`.

Read changeset values with `Ecto.Changeset.get_field/2`.

```elixir
# Bad
changeset.changes.email

# Good
Ecto.Changeset.get_field(changeset, :email)
```

Changesets should translate database constraint errors into useful changeset errors.

### Query Builders

Query builders are pure and composable. They take an optional queryable first and return `Ecto.Query`.

```elixir
def for_business(query \\ __MODULE__, business_id) do
  from q in query, where: q.business_id == ^business_id
end

def active(query \\ __MODULE__) do
  from q in query, where: q.status == :active
end

def newest(query \\ __MODULE__) do
  from q in query, order_by: [desc: q.inserted_at]
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
  business_id = conn.assigns.current_business.id
  user_id = conn.assigns.current_user.id

  with {:ok, order} <- Orders.create_order(business_id, user_id, conn.body_params) do
    conn
    |> put_status(:created)
    |> render(:show, order: order)
  end
end
```

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

Do not update `docs/api_contract.yaml` or `docs/api_contract.yml` as part of normal endpoint work. Treat those files as legacy/static artifacts unless explicitly asked to edit them.

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

## Review Checklist

Before finishing, check:

- [ ] Every tenant-owned query includes `business_id`.
- [ ] Controllers do not call `Repo`.
- [ ] Controllers do not contain business logic.
- [ ] Contexts expose clear application verbs.
- [ ] Schemas do not call `Repo`.
- [ ] Public functions return `{:ok, value}` or `{:error, reason}` for expected outcomes.
- [ ] Public functions have `@spec`.
- [ ] No `String.to_atom/1` on user input.
- [ ] No trusted IDs in `cast/3`.
- [ ] Associations are preloaded where response data needs them.
- [ ] Database constraints protect important invariants.
- [ ] Swagger/OpenAPI specs are updated when endpoint behavior changes.
- [ ] New public JSON endpoints include an OpenApiSpex operation.
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
