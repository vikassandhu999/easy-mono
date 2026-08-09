# Client Context ID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the authenticated active client once at each request/socket boundary and reuse its ID throughout client-self domain operations.

**Architecture:** `Authenticate` continues to build the claim-derived base `%Easy.Ctx{}`. The HTTP active-client plug and client WebSocket connect each load the accepted, tenant-scoped client once and set `ctx.client_id`; client-self contexts scope reads and writes with that trusted ID instead of resolving identity again from `user_id`.

**Tech Stack:** Elixir, Phoenix plugs/channels, Ecto/Postgres, ExUnit, Phoenix controller tests.

## Global Constraints

- Keep tenant and active-client authorization at the HTTP and socket boundaries.
- Store only `client_id` on `Easy.Ctx`; do not store an Ecto client struct or add it to JWT/session claims.
- Coach and owner contexts keep `client_id: nil`.
- Coach-for-client authorization queries remain unchanged.
- Use existing dependencies only.
- Preserve the user's untracked `.claude/skills/first-principles-edit/` directory.

---

### Task 1: Prove the duplicate request identity read

**Files:**
- Modify: `backend/test/easy_web/controllers/clients/workout_session_controller_test.exs`

**Interfaces:**
- Consumes: authenticated `GET /v1/client/training-sessions`
- Produces: a regression test requiring exactly one `clients` identity query per request and a query count independent of returned session count

- [ ] **Step 1: Write the failing request-level regression test**

Add a telemetry-backed query capture around two authenticated list requests: one with one session, then one after adding another session. Assert both total query counts are equal and each request contains exactly one `SELECT` from `clients`.

```elixir
test "resolves client identity once with a query count independent of session count", ctx do
  insert(:workout_session, client: ctx.client, business: ctx.business)

  {_conn, one_session_queries} = capture_queries(fn -> get(ctx.conn, "/v1/client/training-sessions") end)

  insert(:workout_session, client: ctx.client, business: ctx.business, state: :completed)

  {_conn, two_session_queries} =
    capture_queries(fn ->
      build_conn()
      |> authenticate_client(ctx.client)
      |> get("/v1/client/training-sessions")
    end)

  assert length(two_session_queries) == length(one_session_queries)
  assert Enum.count(one_session_queries, &client_identity_query?/1) == 1
  assert Enum.count(two_session_queries, &client_identity_query?/1) == 1
end
```

Classify only identity reads:

```elixir
defp client_identity_query?(query) do
  String.starts_with?(query, "SELECT") and String.contains?(query, ~s(FROM "clients"))
end
```

Use the existing repo telemetry event and sandbox allowance pattern already present in `backend/test/easy/sessions_test.exs`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `cd backend && mix test test/easy_web/controllers/clients/workout_session_controller_test.exs`

Expected: the new assertion reports two client identity queries because the active-client plug discards its read and `Easy.Sessions` resolves the same client again.

---

### Task 2: Carry `client_id` from boundaries through client-self contexts

**Files:**
- Modify: `backend/lib/easy/ctx.ex`
- Modify: `backend/lib/easy/clients.ex`
- Modify: `backend/lib/easy_web/plugs/ensure_active_client.ex`
- Modify: `backend/lib/easy_web/channels/user_socket.ex`
- Modify: `backend/lib/easy/attachments.ex`
- Modify: `backend/lib/easy/forms.ex`
- Modify: `backend/lib/easy/meal_logs.ex`
- Modify: `backend/lib/easy/nutrition_plans.ex`
- Modify: `backend/lib/easy/sessions.ex`
- Modify: `backend/lib/easy/training_plans.ex`
- Modify: `backend/lib/easy/weight_entries.ex`
- Modify: `backend/lib/easy/chat.ex`

**Interfaces:**
- Consumes: `%Easy.Ctx{business_id, user_id, coach_id, owner?}` from authentication plus an accepted tenant-scoped `Easy.Clients.Client`
- Produces: `%Easy.Ctx{client_id: Ecto.UUID.t() | nil}`; `Easy.Clients.get_active_client/1`; client-self functions scoped by `ctx.client_id`

- [ ] **Step 1: Add the context field and active-client loader**

Extend the struct/type only:

```elixir
defstruct [:business_id, :user_id, :coach_id, :client_id, owner?: false]

@type t :: %__MODULE__{
        business_id: Ecto.UUID.t(),
        user_id: Ecto.UUID.t(),
        coach_id: Ecto.UUID.t() | nil,
        client_id: Ecto.UUID.t() | nil,
        owner?: boolean()
      }
```

Replace `Clients.active_client?/1` with a loader returning the accepted row:

