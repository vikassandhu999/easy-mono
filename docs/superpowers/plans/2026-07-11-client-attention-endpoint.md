# Client attention endpoint implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a paginated coach endpoint that returns visible active clients requiring attention, with the approved priority order and total count.

**Architecture:** `Easy.Clients` owns one deep read interface that filters and counts attention clients in SQL before pagination, then applies the shared virtual-flag annotation to the returned page. `ClientController` and `ClientJSON` adapt that interface to `GET /v1/coach/clients/attention`; OpenAPI reuses the full `Client` item schema and generates hooks for both frontend apps.

**Tech Stack:** Elixir, Phoenix, Ecto, PostgreSQL, OpenApiSpex, ExUnit, RTK Query code generation.

## Global constraints

* Include only visible clients whose status is `active` and whose `intake_incomplete`, `needs_plan`, or `expiring_soon` condition is true.
* Include both onboarding and coaching stages. Exclude pending and inactive clients.
* Sort by intake incomplete, needs plan, then expiring soon; tie-break with `inserted_at DESC, id DESC`.
* Count eligible clients before pagination. Default `offset` to 0 and `limit` to 20; clamp limit to 0 through 100.
* Return each client once with the full `Client` response shape and all three virtual flags.
* Keep generalized attention signals, popup UI, dashboard wiring, and nudge actions out of scope.
* Follow `backend/AGENTS.md`; tenant-scoped public context functions are Ctx-first.

---

### Task 1: Add the attention read model

**Files:**

* Modify: `backend/lib/easy/clients.ex:15-310`
* Test: `backend/test/easy/clients/read_boundary_test.exs:124-168`

**Interfaces:**

* Consumes: `Client.visible_to/2`, `Client.accepted/1`, `FormAssignment`, `TrainingPlan`, `Easy.Nutrition.Plan`, and `put_attention_flags_for_clients/2`.
* Produces: `Easy.Clients.list_attention_clients/2 :: {:ok, %{clients: [Client.t()], count: non_neg_integer()}}`.

- [ ] **Step 1: Write failing context tests**

Add a `describe "list_attention_clients/2"` block. Build three active clients so each has one highest-priority reason: an intake client with an open intake assignment and an active training plan, a needs-plan client with no active plan, and an expiring client with an active training plan plus `subscription_ends_on: Date.add(Date.utc_today(), 3)`. Assert:

```elixir
assert {:ok, %{count: 3, clients: clients}} = Clients.list_attention_clients(ctx)
assert Enum.map(clients, & &1.id) == [intake.id, needs_plan.id, expiring.id]
assert Enum.find(clients, &(&1.id == intake.id)).intake_incomplete
assert Enum.find(clients, &(&1.id == needs_plan.id)).needs_plan
assert Enum.find(clients, &(&1.id == expiring.id)).expiring_soon
```

Add assertions that an active client with several flags appears once, active onboarding and coaching clients are included, and pending and inactive clients are excluded. Add a pagination assertion:

```elixir
assert {:ok, %{count: 3, clients: [_one]}} =
         Clients.list_attention_clients(ctx, offset: 0, limit: 1)
```

Add visibility coverage using `trainer_ctx/1`: an assigned trainer sees only assigned attention clients, the owner sees all attention clients in the business, and neither sees another business's clients.

- [ ] **Step 2: Run the context tests to verify failure**

Run from `backend/`:

```bash
mix test test/easy/clients/read_boundary_test.exs
```

Expected: failure because `Easy.Clients.list_attention_clients/2` is undefined.

- [ ] **Step 3: Implement the context interface**

Add the public Ctx-first function:

```elixir
@spec list_attention_clients(Ctx.t(), keyword()) ::
        {:ok, %{clients: [Client.t()], count: non_neg_integer()}}
def list_attention_clients(%Ctx{} = ctx, opts \\ []) do
  offset = max(Keyword.get(opts, :offset, 0), 0)
  limit = min(max(Keyword.get(opts, :limit, 20), 0), 100)

  base =
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.visible_to(ctx)
    |> Client.accepted()
    |> attention_clients(ctx.business_id)

  {:ok,
   %{
     count: Repo.aggregate(base, :count, :id),
     clients:
       base
       |> order_attention_clients(ctx.business_id)
       |> Easy.Utils.paginate(offset, limit)
       |> Client.include_preloads(ctx.business_id)
       |> Repo.all()
       |> put_attention_flags_for_clients(ctx.business_id)
   }}
end
```

