# Push Notifications v1 — Backend (token registry + FCM sender + chat trigger) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An authenticated user can register/unregister FCM device tokens, and sending a chat message fires an FCM push (fire-and-forget) to every registered device of the recipient — with a log-only adapter in dev so no Firebase credentials are needed locally.

**Architecture:** New `push_tokens` table keyed by identity user + Ctx-first `Easy.PushTokens` context + shared `/v1/push-tokens` API under `:require_user`. A new `Easy.Push` boundary module (modeled on `Easy.Razorpay`) does FCM HTTP v1 OAuth via existing Req + Joken, fans out one `messages:send` call per token inside a supervised Task, and deletes dead tokens on `UNREGISTERED`/404. `Easy.Chat.insert_message/5` calls `Easy.Push.send/2` for the recipient after a successful insert.

**Tech Stack:** Elixir/Phoenix/Ecto, OpenApiSpex, Req (`~> 0.5`) + Joken (`~> 2.6`) — **zero new backend dependencies**. Test seam is the FCM HTTP boundary via `Req.Test` (same pattern as `Easy.Razorpay`).

**Spec:** `docs/superpowers/specs/2026-07-11-push-notifications-design.md` (covers Linear COA-127 + COA-128).

## Global Constraints

- Follow `backend/AGENTS.md` exactly: Ctx-first public context functions, `{:ok, value} | {:error, reason}` returns with bare-atom reasons, `insert_changeset` naming, trusted ids via `put_change` (never cast), `for_*` query builders no-op'ing on nil, `@spec` on every public function, no `@moduledoc`/`@doc`.
- **No new backend deps** — FCM OAuth uses existing `req ~> 0.5` + `joken ~> 2.6` (already in `backend/mix.exs`).
- No Oban, no queue, no retries, no notification log — fire-and-forget; the only persisted data is device tokens.
- Push tokens are **identity-user-scoped, not tenant-scoped** (a user's devices follow them across businesses; spec decision). Scope all reads/deletes by `user_id`.
- New route segments are kebab-case: `/v1/push-tokens`.
- A push failure must never fail or delay the request that triggered it.
- After adding OpenApiSpex schemas, a running dev `phx.server` must be fully restarted (dev spec cache gotcha).
- Run all `mix` commands from `backend/`. Finish with `mix precommit` (format, compile --warnings-as-errors, credo, test).
- Check-in reminder trigger is **out of scope** — only its payload contract is documented (in the sender module's data-shape, `{"type" => "checkin_due", "checkin_id" => id}`); it ships with the check-ins module.

---

### Task 1: Token registry — migration, schema, context

**Files:**
- Create: `backend/priv/repo/migrations/20260711160000_create_push_tokens.exs`
- Create: `backend/lib/easy/push_tokens/push_token.ex`
- Create: `backend/lib/easy/push_tokens.ex`
- Test: `backend/test/easy/push_tokens_test.exs`

**Interfaces:**
- Consumes: `Easy.Ctx` (existing, `backend/lib/easy/ctx.ex`), `Easy.Identity.User` (table `users`), `Easy.Repo`.
- Produces: `Easy.PushTokens.register(ctx, attrs) :: {:ok, %PushToken{}} | {:error, changeset}`; `Easy.PushTokens.unregister(ctx, token) :: :ok`; `Easy.PushTokens.for_user(user_id) :: [%PushToken{}]`; `Easy.PushTokens.delete_token(token) :: :ok`. Schema `Easy.PushTokens.PushToken` with fields `id`, `token`, `platform` (`:android | :web`), `user_id`, timestamps.

- [ ] **Step 1: Write the failing tests**

Create `backend/test/easy/push_tokens_test.exs`:

```elixir
defmodule Easy.PushTokensTest do
  use Easy.DataCase, async: true

  alias Easy.Ctx
  alias Easy.PushTokens
  alias Easy.PushTokens.PushToken
  alias Easy.Repo

  defp ctx_for(user), do: Ctx.new(Ecto.UUID.generate(), user.id)

  describe "register/2" do
    test "persists a token for the current user" do
      user = insert(:user)

      assert {:ok, %PushToken{} = push_token} =
               PushTokens.register(ctx_for(user), %{"token" => "tok-1", "platform" => "android"})

      assert push_token.user_id == user.id
      assert push_token.platform == :android
      assert push_token.token == "tok-1"
    end

    test "re-registering the same token re-points it at the new user" do
      user_a = insert(:user)
      user_b = insert(:user)

      {:ok, _} = PushTokens.register(ctx_for(user_a), %{"token" => "tok-shared", "platform" => "android"})
      {:ok, repointed} = PushTokens.register(ctx_for(user_b), %{"token" => "tok-shared", "platform" => "android"})

      assert repointed.user_id == user_b.id
      assert Repo.aggregate(PushToken, :count) == 1
    end

    test "invalid platform returns a changeset error" do
      user = insert(:user)

      assert {:error, %Ecto.Changeset{}} =
               PushTokens.register(ctx_for(user), %{"token" => "tok-1", "platform" => "ios"})
    end

    test "missing token returns a changeset error" do
      user = insert(:user)

      assert {:error, %Ecto.Changeset{}} =
               PushTokens.register(ctx_for(user), %{"platform" => "android"})
    end

    test "user_id is never taken from attrs" do
      user = insert(:user)
      other = insert(:user)

      {:ok, push_token} =
        PushTokens.register(ctx_for(user), %{
          "token" => "tok-1",
          "platform" => "web",
          "user_id" => other.id
        })

      assert push_token.user_id == user.id
    end
  end

  describe "unregister/2" do
    test "deletes own token and is idempotent" do
      user = insert(:user)
      {:ok, _} = PushTokens.register(ctx_for(user), %{"token" => "tok-1", "platform" => "web"})

      assert :ok = PushTokens.unregister(ctx_for(user), "tok-1")
      assert :ok = PushTokens.unregister(ctx_for(user), "tok-1")
      assert Repo.aggregate(PushToken, :count) == 0
    end

    test "does not delete another user's token" do
      user_a = insert(:user)
      user_b = insert(:user)
      {:ok, _} = PushTokens.register(ctx_for(user_a), %{"token" => "tok-a", "platform" => "web"})

      assert :ok = PushTokens.unregister(ctx_for(user_b), "tok-a")
      assert Repo.aggregate(PushToken, :count) == 1
    end
  end

  describe "for_user/1" do
    test "returns only that user's tokens" do
      user_a = insert(:user)
      user_b = insert(:user)
      {:ok, _} = PushTokens.register(ctx_for(user_a), %{"token" => "tok-a1", "platform" => "android"})
      {:ok, _} = PushTokens.register(ctx_for(user_a), %{"token" => "tok-a2", "platform" => "web"})
      {:ok, _} = PushTokens.register(ctx_for(user_b), %{"token" => "tok-b", "platform" => "web"})

      tokens = PushTokens.for_user(user_a.id)
      assert Enum.sort(Enum.map(tokens, & &1.token)) == ["tok-a1", "tok-a2"]
    end
  end

  describe "delete_token/1" do
    test "deletes by token value regardless of user" do
      user = insert(:user)
      {:ok, _} = PushTokens.register(ctx_for(user), %{"token" => "tok-dead", "platform" => "android"})

      assert :ok = PushTokens.delete_token("tok-dead")
      assert Repo.aggregate(PushToken, :count) == 0
    end
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && mix test test/easy/push_tokens_test.exs`
Expected: FAIL — `Easy.PushTokens` is not available (module undefined).

- [ ] **Step 3: Write the migration**

Create `backend/priv/repo/migrations/20260711160000_create_push_tokens.exs`:

```elixir
defmodule Easy.Repo.Migrations.CreatePushTokens do
  use Ecto.Migration

  def change do
    create table(:push_tokens, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :token, :text, null: false
      add :platform, :string, null: false

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:push_tokens, [:token])
    create index(:push_tokens, [:user_id])

    create constraint(:push_tokens, :push_tokens_platform_check,
             check: "platform in ('android','web')"
           )
  end
end
```

- [ ] **Step 4: Write the schema**

Create `backend/lib/easy/push_tokens/push_token.ex` (schema dirs hold only Ecto schemas — enforced by `context_layout_test`):

```elixir
defmodule Easy.PushTokens.PushToken do
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  schema "push_tokens" do
    field :token, :string
    field :platform, Ecto.Enum, values: [:android, :web]

    belongs_to :user, Easy.Identity.User

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(Ecto.UUID.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(user_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:token, :platform])
    |> validate_required([:token, :platform])
    |> put_change(:user_id, user_id)
    |> unique_constraint(:token)
  end

  @spec for_user(Ecto.Queryable.t(), Ecto.UUID.t()) :: Ecto.Query.t()
  def for_user(query \\ __MODULE__, user_id) do
    from q in query, where: q.user_id == ^user_id
  end

  @spec for_token(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_token(query \\ __MODULE__, token) do
    from q in query, where: q.token == ^token
  end
end
```

- [ ] **Step 5: Write the context**

Create `backend/lib/easy/push_tokens.ex`:

```elixir
defmodule Easy.PushTokens do
  alias Easy.Ctx
  alias Easy.PushTokens.PushToken
  alias Easy.Repo

  @spec register(Ctx.t(), map()) :: {:ok, PushToken.t()} | {:error, Ecto.Changeset.t()}
  def register(%Ctx{} = ctx, attrs) do
    ctx.user_id
    |> PushToken.insert_changeset(attrs)
    |> Repo.insert(
      on_conflict: {:replace, [:user_id, :platform, :updated_at]},
      conflict_target: :token,
      returning: true
    )
  end

  @spec unregister(Ctx.t(), String.t()) :: :ok
  def unregister(%Ctx{} = ctx, token) do
    PushToken
    |> PushToken.for_user(ctx.user_id)
    |> PushToken.for_token(token)
    |> Repo.delete_all()

    :ok
  end

  @spec for_user(Ecto.UUID.t()) :: [PushToken.t()]
  def for_user(user_id) do
    PushToken
    |> PushToken.for_user(user_id)
    |> Repo.all()
  end

  @spec delete_token(String.t()) :: :ok
  def delete_token(token) do
    PushToken
    |> PushToken.for_token(token)
    |> Repo.delete_all()

    :ok
  end
end
```

Notes for the implementer:
- `register/2` upserts on the unique `token` index: `{:replace, [:user_id, :platform, :updated_at]}` re-points a known token at the current user (shared-device account switches). `returning: true` makes Postgres return the updated row so the changeset error path is never hit on conflict.
- `unregister/2` and `delete_token/1` return bare `:ok` — idempotent deletes with no expected failure mode (same shape as `Phoenix.PubSub.broadcast/3`).
- `for_user/1` and `delete_token/1` are internal fan-out helpers for the sender (Task 3); they intentionally take a plain id/token, not `%Ctx{}` (spec decision — the sender has no actor context).

- [ ] **Step 6: Run migration and tests**

Run: `cd backend && mix ecto.migrate && mix test test/easy/push_tokens_test.exs`
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/priv/repo/migrations/20260711160000_create_push_tokens.exs backend/lib/easy/push_tokens backend/lib/easy/push_tokens.ex backend/test/easy/push_tokens_test.exs
git commit -m "feat(backend): push-token registry — schema + context"
```

---

### Task 2: Push-token API — OpenAPI schemas, controller, routes, generated FE clients

**Files:**
- Create: `backend/lib/easy_web/open_api/schemas/push_token.ex`
- Create: `backend/lib/easy_web/controllers/push_token_controller.ex`
- Create: `backend/lib/easy_web/controllers/push_token_json.ex`
- Modify: `backend/lib/easy_web/router.ex` (after the `/v1/businesses` scope, ~line 86)
- Modify: `frontend/scripts/split-openapi.mjs:12` (add `/v1/push-tokens` to SHARED)
- Test: `backend/test/easy_web/controllers/push_token_controller_test.exs`

**Interfaces:**
- Consumes: `Easy.PushTokens.register/2` and `.unregister/2` from Task 1; existing `EasyWeb.OpenApi.Schemas.{ErrorResponse, Shared}`; `:require_user` pipeline (Authenticate assigns `conn.assigns.ctx` for both roles).
- Produces: `POST /v1/push-tokens` → 201 `{data: {id, token, platform}}`; `DELETE /v1/push-tokens/:token` → 204 (idempotent). OpenAPI operation ids `registerPushToken` / `unregisterPushToken` → generated RTK hooks `useRegisterPushTokenMutation` / `useUnregisterPushTokenMutation` in BOTH apps' `generated.ts` (consumed by the two frontend plans).

- [ ] **Step 1: Write the failing controller tests**

Create `backend/test/easy_web/controllers/push_token_controller_test.exs`:

```elixir
defmodule EasyWeb.PushTokenControllerTest do
  use Easy.ConnCase

  alias Easy.PushTokens.PushToken
  alias Easy.Repo

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
    %{coach: coach, client: client}
  end

  test "coach registers a web token", %{coach: coach} do
    conn =
      build_conn()
      |> authenticate_coach(coach)
      |> put_req_header("content-type", "application/json")
      |> post("/v1/push-tokens", %{"token" => "tok-coach", "platform" => "web"})

    assert %{"data" => %{"token" => "tok-coach", "platform" => "web"}} = json_response(conn, 201)
    assert Repo.get_by(PushToken, token: "tok-coach").user_id == coach.user_id
  end

  test "client registers an android token", %{client: client} do
    conn =
      build_conn()
      |> authenticate_client(client)
      |> put_req_header("content-type", "application/json")
      |> post("/v1/push-tokens", %{"token" => "tok-client", "platform" => "android"})

    assert %{"data" => %{"platform" => "android"}} = json_response(conn, 201)
    assert Repo.get_by(PushToken, token: "tok-client").user_id == client.user_id
  end

  test "unknown platform is rejected by request validation", %{coach: coach} do
    conn =
      build_conn()
      |> authenticate_coach(coach)
      |> put_req_header("content-type", "application/json")
      |> post("/v1/push-tokens", %{"token" => "tok-x", "platform" => "ios"})

    assert json_response(conn, 422)
  end

  test "delete is idempotent and scoped to the caller", %{coach: coach, client: client} do
    build_conn()
    |> authenticate_client(client)
    |> put_req_header("content-type", "application/json")
    |> post("/v1/push-tokens", %{"token" => "tok-client", "platform" => "android"})

    # Coach deleting the client's token succeeds (204) but removes nothing.
    conn = build_conn() |> authenticate_coach(coach) |> delete("/v1/push-tokens/tok-client")
    assert response(conn, 204)
    assert Repo.get_by(PushToken, token: "tok-client")

    # Owner deletes it; deleting again still 204.
    conn = build_conn() |> authenticate_client(client) |> delete("/v1/push-tokens/tok-client")
    assert response(conn, 204)
    refute Repo.get_by(PushToken, token: "tok-client")

    conn = build_conn() |> authenticate_client(client) |> delete("/v1/push-tokens/tok-client")
    assert response(conn, 204)
  end

  test "requires authentication" do
    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> post("/v1/push-tokens", %{"token" => "tok", "platform" => "web"})

    assert json_response(conn, 403)
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && mix test test/easy_web/controllers/push_token_controller_test.exs`
Expected: FAIL — no route matches `POST /v1/push-tokens`.

- [ ] **Step 3: Write OpenAPI schemas**

Create `backend/lib/easy_web/open_api/schemas/push_token.ex`:

```elixir
defmodule EasyWeb.OpenApi.Schemas.PushToken do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "PushToken",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      token: %Schema{type: :string},
      platform: %Schema{type: :string, enum: ~w(android web)}
    },
    required: [:id, :token, :platform]
  })