```elixir
@spec get_active_client(Ctx.t()) :: {:ok, Client.t()} | {:error, :not_found}
def get_active_client(%Ctx{} = ctx) do
  Client
  |> Client.for_business(ctx.business_id)
  |> Client.for_user(ctx.user_id)
  |> Client.accepted()
  |> Repo.one()
  |> ok_or_not_found()
end
```

- [ ] **Step 2: Enrich HTTP and socket contexts at the authorization boundary**

The HTTP plug loads once and overwrites only the context assign:

```elixir
case Clients.get_active_client(conn.assigns.ctx) do
  {:ok, client} -> assign(conn, :ctx, %{conn.assigns.ctx | client_id: client.id})
  {:error, :not_found} -> FallbackController.call(conn, {:error, :client_inactive})
end
```

`UserSocket.connect/3` keeps the coach path unchanged; the client path calls the same loader, sets `client_id`, and returns `:error` for missing/inactive membership.

- [ ] **Step 3: Replace every client-self identity helper**

Delete private `get_client/1` and `get_client_account/1` helpers that query by `ctx.user_id`. Use `ctx.client_id` directly for ID-only operations. Where the response or changeset requires the current client row (client profile and client weight response), fetch it tenant-scoped by `ctx.client_id`, never by `user_id`.

Examples:

```elixir
def list_client_sessions(%Ctx{client_id: client_id} = ctx, opts \\ [])
    when not is_nil(client_id) do
  {:ok, paginated_sessions(ctx.business_id, client_id, opts)}
end

def list_client_sessions(%Ctx{}, _opts), do: {:error, :not_found}
```

```elixir
def get_client_account(%Ctx{client_id: client_id} = ctx) when not is_nil(client_id) do
  Client
  |> Client.for_business(ctx.business_id)
  |> Repo.get(client_id)
  |> ok_or_not_found()
end

def get_client_account(%Ctx{}), do: {:error, :not_found}
```

Keep malformed/non-boundary client contexts fail-closed with `{:error, :not_found}` instead of allowing nil filters or cross-tenant reads.

- [ ] **Step 4: Run focused domain, controller, and channel tests**

Run:

`cd backend && mix test test/easy/sessions_test.exs test/easy/training/performed_set_test.exs test/easy/nutrition/meal_log_test.exs test/easy/forms_test.exs test/easy/attachments_test.exs test/easy/fitness/weight_entry_test.exs test/easy/chat_test.exs test/easy_web/controllers/clients/workout_session_controller_test.exs test/easy_web/channels/conversation_channel_test.exs test/easy_web/channels/inbox_channel_test.exs`

Expected: failures only from test-built client contexts that have not yet been updated with `client_id`.

---

### Task 3: Update non-HTTP callers, document the contract, and close the unit

**Files:**
- Modify: client-self test context constructors under `backend/test/easy/` and `backend/test/easy_web/`
- Modify: `backend/test/easy_web/channels/conversation_channel_test.exs`
- Modify: `backend/test/easy_web/channels/inbox_channel_test.exs`
- Modify: `backend/AGENTS.md`

**Interfaces:**
- Consumes: client fixtures with stable `client.id`
- Produces: direct/non-HTTP client contexts that include `client_id`; documented boundary contract

- [ ] **Step 1: Update test-built client contexts**

For every context representing a client actor, add `client_id: client.id` while leaving coach/owner contexts unchanged:

```elixir
%Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
```

Tests deliberately exercising a missing user/client identity should use `client_id: nil` and continue asserting `{:error, :not_found}`.

- [ ] **Step 2: Cover the socket boundary**

Assert that a connected client socket carries its own `client_id` and that an inactive client token is rejected:

```elixir
assert {:ok, socket} = connect(EasyWeb.UserSocket, %{"token" => client_token(client)})
assert socket.assigns.ctx.client_id == client.id

inactive = insert(:client, business: coach.business, creator: coach, status: :inactive)
assert :error = connect(EasyWeb.UserSocket, %{"token" => client_token(inactive)})
```

- [ ] **Step 3: Update the documented `Ctx` contract**

Change `backend/AGENTS.md` to state that client actors receive `client_id` from the active-client HTTP/socket boundary and that Case-3 operations use it directly. Do not add a recurring-mistake entry because this is a standing architecture contract, not a new repeated violation class.

- [ ] **Step 4: Verify GREEN**

Run the focused suite from Task 2, then:

`cd backend && mix precommit`

Run from the repository root:

`just check-rm`

`git diff --check`

Expected: all checks pass; the request-level regression sees one client identity query and a flat total count.

- [ ] **Step 5: Commit the concern as one unit**

Stage only the plan, item-1 backend source/tests, `backend/AGENTS.md`, and any necessary recurring-mistake update. Do not stage `.claude/skills/first-principles-edit/`.

```bash
git commit -m "refactor(backend): resolve client identity at request boundary"
```