Add private correlated subqueries for open intake, active training, and active nutrition. Use them in `attention_clients/2` so the SQL predicate is:

```elixir
open_intake? or (not active_training? and not active_nutrition?) or expiring_soon?
```

`expiring_soon?` uses `Date.utc_today()` and `Date.add(today, @expiring_soon_days)`. `order_attention_clients/2` uses a SQL `CASE` with the same correlated predicates: intake priority 1, needs-plan priority 2, otherwise expiring priority 3, followed by descending insertion time and ID. Keep the query helpers private to `Easy.Clients`; cross-domain attention logic does not belong in the `Client` schema.

- [ ] **Step 4: Run the context tests to verify success**

Run:

```bash
mix test test/easy/clients/read_boundary_test.exs
```

Expected: all tests in the file pass.

- [ ] **Step 5: Commit the read model**

```bash
git add backend/lib/easy/clients.ex backend/test/easy/clients/read_boundary_test.exs
git commit -m "feat(clients): add attention read model"
```

---

### Task 2: Expose the coach HTTP and OpenAPI contract

**Files:**

* Modify: `backend/lib/easy_web/router.ex:107-113`
* Modify: `backend/lib/easy_web/controllers/coaches/client_controller.ex:1-240`
* Modify: `backend/lib/easy_web/controllers/coaches/client_json.ex:1-13`
* Modify: `backend/lib/easy_web/open_api/schemas/client.ex:156-178`
* Test: `backend/test/easy_web/controllers/coaches/client_controller_test.exs:700-850`

**Interfaces:**

* Consumes: `Clients.list_attention_clients/2` from Task 1 and the shared OpenAPI `Client` schema.
* Produces: `GET /v1/coach/clients/attention`, operation ID `listAttentionClients`, and `ClientAttentionListResponse`.

- [ ] **Step 1: Write failing controller tests**

Create a `describe "GET /v1/coach/clients/attention"` block. Assert that the route returns only an active attention client, validates the complete rendered entity against the `Client` OpenAPI schema, and validates the whole response against `ClientAttentionListResponse`:

```elixir
conn = get(conn, "/v1/coach/clients/attention?offset=0&limit=1")
assert %{"count" => 1, "data" => [client]} = json_response(conn, 200)
assert client["id"] == attention_client.id
assert_schema(client, "Client", EasyWeb.ApiSpec.spec())
assert_schema(json_response(conn, 200), "ClientAttentionListResponse", EasyWeb.ApiSpec.spec())
```

Add tests for an empty `200` response, unauthenticated rejection, and route precedence by asserting the request reaches the attention action rather than returning the client-detail not-found response.

- [ ] **Step 2: Run the controller tests to verify failure**

Run:

```bash
mix test test/easy_web/controllers/coaches/client_controller_test.exs
```

Expected: failure because `/clients/attention` is matched as `:id` or the attention response schema/action is absent.

- [ ] **Step 3: Add the schema, renderer, controller action, and route**

Add `EasyWeb.OpenApi.Schemas.ClientAttentionListResponse` next to `ClientListResponse`:

```elixir
OpenApiSpex.schema(%{
  title: "ClientAttentionListResponse",
  type: :object,
  additionalProperties: false,
  properties: %{
    data: %Schema{type: :array, items: Client},
    count: %Schema{type: :integer, minimum: 0}
  },
  required: [:data, :count]
})
```

Add `ClientJSON.attention/1`:

```elixir
@spec attention(map()) :: map()
def attention(%{clients: clients, count: count}) do
  %{data: Enum.map(clients, &data/1), count: count}
end
```

Add the `ClientController` operation and action:

