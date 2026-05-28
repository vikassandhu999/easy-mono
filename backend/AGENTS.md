# AGENTS.md

This file is the authority for this repository.

Keep the code clear, small, boring, and hard to misuse. Prefer direct names, explicit data flow, simple functions, database constraints, and tests over clever abstractions.

If another repository instruction conflicts with this file, this file wins.

## Core Principle

Clear is better than clever.

A good change is small, named well, easy to test, and easy to delete. Do not build frameworks inside the application. Do not hide work behind magic. Do not add an abstraction until two real call sites prove it belongs.

Prefer:

- deletion over addition
- names over comments
- functions over macros
- explicit arguments over hidden state
- boring code over impressive code
- local clarity over global cleverness

## Project Shape

Use this dependency direction:

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

If you are unsure whether data is tenant-owned, assume it is.

Never trust `business_id` from request params.

```elixir
# Bad
Repo.get(Order, id)

# Good
Order
|> Order.for_business(business_id)
|> Repo.get(id)
```

Set `business_id` and `user_id` from trusted runtime context.

Do not cast trusted identifiers from client input.

```elixir
# Bad
cast(attrs, [:name, :business_id, :user_id])

# Good
struct
|> cast(attrs, [:name])
|> put_change(:business_id, business_id)
|> put_change(:user_id, user_id)
```

Tenant isolation must be tested for context functions that read, update, delete, or list tenant-owned data.

## Return Values and Errors

Public context and service functions return one of these:

```elixir
{:ok, value}
{:error, reason}
```

Expected failures are values, not exceptions.

Use bang functions only for tests, migrations, seeds, and truly impossible states. Controllers must not call bang functions.

Prefer clear error reasons:

```elixir
:error_atom
{:validation, changeset}
{:not_found, resource}
{:conflict, reason}
{:external, service, reason}
```

Do not hide errors behind vague values.

```elixir
# Bad
{:error, "Something went wrong"}

# Good
{:error, {:not_found, Order}}
```

## Phoenix Rules

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

Keep controller actions short. If an action needs comments to explain the workflow, move the workflow into a context.

## Context Rules

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

## Ecto Schema Rules

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

Cast only client-editable fields.

Set trusted fields programmatically with `put_change/3`.

Read changeset values with `Ecto.Changeset.get_field/2`.

```elixir
# Bad
changeset.changes.email

# Good
Ecto.Changeset.get_field(changeset, :email)
```

Changesets should translate database constraint errors into useful error values.

### Query Builders

Query functions are pure and composable.

They take an optional queryable as the first argument and return `Ecto.Query`.

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

Use query builders like this:

```elixir
Invoice
|> Invoice.for_business(business_id)
|> Invoice.unpaid()
|> Invoice.oldest()
```

Do not hide trivial `list`, `get`, or `paginate` wrappers in schemas.

The context composes the query and calls `Repo`.

## Preloads and N+1

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

## Postgres Rules

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

Use explicit mappings for user-controlled strings.

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

External boundary modules should normalize errors before returning them to contexts.

## Specs and Docs

Add `@spec` for every public function.

Private functions get specs only when they clarify non-obvious data.

Do not add `@moduledoc`.

Do not add `@doc`.

Use better names, smaller functions, tests, and API contracts instead.

Remove module/function docs when touching nearby code unless explicitly instructed otherwise.

## Swagger / OpenAPI

Swagger is not decoration.

OpenAPI is part of the API contract. A Phoenix endpoint is unfinished until the implementation, generated OpenAPI, Swagger UI, and checked-in contract agree.

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

Do not add fields to JSON responses without updating the schema.

Do not accept new request fields without updating the schema.

Do not change status codes without updating operation responses.

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

Expose the generated spec and Swagger UI intentionally.

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

Keep Swagger UI useful. If it cannot be used to understand and try the API, fix the spec.

## API Contract

`docs/api_contract.yaml` is part of the code.

Update it when you:

- create an endpoint
- delete an endpoint
- change an endpoint path
- change an endpoint method
- change a request body
- change a response body
- change a status code
- change an enum
- change a schema type
- change validation that affects API behavior
- change authentication or authorization behavior visible to clients

Follow `docs/api_contract_rules.md` for the contract edit workflow and validation checklist.

If Phoenix behavior, generated OpenAPI, Swagger UI, and `docs/api_contract.yaml` disagree, the change is not done.

## Testing

Use `SchemaCase` for schema/model tests.

Use factories.

Do not hand-roll persisted structs unless the test requires it.

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

For API contract changes, test or validate:

- generated OpenAPI renders
- Swagger UI still loads
- checked-in contract matches behavior
- documented examples are realistic and safe

## Refactoring Protocol

When asked to refactor:

1. Delete dead code first.
2. Inline needless indirection.
3. Rename unclear functions.
4. Extract only when the extracted name improves understanding.
5. Move business logic out of controllers.
6. Move `Repo` calls out of schemas.
7. Move HTTP details out of contexts.
8. Move trusted ID assignment out of `cast/3`.
9. Add tests around risky behavior before changing it.
10. Keep the diff small enough to review.

A refactor that only moves complexity is not a refactor.

A refactor that reduces names, branches, and hidden state is usually good.

Do not preserve a bad pattern for consistency. Fix the pattern at the boundary you touch.

## Change Discipline

Before editing, inspect the existing code.

Identify the smallest useful change.

Preserve behavior unless the task explicitly asks for a behavior change.

Change only the files needed.

Add or update tests for the behavior touched.

Run the narrowest relevant checks.

Do not do drive-by rewrites.

Do not invent architecture.

Do not add dependencies without explicit approval.

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
- [ ] `docs/api_contract.yaml` is updated when endpoint behavior changes.
- [ ] Swagger UI still renders after API changes.
- [ ] Tests cover success and failure.
- [ ] Tests cover tenant isolation for tenant-owned data.
- [ ] New code is simpler than the code it replaced.

## Agent Response Format

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

Do not say a refactor is complete if contract, tests, tenant isolation, or Swagger/OpenAPI behavior are still unresolved.