end

defmodule EasyWeb.OpenApi.Schemas.PushTokenResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{PushToken, Shared}
  OpenApiSpex.schema(Shared.data_response(PushToken, "PushTokenResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.PushTokenCreateRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "PushTokenCreateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        token: %Schema{type: :string, minLength: 1},
        platform: %Schema{type: :string, enum: ~w(android web)}
      },
      required: [:token, :platform],
      example: %{"token" => "fcm-registration-token", "platform" => "android"}
    },
    struct?: false
  )
end
```

- [ ] **Step 4: Write controller and JSON view**

Create `backend/lib/easy_web/controllers/push_token_controller.ex`:

```elixir
defmodule EasyWeb.PushTokenController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.PushTokens
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    PushTokenCreateRequest,
    PushTokenResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create]

  tags ["push tokens"]

  operation :create,
    summary: "Register an FCM push token for the current user",
    operation_id: "registerPushToken",
    security: [%{"bearerAuth" => []}],
    request_body: {"Push token", "application/json", PushTokenCreateRequest, required: true},
    responses: [
      created: {"Push token", "application/json", PushTokenResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, push_token} <- PushTokens.register(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, push_token: push_token)
    end
  end

  operation :delete,
    summary: "Unregister a push token (idempotent, own tokens only)",
    operation_id: "unregisterPushToken",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:token, :path, :string, "FCM registration token", required: true)
    ],
    responses: [
      no_content: "Push token deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"token" => token}) do
    :ok = PushTokens.unregister(conn.assigns.ctx, token)
    send_resp(conn, :no_content, "")
  end
end
```

Create `backend/lib/easy_web/controllers/push_token_json.ex`:

```elixir
defmodule EasyWeb.PushTokenJSON do
  alias Easy.PushTokens.PushToken

  @spec show(map()) :: map()
  def show(%{push_token: %PushToken{} = push_token}) do
    %{data: %{id: push_token.id, token: push_token.token, platform: push_token.platform}}
  end
end
```

- [ ] **Step 5: Add routes**

In `backend/lib/easy_web/router.ex`, directly after the `/v1/businesses` scope (ends ~line 86), add:

```elixir
  scope "/v1/push-tokens", EasyWeb do
    pipe_through :require_user

    post "/", PushTokenController, :create
    delete "/:token", PushTokenController, :delete
  end
```

(`:require_user` = Authenticate only — both coach and client tokens pass; `conn.assigns.ctx` is set by the plug for either role. FCM tokens contain `:` and `-`, both legal in a path segment; the generated client URL-encodes path params.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && mix test test/easy_web/controllers/push_token_controller_test.exs test/easy/push_tokens_test.exs`
Expected: all PASS.

- [ ] **Step 7: Expose the endpoints to both frontend apps**

The per-app OpenAPI split is path-prefix-based and would otherwise drop `/v1/push-tokens` from BOTH app specs. In `frontend/scripts/split-openapi.mjs` change line 12:

```js
const SHARED = ['/v1/auth', '/v1/public', '/v1/push-tokens', '/api'];
```

Then regenerate spec + clients (from repo root):

Run: `just gen-api`
Expected: `split: coach=N client=M paths` counts each increase by 1; `frontend/apps/coachapp-v2/src/api/generated.ts` and `frontend/apps/clientapp-v2/src/api/generated.ts` both now export `useRegisterPushTokenMutation` and `useUnregisterPushTokenMutation`. Verify:

Run: `grep -c "registerPushToken\|unregisterPushToken" frontend/apps/coachapp-v2/src/api/generated.ts frontend/apps/clientapp-v2/src/api/generated.ts`
Expected: non-zero count in both files.

- [ ] **Step 8: Verify Swagger renders**

Run: `cd backend && mix openapi.spec.json --spec EasyWeb.ApiSpec --pretty=true /tmp/spec-check.json && grep -c "push-tokens" /tmp/spec-check.json`
Expected: succeeds, count ≥ 1. (If a dev `phx.server` is running, restart it — the spec is cached.)

- [ ] **Step 9: Commit**

```bash
git add backend/lib/easy_web/open_api/schemas/push_token.ex backend/lib/easy_web/controllers/push_token_controller.ex backend/lib/easy_web/controllers/push_token_json.ex backend/lib/easy_web/router.ex backend/test/easy_web/controllers/push_token_controller_test.exs frontend/scripts/split-openapi.mjs frontend/openapi frontend/apps/coachapp-v2/src/api/generated.ts frontend/apps/clientapp-v2/src/api/generated.ts
git commit -m "feat(backend): push-token register/unregister API + generated clients"
```

---

### Task 3: FCM sender — `Easy.Push` with OAuth, fan-out, dead-token cleanup, log adapter

**Files:**
- Create: `backend/lib/easy/push.ex`
- Modify: `backend/config/dev.exs` (add after the frontend-URLs block, ~line 62)
- Modify: `backend/config/test.exs` (add near the Razorpay `Req.Test` config, ~line 54)
- Modify: `backend/config/runtime.exs` (add after the top `config :easy` block, ~line 16)
- Modify: `backend/test/support/factory.ex` (add `push_token_factory`)
- Test: `backend/test/easy/push_test.exs`

**Interfaces:**
- Consumes: `Easy.PushTokens.for_user/1` and `.delete_token/1` (Task 1); `Easy.TaskSupervisor` (already in `Easy.Application`'s supervision tree); `Req`, `Joken`.
- Produces: `Easy.Push.send(user_id, %{title: String.t(), body: String.t(), data: %{String.t() => String.t()}}) :: :ok` — always returns `:ok` immediately; delivery happens in a supervised Task (or inline when `sync: true` in test config). Payload contract for `data`: chat → `%{"type" => "chat_message", "conversation_id" => id}`; check-in reminder (contract only, trigger ships later) → `%{"type" => "checkin_due", "checkin_id" => id}` with title `"Check-in due"`.

- [ ] **Step 1: Add config for all environments**

In `backend/config/test.exs`, after the Razorpay block (~line 54):

```elixir
# Push: run deliveries inline (no Task) so DB sandbox + Req.Test stubs work in
# the test process, and use a throwaway RSA key generated at boot so tests
# exercise the real RS256 OAuth path without real credentials.
push_test_key = :public_key.generate_key({:rsa, 2048, 65_537})

push_test_pem =
  :public_key.pem_encode([:public_key.pem_entry_encode(:RSAPrivateKey, push_test_key)])

config :easy, Easy.Push,
  sync: true,
  req_options: [plug: {Req.Test, Easy.Push}],
  service_account: %{
    "client_email" => "push-test@easy-test.iam.gserviceaccount.com",
    "private_key" => push_test_pem,
    "project_id" => "easy-test"
  }
```

In `backend/config/dev.exs`, after the frontend-URLs block (~line 62):

```elixir
# Push notifications: log-only adapter — dev needs no Firebase credentials.
config :easy, Easy.Push, adapter: :log
```

In `backend/config/runtime.exs`, after the top-level `config :easy` block (~line 16):

```elixir
if firebase_service_account = System.get_env("FIREBASE_SERVICE_ACCOUNT_JSON") do
  config :easy, Easy.Push, service_account: Jason.decode!(firebase_service_account)
end
```

(runtime.exs merges after dev.exs, so dev keeps `adapter: :log` even if the env var is set.)

- [ ] **Step 2: Add the factory**

In `backend/test/support/factory.ex`, add alongside the other factories:

```elixir
  def push_token_factory do
    %Easy.PushTokens.PushToken{
      token: sequence(:push_token, &"fcm-token-#{&1}"),
      platform: :android,
      user: build(:user)
    }
  end
```

- [ ] **Step 3: Write the failing tests**

Create `backend/test/easy/push_test.exs`:

```elixir
defmodule Easy.PushTest do
  # async: false — the OAuth token cache lives in :persistent_term (global).
  use Easy.DataCase, async: false

  alias Easy.Push
  alias Easy.PushTokens.PushToken
  alias Easy.Repo

  @moduletag capture_log: true

  setup do
    :persistent_term.erase({Easy.Push, :access_token})
    stub_success()
    :ok
  end

  defp stub_success do
    Req.Test.stub(Easy.Push, fn conn ->
      {:ok, body, conn} = Plug.Conn.read_body(conn)

      case conn.host do
        "oauth2.googleapis.com" ->
          send(self(), :oauth_exchange)
          Req.Test.json(conn, %{"access_token" => "at-test", "expires_in" => 3600})

        "fcm.googleapis.com" ->
          send(self(), {:fcm_send, Jason.decode!(body)})
          Req.Test.json(conn, %{"name" => "projects/easy-test/messages/1"})
      end
    end)
  end

  defp notification do
    %{
      title: "Alex Trainer",
      body: "See you Monday",
      data: %{"type" => "chat_message", "conversation_id" => "conv-1"}
    }
  end

  test "sends one FCM message per registered token with the full payload" do
    user = insert(:user)
    insert(:push_token, user: user, token: "tok-1", platform: :android)
    insert(:push_token, user: user, token: "tok-2", platform: :web)

    assert :ok = Push.send(user.id, notification())

    assert_received {:fcm_send, %{"message" => %{"token" => "tok-1"} = message}}
    assert message["notification"] == %{"title" => "Alex Trainer", "body" => "See you Monday"}
    assert message["data"] == %{"type" => "chat_message", "conversation_id" => "conv-1"}
    assert message["webpush"]["fcm_options"]["link"] =~ "/messages/conv-1"

    assert_received {:fcm_send, %{"message" => %{"token" => "tok-2"}}}
  end

  test "sends nothing for a user with no tokens" do
    user = insert(:user)

    assert :ok = Push.send(user.id, notification())

    refute_received {:fcm_send, _}
    refute_received :oauth_exchange
  end

  test "exchanges OAuth once and reuses the cached access token" do
    user = insert(:user)
    insert(:push_token, user: user)

    :ok = Push.send(user.id, notification())
    :ok = Push.send(user.id, notification())

    assert_received :oauth_exchange
    refute_received :oauth_exchange
  end

  test "deletes the token row on HTTP 404" do
    user = insert(:user)
    push_token = insert(:push_token, user: user)

    Req.Test.stub(Easy.Push, fn conn ->
      case conn.host do
        "oauth2.googleapis.com" ->
          Req.Test.json(conn, %{"access_token" => "at-test", "expires_in" => 3600})

        "fcm.googleapis.com" ->
          conn
          |> Plug.Conn.put_status(404)
          |> Req.Test.json(%{"error" => %{"status" => "NOT_FOUND"}})
      end
    end)

    assert :ok = Push.send(user.id, notification())
    refute Repo.get(PushToken, push_token.id)
  end

  test "deletes the token row on an UNREGISTERED error detail" do
    user = insert(:user)
    push_token = insert(:push_token, user: user)

    Req.Test.stub(Easy.Push, fn conn ->
      case conn.host do
        "oauth2.googleapis.com" ->
          Req.Test.json(conn, %{"access_token" => "at-test", "expires_in" => 3600})

        "fcm.googleapis.com" ->
          conn
          |> Plug.Conn.put_status(400)
          |> Req.Test.json(%{
            "error" => %{
              "status" => "INVALID_ARGUMENT",
              "details" => [
                %{
                  "@type" => "type.googleapis.com/google.firebase.fcm.v1.FcmError",
                  "errorCode" => "UNREGISTERED"
                }
              ]
            }
          })
      end
    end)

    assert :ok = Push.send(user.id, notification())
    refute Repo.get(PushToken, push_token.id)
  end

  test "other FCM failures are swallowed and the token kept" do
    user = insert(:user)
    push_token = insert(:push_token, user: user)

    Req.Test.stub(Easy.Push, fn conn ->
      case conn.host do
        "oauth2.googleapis.com" ->
          Req.Test.json(conn, %{"access_token" => "at-test", "expires_in" => 3600})

        "fcm.googleapis.com" ->
          conn
          |> Plug.Conn.put_status(500)
          |> Req.Test.json(%{"error" => %{"status" => "INTERNAL"}})
      end
    end)

    assert :ok = Push.send(user.id, notification())
    assert Repo.get(PushToken, push_token.id)
  end

  test "transport errors are swallowed" do
    user = insert(:user)
    push_token = insert(:push_token, user: user)

    Req.Test.stub(Easy.Push, fn conn ->
      case conn.host do
        "oauth2.googleapis.com" ->
          Req.Test.json(conn, %{"access_token" => "at-test", "expires_in" => 3600})

        "fcm.googleapis.com" ->
          Req.Test.transport_error(conn, :econnrefused)
      end
    end)

    assert :ok = Push.send(user.id, notification())
    assert Repo.get(PushToken, push_token.id)
  end
end
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd backend && mix test test/easy/push_test.exs`
Expected: FAIL — `Easy.Push` is not available.

- [ ] **Step 5: Write the sender**

Create `backend/lib/easy/push.ex`:

```elixir
defmodule Easy.Push do
  require Logger

  alias Easy.PushTokens

  @type notification :: %{
          title: String.t(),
          body: String.t(),
          data: %{optional(String.t()) => String.t()}
        }

  @oauth_scope "https://www.googleapis.com/auth/firebase.messaging"
  @oauth_token_url "https://oauth2.googleapis.com/token"
  @token_cache_key {__MODULE__, :access_token}
  # Refresh the cached OAuth token when within 5 minutes of expiry.
  @expiry_slack_seconds 300

  @spec send(Ecto.UUID.t(), notification()) :: :ok
  def send(user_id, notification) do
    run_async(fn -> deliver_to_user(user_id, notification) end)
    :ok
  end

  defp deliver_to_user(user_id, notification) do
    cond do
      config(:adapter) == :log ->
        Logger.info("push (log adapter) user=#{user_id} notification=#{inspect(notification)}")

      is_nil(config(:service_account)) ->
        Logger.warning("push skipped: FIREBASE_SERVICE_ACCOUNT_JSON not configured")

      true ->
        user_id
        |> PushTokens.for_user()
        |> Enum.each(&deliver(&1, notification))
    end
  end

  defp deliver(%{token: token}, %{title: title, body: body, data: data}) do
    payload = %{
      message: %{
        token: token,
        notification: %{title: title, body: body},
        data: data,
        webpush: webpush_options(data)
      }
    }

    result =
      Req.request(
        [
          method: :post,
          url: "https://fcm.googleapis.com/v1/projects/#{project_id()}/messages:send",
          auth: {:bearer, access_token()},
          json: payload
        ] ++ (config(:req_options) || [])
      )

    case result do
      {:ok, %Req.Response{status: status}} when status in 200..299 ->
        :ok

      {:ok, %Req.Response{status: 404}} ->
        PushTokens.delete_token(token)

      {:ok, %Req.Response{status: status, body: response_body}} ->
        if unregistered?(response_body) do
          PushTokens.delete_token(token)
        else
          Logger.warning("push send failed status=#{status} body=#{inspect(response_body)}")
        end

      {:error, exception} ->
        Logger.warning("push transport error: #{inspect(exception)}")
    end
  end

  # Web clicks land on the coach conversation; Android routes from `data` in the app.
  defp webpush_options(%{"type" => "chat_message", "conversation_id" => conversation_id}) do
    %{fcm_options: %{link: "#{Application.get_env(:easy, :frontend_url)}/messages/#{conversation_id}"}}
  end

  defp webpush_options(_data), do: %{}

  defp unregistered?(%{"error" => %{"details" => details}}) when is_list(details) do
    Enum.any?(details, &(&1["errorCode"] == "UNREGISTERED"))
  end

  defp unregistered?(_body), do: false

  defp access_token do
    case :persistent_term.get(@token_cache_key, nil) do
      %{token: token, expires_at: expires_at} ->
        if System.system_time(:second) < expires_at - @expiry_slack_seconds do
          token
        else
          fetch_access_token()
        end

      nil ->
        fetch_access_token()
    end
  end

  defp fetch_access_token do
    service_account = config(:service_account)
    now = System.system_time(:second)

    claims = %{
      "iss" => service_account["client_email"],
      "scope" => @oauth_scope,
      "aud" => @oauth_token_url,
      "iat" => now,
      "exp" => now + 3600
    }

    signer = Joken.Signer.create("RS256", %{"pem" => service_account["private_key"]})
    {:ok, jwt, _claims} = Joken.generate_and_sign(%{}, claims, signer)

    {:ok, %Req.Response{status: 200, body: %{"access_token" => token, "expires_in" => expires_in}}} =
      Req.request(
        [
          method: :post,
          url: @oauth_token_url,
          form: [grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt]
        ] ++ (config(:req_options) || [])
      )

    :persistent_term.put(@token_cache_key, %{token: token, expires_at: now + expires_in})
    token
  end

  # Fire-and-forget: delivery runs in a supervised Task so callers never wait
  # on or fail from push errors. `sync: true` (test only) runs inline so the
  # DB sandbox and Req.Test stubs stay in the test process.
  defp run_async(fun) do
    if config(:sync) do
      fun.()
    else
      Task.Supervisor.start_child(Easy.TaskSupervisor, fun)
    end
  end

  defp project_id, do: config(:service_account)["project_id"]

  defp config(key), do: Application.get_env(:easy, __MODULE__, [])[key]
end
```

Notes for the implementer:
- An OAuth failure crashes the pattern match inside the supervised Task — logged by the Task supervisor, never propagated to the caller. That is the intended "log and swallow" behavior; do not add retry logic.
- `Req` only auto-retries safe methods (GET/HEAD) by default, so these POSTs are never retried — matches the no-retries spec decision.
- The check-in reminder payload (`%{"type" => "checkin_due", "checkin_id" => id}`, title `"Check-in due"`) is a contract for later callers — nothing to build here beyond `send/2` being data-agnostic.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && mix test test/easy/push_test.exs`
Expected: all PASS.

- [ ] **Step 7: Verify the dev log adapter manually**

Run: `cd backend && MIX_ENV=dev mix run -e 'Easy.Push.send(Ecto.UUID.generate(), %{title: "t", body: "b", data: %{}}); Process.sleep(200)'`
Expected: a `push (log adapter) user=... notification=...` log line; exits cleanly with no Firebase credentials present.

- [ ] **Step 8: Commit**

```bash
git add backend/lib/easy/push.ex backend/config/dev.exs backend/config/test.exs backend/config/runtime.exs backend/test/support/factory.ex backend/test/easy/push_test.exs
git commit -m "feat(backend): FCM v1 sender with OAuth cache, dead-token cleanup, log adapter"
```

---

### Task 4: Chat trigger — push to the recipient on every new message

**Files:**
- Modify: `backend/lib/easy/chat.ex` (aliases ~line 2; `send_message/3` line 70; `send_client_message/2` line 101; `insert_message/5` line 157; new private helpers after `broadcast_message/2` line 196)
- Test: `backend/test/easy/chat_test.exs` (append a new `describe` block)

**Interfaces:**
- Consumes: `Easy.Push.send/2` (Task 3); `Coach.full_name/1` (`backend/lib/easy/orgs/coach.ex:126`); `conversation.client` preloaded by `Conversation.include_client()` on every path that reaches `insert_message/5`.
- Produces: coach→client message pushes to `conversation.client.user_id`; client→coach message pushes to the assigned coach's `user_id`, falling back to the business owner (`businesses.owner_id`). Title = sender display name, body = message text truncated to 140 chars, data = `%{"type" => "chat_message", "conversation_id" => conversation.id}`. Always sends — no presence check (spec decision).

- [ ] **Step 1: Write the failing tests**

Append to `backend/test/easy/chat_test.exs` (inside `Easy.ChatTest`; it already has `use Easy.DataCase, async: true` — Req.Test private-mode stubs are per-process, so async stays fine). Add `@moduletag` only if the module doesn't already capture logs; otherwise tag the describe's tests individually with `@tag capture_log: true`:

```elixir
  describe "push notifications on new messages" do
    setup do
      Req.Test.stub(Easy.Push, fn conn ->
        {:ok, body, conn} = Plug.Conn.read_body(conn)

        case conn.host do
          "oauth2.googleapis.com" ->
            Req.Test.json(conn, %{"access_token" => "at-test", "expires_in" => 3600})

          "fcm.googleapis.com" ->
            send(self(), {:fcm_send, Jason.decode!(body)})
            Req.Test.json(conn, %{"name" => "projects/easy-test/messages/1"})
        end
      end)

      coach = insert(:coach, first_name: "Alex", last_name: "Trainer")

      client =
        insert(:client,
          business: coach.business,
          creator: coach,
          user: insert(:user),
          first_name: "Casey",
          last_name: "Client"
        )

      coach_ctx = Ctx.new(coach.business_id, coach.user_id, coach.id, true)
      client_ctx = Ctx.new(client.business_id, client.user_id)

      %{coach: coach, client: client, coach_ctx: coach_ctx, client_ctx: client_ctx}
    end

    test "coach message pushes to the client's devices", ctx do
      insert(:push_token, user: ctx.client.user, token: "tok-client")

      {:ok, conversation} = Chat.get_or_create_conversation_for_client(ctx.coach_ctx, ctx.client.id)
      {:ok, _message} = Chat.send_message(ctx.coach_ctx, conversation.id, %{"body" => "Hello"})

      assert_received {:fcm_send, %{"message" => message}}
      assert message["token"] == "tok-client"
      assert message["notification"] == %{"title" => "Alex Trainer", "body" => "Hello"}
      assert message["data"] == %{"type" => "chat_message", "conversation_id" => conversation.id}
    end

    test "client message pushes to the assigned coach", ctx do
      trainer = insert(:coach, business: ctx.coach.business, first_name: "Tara", last_name: "Trainer")

      client =
        insert(:client,
          business: ctx.coach.business,
          creator: ctx.coach,
          assigned_coach: trainer,
          user: insert(:user),
          first_name: "Casey",
          last_name: "Client"
        )

      insert(:push_token, user: trainer.user, token: "tok-trainer")
      client_ctx = Ctx.new(client.business_id, client.user_id)

      {:ok, _message} = Chat.send_client_message(client_ctx, %{"body" => "Hi coach"})

      assert_received {:fcm_send, %{"message" => message}}
      assert message["token"] == "tok-trainer"
      assert message["notification"]["title"] == "Casey Client"
    end

    test "client message with no assigned coach pushes to the business owner", ctx do
      insert(:push_token, user: ctx.coach.business.owner, token: "tok-owner")

      {:ok, _message} = Chat.send_client_message(ctx.client_ctx, %{"body" => "Hi"})

      assert_received {:fcm_send, %{"message" => %{"token" => "tok-owner"}}}
    end

    test "message body is truncated to 140 chars in the push", ctx do
      insert(:push_token, user: ctx.client.user, token: "tok-client")
      long_body = String.duplicate("a", 200)

      {:ok, conversation} = Chat.get_or_create_conversation_for_client(ctx.coach_ctx, ctx.client.id)
      {:ok, _message} = Chat.send_message(ctx.coach_ctx, conversation.id, %{"body" => long_body})

      assert_received {:fcm_send, %{"message" => message}}
      assert String.length(message["notification"]["body"]) == 140
    end

    test "coach message to a client with no user account sends no push", ctx do
      invited_client = insert(:client, business: ctx.coach.business, creator: ctx.coach, user: nil)

      {:ok, conversation} =
        Chat.get_or_create_conversation_for_client(ctx.coach_ctx, invited_client.id)

      assert {:ok, _message} = Chat.send_message(ctx.coach_ctx, conversation.id, %{"body" => "Hi"})
      refute_received {:fcm_send, _}
    end

    @tag capture_log: true
    test "a failing push never fails the message send", ctx do
      insert(:push_token, user: ctx.client.user, token: "tok-client")

      Req.Test.stub(Easy.Push, fn conn ->
        case conn.host do
          "oauth2.googleapis.com" ->
            Req.Test.json(conn, %{"access_token" => "at-test", "expires_in" => 3600})

          "fcm.googleapis.com" ->
            conn |> Plug.Conn.put_status(500) |> Req.Test.json(%{"error" => %{"status" => "INTERNAL"}})
        end
      end)

      {:ok, conversation} = Chat.get_or_create_conversation_for_client(ctx.coach_ctx, ctx.client.id)
      assert {:ok, _message} = Chat.send_message(ctx.coach_ctx, conversation.id, %{"body" => "Hi"})
    end
  end
```

If `Easy.ChatTest` doesn't already alias `Easy.Ctx`, add `alias Easy.Ctx` at its top. If the factory's `client_factory` doesn't accept `user: nil`, pass whatever the factory supports for an invitation-stage client (check `backend/test/support/factory.ex:88`) — the point of that test is `client.user_id == nil`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && mix test test/easy/chat_test.exs`
Expected: the new describe block FAILS on `refute_received`/`assert_received {:fcm_send, ...}` (no push is sent yet); pre-existing tests still pass.

- [ ] **Step 3: Wire the trigger into `Easy.Chat`**

In `backend/lib/easy/chat.ex`:

1. Add aliases (top of module, keep alphabetical):

```elixir
  alias Easy.Orgs.Business
  alias Easy.Push
```

2. Change `send_message/3` (line 70) to pass the coach struct through:

```elixir
  def send_message(%Ctx{} = ctx, conversation_id, attrs) do
    with {:ok, coach} <- get_coach(ctx),
         {:ok, conversation} <- get_conversation(ctx, conversation_id) do
      insert_message(ctx.business_id, conversation, :coach, coach, attrs)
    end
  end
```

3. Change `send_client_message/2` (line 101) to pass the client struct through:

```elixir
  def send_client_message(%Ctx{} = ctx, attrs) do
    with {:ok, client} <- get_client_account(ctx),
         {:ok, conversation} <- upsert_conversation(ctx.business_id, client.id, :client) do
      insert_message(ctx.business_id, conversation, :client, client, attrs)
    end
  end
```

4. Change `insert_message/5` (line 157) to take the sender struct and notify after broadcast:

```elixir
  defp insert_message(business_id, conversation, sender_type, sender, attrs) do
    result =
      Repo.transaction(fn ->
        case business_id
             |> Message.insert_changeset(conversation.id, sender_type, sender.id, attrs)
             |> Repo.insert() do
          {:ok, message} ->
            Conversation
            |> where([c], c.id == ^conversation.id)
            |> where([c], is_nil(c.last_message_at) or c.last_message_at <= ^message.inserted_at)
            |> Repo.update_all(
              set: [
                last_message_at: message.inserted_at,
                last_message_preview: String.slice(message.body, 0, 200),
                updated_at: DateTime.truncate(message.inserted_at, :second)
              ]
            )

            message

          {:error, changeset} ->
            Repo.rollback(changeset)
        end
      end)

    with {:ok, message} <- result do
      broadcast_message(conversation, message)
      notify_recipient(conversation, message, sender_type, sender)
      {:ok, message}
    end
  end
```

5. Add the private helpers after `broadcast_message/2` (line 196):

```elixir
  # Push the offline-recipient notification. Always sent — no presence check
  # (spec decision: Android suppresses foreground tray notifications natively,
  # and a redundant web notification for an in-app coach is acceptable in v1).
  defp notify_recipient(conversation, message, :coach, coach) do
    case conversation.client do
      %Client{user_id: user_id} when not is_nil(user_id) ->
        Push.send(user_id, %{
          title: Coach.full_name(coach),
          body: String.slice(message.body, 0, 140),
          data: %{"type" => "chat_message", "conversation_id" => conversation.id}
        })

      _ ->
        :ok
    end
  end

  defp notify_recipient(conversation, message, :client, client) do
    case coach_recipient_user_id(client) do
      nil ->
        :ok

      user_id ->
        Push.send(user_id, %{
          title: client_display_name(client),
          body: String.slice(message.body, 0, 140),
          data: %{"type" => "chat_message", "conversation_id" => conversation.id}
        })
    end
  end

  defp coach_recipient_user_id(%Client{assigned_coach_id: nil} = client) do
    Repo.one(from b in Business, where: b.id == ^client.business_id, select: b.owner_id)
  end

  defp coach_recipient_user_id(%Client{assigned_coach_id: coach_id} = client) do
    Repo.one(
      from c in Coach,
        where: c.id == ^coach_id and c.business_id == ^client.business_id,
        select: c.user_id
    )
  end

  defp client_display_name(%Client{first_name: first, last_name: last}) do
    [first, last]
    |> Enum.reject(&is_nil/1)
    |> Enum.join(" ")
    |> String.trim()
  end
end
```

(Keep these above the existing `advance_read_cursor` or after `broadcast_message` — anywhere in the private section is fine; don't duplicate the final `end`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && mix test test/easy/chat_test.exs test/easy_web/controllers`
Expected: all PASS — including pre-existing conversation controller tests (recipients without tokens trigger no HTTP calls, so untouched tests need no stubs).

- [ ] **Step 5: Full verification**

Run: `cd backend && mix precommit`
Expected: format, compile --warnings-as-errors, credo, and the full test suite all pass.

- [ ] **Step 6: Commit**

```bash
git add backend/lib/easy/chat.ex backend/test/easy/chat_test.exs
git commit -m "feat(backend): push notification on new chat message"
```

---

## Demo (dev, no Firebase credentials)

1. `just backend` (or `cd backend && mix phx.server`).
2. Register a token by hand: `curl -X POST localhost:4000/v1/push-tokens -H "Authorization: Bearer <access token>" -H "content-type: application/json" -d '{"token":"demo-tok","platform":"android"}'` → 201.
3. Send a chat message through either app (dev OTP `123456`) → the server log prints `push (log adapter) user=... notification=%{title: ..., body: ..., data: ...}`.