```elixir
operation :attention,
  summary: "List clients needing attention",
  description: "Lists visible active clients with intake, plan, or subscription attention flags.",
  operation_id: "listAttentionClients",
  security: [%{"bearerAuth" => []}],
  parameters: [
    Operation.parameter(:offset, :query, :integer, "Number of clients to skip", required: false),
    Operation.parameter(:limit, :query, :integer, "Maximum clients to return", required: false)
  ],
  responses: [
    ok: {"Attention clients", "application/json", ClientAttentionListResponse},
    unauthorized: {"Unauthorized", "application/json", ErrorResponse}
  ]

@spec attention(Plug.Conn.t(), map()) :: Plug.Conn.t()
def attention(conn, params) do
  opts = [
    offset: parse_integer(params, "offset", 0),
    limit: parse_integer(params, "limit", 20)
  ]

  with {:ok, %{clients: clients, count: count}} <-
         Clients.list_attention_clients(conn.assigns.ctx, opts) do
    render(conn, :attention, clients: clients, count: count)
  end
end
```

Declare `get "/clients/attention", ClientController, :attention` before `get "/clients/:id"`.

- [ ] **Step 4: Run controller and route coverage tests**

Run:

```bash
mix test test/easy_web/controllers/coaches/client_controller_test.exs test/easy_web/open_api_route_coverage_test.exs
```

Expected: both test files pass.

- [ ] **Step 5: Commit the HTTP contract**

```bash
git add backend/lib/easy_web/router.ex backend/lib/easy_web/controllers/coaches/client_controller.ex backend/lib/easy_web/controllers/coaches/client_json.ex backend/lib/easy_web/open_api/schemas/client.ex backend/test/easy_web/controllers/coaches/client_controller_test.exs
git commit -m "feat(api): expose client attention endpoint"
```

---

### Task 3: Generate consumers and run repository gates

**Files:**

* Modify: `frontend/openapi/easy-openapi.json`
* Generate (ignored): `frontend/openapi/coach.openapi.json`
* Generate (ignored): `frontend/openapi/client.openapi.json`
* Modify: `frontend/apps/coachapp-v2/src/api/generated.ts`
* Verify unchanged or regenerate if required: `frontend/apps/clientapp-v2/src/api/generated.ts`
* Modify: `docs/superpowers/plans/2026-07-11-client-attention-endpoint.md`

**Interfaces:**

* Consumes: OpenAPI operation ID `listAttentionClients`.
* Produces: generated `useListAttentionClientsQuery` in the coachapp contract; the clientapp generated contract remains consistent with its split OpenAPI document.

- [ ] **Step 1: Generate OpenAPI documents and frontend clients**

From the repository root run:

```bash
just gen-api
```

Expected: the coach OpenAPI document contains `/v1/coach/clients/attention`; coachapp generated code contains `listAttentionClients` and `useListAttentionClientsQuery`. Review formatter writes before staging. The clientapp document must not expose the coach route.

- [ ] **Step 2: Run focused generated-contract checks**

From `frontend/` run:

```bash
pnpm exec biome check apps/coachapp-v2/src/api/generated.ts apps/clientapp-v2/src/api/generated.ts
pnpm -C apps/coachapp-v2 build
pnpm -C apps/clientapp-v2 build
```

Expected: generated files pass Biome and both builds exit 0. Record any pre-existing CSS-minification or bundle-size warnings.

- [ ] **Step 3: Run backend and repository gates**

From `backend/` run:

```bash
mix precommit
```

From the repository root run:

```bash
just check-rm
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 4: Audit scope and commit generated consumers**

Confirm the diff contains only the endpoint, tests, OpenAPI artifacts, generated clients, and plan progress. Confirm no popup or dashboard UI wiring was added.

```bash
git add frontend/openapi frontend/apps/coachapp-v2/src/api/generated.ts frontend/apps/clientapp-v2/src/api/generated.ts docs/superpowers/plans/2026-07-11-client-attention-endpoint.md
git commit -m "chore(api): generate client attention contract"
```
