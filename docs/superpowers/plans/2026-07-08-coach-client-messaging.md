# 1:1 Coach↔Client Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unused Threads system with one direct-message conversation per client (shared coach inbox, text-only, live via Phoenix Channels) surfaced in coachapp-v2 and clientapp-v2.

**Architecture:** New `Easy.Chat` context (conversations + chat_messages tables, read-state as two timestamp cursors on the conversation row). HTTP is the only write path (OpenApiSpex-documented); Phoenix Channels are receive-only push (`message_new` on `conversation:<id>`, id-only `conversation_updated` on `inbox:business:<id>`). Frontends use generated RTK Query hooks + the official `phoenix` npm client.

**Tech Stack:** Elixir/Phoenix 1.8 (Channels, PubSub `Easy.PubSub` already running, `pubsub_server` already configured), Ecto/Postgres, OpenApiSpex, React 19 + HeroUI + RTK Query (generated clients), `phoenix` npm package.

**Spec:** `docs/superpowers/specs/2026-07-08-coach-client-messaging-design.md`

## Global Constraints

- Backend conventions are `backend/AGENTS.md` (Ctx-first, three-case naming, `for_`/`include_` builders, no trusted ids in `cast/3`, `{:ok,_}/{:error, atom | changeset}`, `@spec` on public fns, no `@moduledoc`/`@doc`).
- `lib/easy/chat/` may contain ONLY Ecto schemas (enforced by `test/easy/context_layout_test.exs`); the context module is `lib/easy/chat.ex`.
- Every tenant-owned query scoped by `business_id`. Coach reads constrained by `Client.visible_to(ctx)` / `Clients.authorize_client_id(ctx, client_id)`.
- Run `mix precommit` (format, compile --warnings-as-errors, credo, test) from `backend/` before finishing any backend task.
- New multi-word route segments are kebab-case. New endpoints need OpenApiSpex operation + `CastAndValidate` on write actions.
- Frontend: run `just gen-api` only against a freshly restarted `phx.server` (OpenApiSpex spec is cached in dev; code-reload won't bust it).
- Frontend lint/typecheck: from `frontend/`, `pnpm -C apps/<app> tsc --noEmit` and `just lint` must pass.
- HeroUI v3 tokens only (`accent`/`border`/`surface`/`muted` — never v2 `primary`/`divider`/`content*`).
- Commit after every task with a conventional-commit message.
- Skim `docs/agents/recurring-mistakes.md` entries for the area you touch before finishing a task.

---

### Task 1: Delete the Threads system

**Files:**
- Delete: `backend/lib/easy/threads.ex`, `backend/lib/easy/threads/thread.ex`, `backend/lib/easy/threads/thread_message.ex`
- Delete: `backend/lib/easy_web/controllers/coaches/thread_controller.ex`, `backend/lib/easy_web/controllers/coaches/thread_message_controller.ex`, `backend/lib/easy_web/controllers/coaches/thread_json.ex`
- Delete: `backend/lib/easy_web/controllers/clients/thread_controller.ex`, `backend/lib/easy_web/controllers/clients/thread_message_controller.ex`, `backend/lib/easy_web/controllers/clients/thread_json.ex`
- Delete: `backend/lib/easy_web/open_api/schemas/threads.ex`
- Delete: `backend/test/easy/threads_test.exs`, `backend/test/easy_web/controllers/coaches/thread_controller_test.exs`, and any client-side thread controller test (`ls backend/test/easy_web/controllers/clients/ | grep thread`)
- Modify: `backend/lib/easy_web/router.ex` (coach thread routes ~lines 220–225, client thread routes ~lines 291–294 incl. the `# Threads` comment)
- Modify: `backend/test/support/factory.ex` (remove `thread_factory` and `thread_message_factory`, ~lines 637–664)
- Create: `backend/priv/repo/migrations/<timestamp>_drop_threads.exs`

**Interfaces:**
- Consumes: nothing.
- Produces: a codebase with zero references to `Easy.Threads`; `threads`/`thread_messages` tables dropped. Later tasks assume the name `conversations` is free and no `ThreadController` exists.

- [ ] **Step 1: Delete the files**

```bash
cd backend
rm lib/easy/threads.ex lib/easy/threads/thread.ex lib/easy/threads/thread_message.ex
rmdir lib/easy/threads
rm lib/easy_web/controllers/coaches/thread_controller.ex \
   lib/easy_web/controllers/coaches/thread_message_controller.ex \
   lib/easy_web/controllers/coaches/thread_json.ex \
   lib/easy_web/controllers/clients/thread_controller.ex \
   lib/easy_web/controllers/clients/thread_message_controller.ex \
   lib/easy_web/controllers/clients/thread_json.ex \
   lib/easy_web/open_api/schemas/threads.ex \
   test/easy/threads_test.exs \
   test/easy_web/controllers/coaches/thread_controller_test.exs
ls test/easy_web/controllers/clients/ | grep -i thread   # delete whatever this lists
```

- [ ] **Step 2: Remove the routes**

In `backend/lib/easy_web/router.ex`, delete these lines from the `scope "/v1/coach"` block:

```elixir
    get "/threads", ThreadController, :index
    get "/threads/:id", ThreadController, :show
    patch "/threads/:id", ThreadController, :update
    post "/threads/:thread_id/messages", ThreadMessageController, :create
    get "/clients/:client_id/threads", ThreadController, :client_threads
    post "/clients/:client_id/threads", ThreadController, :create
```

and these (plus the `# Threads` comment) from the `scope "/v1/client"` block:

```elixir
    # Threads
    get "/threads", ThreadController, :index
    post "/threads", ThreadController, :create
    get "/threads/:id", ThreadController, :show
    post "/threads/:thread_id/messages", ThreadMessageController, :create
```

- [ ] **Step 3: Remove the factories**

In `backend/test/support/factory.ex`, delete the whole `thread_factory` and `thread_message_factory` functions (~lines 637–664) and any now-unused aliases they referenced.

- [ ] **Step 4: Drop the tables**

```bash
cd backend && mix ecto.gen.migration drop_threads
```

```elixir
defmodule Easy.Repo.Migrations.DropThreads do
  use Ecto.Migration

  def up do
    drop table(:thread_messages)
    drop table(:threads)
  end

  def down do
    raise "irreversible: threads feature was removed (never had a UI)"
  end
end
```

- [ ] **Step 5: Verify clean**

```bash
cd backend && mix ecto.migrate && grep -ri "Easy.Threads\|ThreadController\|thread_factory" lib test config
```
Expected: migration runs; grep finds nothing.

- [ ] **Step 6: Run precommit**

Run: `cd backend && mix precommit`
Expected: PASS (0 failures, no warnings)

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(chat)!: remove unused threads system"
```

---

### Task 2: Chat schemas + migration

**Files:**
- Create: `backend/priv/repo/migrations/<timestamp>_create_chat.exs`
- Create: `backend/lib/easy/chat/conversation.ex`
- Create: `backend/lib/easy/chat/message.ex`
- Test: `backend/test/easy/chat_test.exs` (schema section)

**Interfaces:**
- Consumes: `Easy.Orgs.Business`, `Easy.Clients.Client` schemas.
- Produces: `Easy.Chat.Conversation` (fields `last_message_at`, `last_message_preview`, `coach_last_read_at`, `client_last_read_at`, virtual `unread_count`; changeset `insert_changeset(business_id, client_id)`; builders `for_business/2`, `for_client/3`, `recent/1`, `include_client/1`, `select_coach_unread/1`, `select_client_unread/1`) and `Easy.Chat.Message` (fields `body`, `sender_type`, `sender_id`; changeset `insert_changeset(conversation_id, sender_type, sender_id, attrs)`; builders `for_conversation/2`, `newest/1`, `before_message/2`). Message timestamps are `:utc_datetime_usec` (unread math and cursor ordering rely on microsecond precision).

- [ ] **Step 1: Write failing schema tests**

Create `backend/test/easy/chat_test.exs`:

```elixir
defmodule Easy.ChatTest do
  use Easy.DataCase, async: true

  alias Easy.Chat.Conversation
  alias Easy.Chat.Message

  describe "Conversation.insert_changeset/2" do
    test "sets trusted ids and is valid" do
      cs = Conversation.insert_changeset("biz", "client")
      assert cs.valid?
      assert Ecto.Changeset.get_field(cs, :business_id) == "biz"
      assert Ecto.Changeset.get_field(cs, :client_id) == "client"
    end
  end

  describe "Message.insert_changeset/4" do
    test "requires a body" do
      cs = Message.insert_changeset("conv", :client, "c1", %{})
      refute cs.valid?
      assert "can't be blank" in errors_on(cs).body
    end

    test "sets sender from trusted args, not attrs" do
      cs =
        Message.insert_changeset("conv", :client, "c1", %{
          "body" => "hey",
          "sender_type" => "coach",
          "sender_id" => "evil"
        })

      assert Ecto.Changeset.get_field(cs, :sender_type) == :client
      assert Ecto.Changeset.get_field(cs, :sender_id) == "c1"
    end

    test "rejects an over-long body" do
      cs = Message.insert_changeset("conv", :coach, "c1", %{"body" => String.duplicate("a", 4001)})
      refute cs.valid?
    end
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && mix test test/easy/chat_test.exs`
Expected: FAIL — `Easy.Chat.Conversation` is not available.

- [ ] **Step 3: Write the migration**

```bash
cd backend && mix ecto.gen.migration create_chat
```

```elixir
defmodule Easy.Repo.Migrations.CreateChat do
  use Ecto.Migration

  def change do
    create table(:conversations, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all), null: false
      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false
      add :last_message_at, :utc_datetime_usec
      add :last_message_preview, :string
      add :coach_last_read_at, :utc_datetime_usec
      add :client_last_read_at, :utc_datetime_usec

      timestamps(type: :utc_datetime)
    end

    create unique_index(:conversations, [:business_id, :client_id])

    create table(:chat_messages, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all), null: false
      add :sender_type, :string, null: false
      add :sender_id, :binary_id, null: false
      add :body, :text, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:chat_messages, [:conversation_id, :inserted_at])
    create constraint(:chat_messages, :chat_messages_sender_type_check, check: "sender_type IN ('coach','client')")
  end
end
```

- [ ] **Step 4: Write the schemas**

Create `backend/lib/easy/chat/conversation.ex`:

```elixir
defmodule Easy.Chat.Conversation do
  use Ecto.Schema

  alias Easy.Chat.Message
  alias Easy.Clients.Client
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  schema "conversations" do
    field :last_message_at, :utc_datetime_usec
    field :last_message_preview, :string
    # ponytail: shared read cursor per side — any coach reading marks the whole
    # team's side read; upgrade path is a per-coach read table if it ever matters.
    field :coach_last_read_at, :utc_datetime_usec
    field :client_last_read_at, :utc_datetime_usec
    field :unread_count, :integer, virtual: true

    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    has_many :messages, Message

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id) do
    %__MODULE__{}
    |> change()
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> unique_constraint([:business_id, :client_id])
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(c in query, where: c.business_id == ^business_id)

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id),
    do: from(c in query, where: c.business_id == ^business_id and c.client_id == ^client_id)

  @spec recent(Ecto.Queryable.t()) :: Ecto.Query.t()
  def recent(query \\ __MODULE__),
    do: from(c in query, order_by: [desc_nulls_last: c.last_message_at, desc: c.inserted_at])

  @spec include_client(Ecto.Queryable.t()) :: Ecto.Query.t()
  def include_client(query \\ __MODULE__), do: from(c in query, preload: [:client])

  @spec select_coach_unread(Ecto.Queryable.t()) :: Ecto.Query.t()
  def select_coach_unread(query \\ __MODULE__) do
    from(c in query,
      select_merge: %{
        unread_count:
          fragment(
            "(SELECT count(*)::int FROM chat_messages m WHERE m.conversation_id = ? AND m.sender_type = 'client' AND m.inserted_at > COALESCE(?, '-infinity'))",
            c.id,
            c.coach_last_read_at
          )
      }
    )
  end

  @spec select_client_unread(Ecto.Queryable.t()) :: Ecto.Query.t()
  def select_client_unread(query \\ __MODULE__) do
    from(c in query,
      select_merge: %{
        unread_count:
          fragment(
            "(SELECT count(*)::int FROM chat_messages m WHERE m.conversation_id = ? AND m.sender_type = 'coach' AND m.inserted_at > COALESCE(?, '-infinity'))",
            c.id,
            c.client_last_read_at
          )
      }
    )
  end
end
```

Create `backend/lib/easy/chat/message.ex`:

```elixir
defmodule Easy.Chat.Message do
  use Ecto.Schema

  alias Easy.Chat.Conversation

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  schema "chat_messages" do
    field :body, :string
    field :sender_type, Ecto.Enum, values: [:coach, :client]
    field :sender_id, :binary_id

    belongs_to :conversation, Conversation

    timestamps(type: :utc_datetime_usec)
  end

  @spec insert_changeset(String.t(), :coach | :client, String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(conversation_id, sender_type, sender_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:body])
    |> put_change(:conversation_id, conversation_id)
    |> put_change(:sender_type, sender_type)
    |> put_change(:sender_id, sender_id)
    |> validate_required([:body, :conversation_id, :sender_type, :sender_id])
    |> validate_length(:body, max: 4000)
  end

  @spec for_conversation(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_conversation(query \\ __MODULE__, conversation_id),
    do: from(m in query, where: m.conversation_id == ^conversation_id)

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__), do: from(m in query, order_by: [desc: m.inserted_at, desc: m.id])

  @spec before_message(Ecto.Queryable.t(), t()) :: Ecto.Query.t()
  def before_message(query \\ __MODULE__, %__MODULE__{} = cursor) do
    from(m in query,
      where:
        m.inserted_at < ^cursor.inserted_at or
          (m.inserted_at == ^cursor.inserted_at and m.id < ^cursor.id)
    )
  end
end
```

- [ ] **Step 5: Migrate and run tests**

Run: `cd backend && mix ecto.migrate && mix test test/easy/chat_test.exs`
Expected: PASS

- [ ] **Step 6: Add factories**

In `backend/test/support/factory.ex` (near the end, where thread factories used to be):

```elixir
  def conversation_factory do
    client = build(:client)

    %Easy.Chat.Conversation{
      business: client.business,
      client: client
    }
  end

  def chat_message_factory do
    conversation = build(:conversation)

    %Easy.Chat.Message{
      body: sequence(:chat_message_body, &"Message #{&1}"),
      sender_type: :coach,
      sender_id: Ecto.UUID.generate(),
      conversation: conversation
    }
  end
```

- [ ] **Step 7: Run precommit and commit**

Run: `cd backend && mix precommit`
Expected: PASS

```bash
git add -A && git commit -m "feat(chat): conversations + chat_messages schemas and migration"
```

---

### Task 3: `Easy.Chat` context

**Files:**
- Create: `backend/lib/easy/chat.ex`
- Test: `backend/test/easy/chat_test.exs` (extend)

**Interfaces:**
- Consumes: Task 2 schemas; `Easy.Clients.get_client/2`, `Easy.Clients.authorize_client_id/2`, `Client.visible_to/2`, `Coach.for_business/2` + `Coach.for_user/2`, `Client.for_business/2` + `Client.for_user/2` (same helpers `Easy.Threads` used).
- Produces (all `@spec`'d, Ctx-first):
  - `list_conversations(ctx, opts)` → `{:ok, %{count: n, conversations: [%Conversation{unread_count: int, client: %Client{}}]}}`
  - `get_conversation(ctx, conversation_id)` → `{:ok, %Conversation{}} | {:error, :not_found}` (coach, visibility-checked, client preloaded, coach unread)
  - `get_or_create_conversation_for_client(ctx, client_id)` → same shape
  - `list_messages(ctx, conversation_id, opts)` → `{:ok, %{messages: [%Message{}], has_more: bool}}` (ascending within page; `opts`: `:before` message-id cursor, `:limit` default 50 max 100)
  - `send_message(ctx, conversation_id, attrs)` → `{:ok, %Message{}}`
  - `mark_read(ctx, conversation_id)` → `{:ok, %Conversation{}}`
  - `get_client_conversation(ctx)`, `list_client_messages(ctx, opts)`, `send_client_message(ctx, attrs)`, `mark_client_read(ctx)` — client-for-self variants (conversation resolved from `ctx`, get-or-create on demand)
  - Side effect of both send fns: `Phoenix.PubSub.broadcast(Easy.PubSub, "conversation:<id>", {:chat_message_created, %Message{}})` and `Phoenix.PubSub.broadcast(Easy.PubSub, "inbox:business:<business_id>", {:conversation_updated, conversation_id})` — Task 5's channels consume exactly these tuples.

- [ ] **Step 1: Write failing context tests**

Append to `backend/test/easy/chat_test.exs`:

```elixir
  describe "Easy.Chat context" do
    alias Easy.Chat
    alias Easy.Ctx

    defp coach_ctx(coach), do: trainer_ctx(coach)
    defp client_ctx(client), do: Ctx.new(client.business_id, client.user_id)

    setup do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach)
      %{coach: coach, client: client}
    end

    test "get_or_create_conversation_for_client is idempotent", %{coach: coach, client: client} do
      assert {:ok, a} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      assert {:ok, b} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      assert a.id == b.id
      assert a.unread_count == 0
      assert a.client.id == client.id
    end

    test "404s for a client in another business", %{coach: coach} do
      other_coach = insert(:coach)
      other = insert(:client, business: other_coach.business, creator: other_coach)
      assert {:error, :not_found} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), other.id)
    end

    test "send/list round-trip with cursor pagination", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)

      for i <- 1..5 do
        {:ok, _} = Chat.send_message(coach_ctx(coach), conversation.id, %{"body" => "m#{i}"})
      end

      assert {:ok, %{messages: page1, has_more: true}} =
               Chat.list_messages(coach_ctx(coach), conversation.id, limit: 3)

      assert Enum.map(page1, & &1.body) == ["m3", "m4", "m5"]

      oldest_loaded = List.first(page1)

      assert {:ok, %{messages: page2, has_more: false}} =
               Chat.list_messages(coach_ctx(coach), conversation.id, limit: 3, before: oldest_loaded.id)

      assert Enum.map(page2, & &1.body) == ["m1", "m2"]
    end

    test "send_message bumps preview and unread for the client", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      {:ok, _} = Chat.send_message(coach_ctx(coach), conversation.id, %{"body" => "hello there"})

      assert {:ok, client_view} = Chat.get_client_conversation(client_ctx(client))
      assert client_view.last_message_preview == "hello there"
      assert client_view.unread_count == 1
    end

    test "mark_client_read zeroes the client's unread", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      {:ok, _} = Chat.send_message(coach_ctx(coach), conversation.id, %{"body" => "hi"})

      assert {:ok, _} = Chat.mark_client_read(client_ctx(client))
      assert {:ok, %{unread_count: 0}} = Chat.get_client_conversation(client_ctx(client))
    end

    test "client sends create the conversation lazily and set coach unread", %{coach: coach, client: client} do
      assert {:ok, message} = Chat.send_client_message(client_ctx(client), %{"body" => "help"})
      assert message.sender_type == :client

      assert {:ok, %{count: 1, conversations: [conversation]}} = Chat.list_conversations(coach_ctx(coach))
      assert conversation.unread_count == 1
      assert conversation.last_message_preview == "help"
    end

    test "trainer only sees conversations for visible clients", %{coach: coach, client: client} do
      {:ok, hidden} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)

      trainer = insert(:coach, business: coach.business)
      assert {:ok, %{count: 0, conversations: []}} = Chat.list_conversations(trainer_ctx(trainer))
      assert {:error, :not_found} = Chat.get_conversation(trainer_ctx(trainer), hidden.id)

      assigned = insert(:client, business: coach.business, creator: coach, assigned_coach: trainer)
      {:ok, conv} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), assigned.id)

      assert {:ok, %{count: 1, conversations: [visible]}} = Chat.list_conversations(trainer_ctx(trainer))
      assert visible.id == conv.id
      assert {:ok, _} = Chat.get_conversation(trainer_ctx(trainer), conv.id)
    end

    test "send broadcasts to conversation and inbox topics", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      Phoenix.PubSub.subscribe(Easy.PubSub, "conversation:#{conversation.id}")
      Phoenix.PubSub.subscribe(Easy.PubSub, "inbox:business:#{coach.business_id}")

      {:ok, message} = Chat.send_message(coach_ctx(coach), conversation.id, %{"body" => "ping"})

      assert_receive {:chat_message_created, %{id: message_id}}
      assert message_id == message.id
      assert_receive {:conversation_updated, conversation_id}
      assert conversation_id == conversation.id
    end
  end
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && mix test test/easy/chat_test.exs`
Expected: FAIL — `Easy.Chat` is not available.

- [ ] **Step 3: Implement the context**

Create `backend/lib/easy/chat.ex`:

```elixir
defmodule Easy.Chat do
  alias Easy.Chat.Conversation
  alias Easy.Chat.Message
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs.Coach
  alias Easy.Repo

  import Ecto.Query

  @spec list_conversations(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), conversations: [Conversation.t()]}}
  def list_conversations(%Ctx{} = ctx, opts \\ []) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = min(max(Keyword.get(opts, :limit, 20), 0), 100)

    base =
      Conversation
      |> Conversation.for_business(ctx.business_id)
      |> constrain_to_visible_clients(ctx)

    count = Repo.aggregate(base, :count)

    conversations =
      base
      |> Conversation.include_client()
      |> Conversation.select_coach_unread()
      |> Conversation.recent()
      |> offset(^offset)
      |> limit(^limit)
      |> Repo.all()

    {:ok, %{count: count, conversations: conversations}}
  end

  @spec get_conversation(Ctx.t(), String.t()) :: {:ok, Conversation.t()} | {:error, :not_found}
  def get_conversation(%Ctx{} = ctx, conversation_id) do
    conversation =
      Conversation
      |> Conversation.for_business(ctx.business_id)
      |> Conversation.include_client()
      |> Conversation.select_coach_unread()
      |> Repo.get(conversation_id)

    with {:ok, conversation} <- ok_or_not_found(conversation),
         :ok <- Clients.authorize_client_id(ctx, conversation.client_id) do
      {:ok, conversation}
    end
  end

  @spec get_or_create_conversation_for_client(Ctx.t(), String.t()) ::
          {:ok, Conversation.t()} | {:error, :not_found}
  def get_or_create_conversation_for_client(%Ctx{} = ctx, client_id) do
    with {:ok, client} <- Clients.get_client(ctx, client_id) do
      upsert_conversation(ctx.business_id, client.id, :coach)
    end
  end

  @spec list_messages(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{messages: [Message.t()], has_more: boolean()}} | {:error, :not_found}
  def list_messages(%Ctx{} = ctx, conversation_id, opts \\ []) do
    with {:ok, conversation} <- get_conversation(ctx, conversation_id) do
      {:ok, page_messages(conversation.id, opts)}
    end
  end

  @spec send_message(Ctx.t(), String.t(), map()) ::
          {:ok, Message.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def send_message(%Ctx{} = ctx, conversation_id, attrs) do
    with {:ok, coach} <- get_coach(ctx),
         {:ok, conversation} <- get_conversation(ctx, conversation_id) do
      insert_message(conversation, :coach, coach.id, attrs)
    end
  end

  @spec mark_read(Ctx.t(), String.t()) :: {:ok, Conversation.t()} | {:error, :not_found}
  def mark_read(%Ctx{} = ctx, conversation_id) do
    with {:ok, conversation} <- get_conversation(ctx, conversation_id) do
      advance_read_cursor(conversation, :coach_last_read_at)
    end
  end

  @spec get_client_conversation(Ctx.t()) :: {:ok, Conversation.t()} | {:error, :not_found}
  def get_client_conversation(%Ctx{} = ctx) do
    with {:ok, client} <- get_client_account(ctx) do
      upsert_conversation(ctx.business_id, client.id, :client)
    end
  end

  @spec list_client_messages(Ctx.t(), keyword()) ::
          {:ok, %{messages: [Message.t()], has_more: boolean()}} | {:error, :not_found}
  def list_client_messages(%Ctx{} = ctx, opts \\ []) do
    with {:ok, conversation} <- get_client_conversation(ctx) do
      {:ok, page_messages(conversation.id, opts)}
    end
  end

  @spec send_client_message(Ctx.t(), map()) ::
          {:ok, Message.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def send_client_message(%Ctx{} = ctx, attrs) do
    with {:ok, client} <- get_client_account(ctx),
         {:ok, conversation} <- upsert_conversation(ctx.business_id, client.id, :client) do
      insert_message(conversation, :client, client.id, attrs)
    end
  end

  @spec mark_client_read(Ctx.t()) :: {:ok, Conversation.t()} | {:error, :not_found}
  def mark_client_read(%Ctx{} = ctx) do
    with {:ok, conversation} <- get_client_conversation(ctx) do
      advance_read_cursor(conversation, :client_last_read_at)
    end
  end

  # Private

  defp upsert_conversation(business_id, client_id, unread_for) do
    business_id
    |> Conversation.insert_changeset(client_id)
    |> Repo.insert(on_conflict: :nothing)

    Conversation
    |> Conversation.for_client(business_id, client_id)
    |> Conversation.include_client()
    |> unread_select(unread_for)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp unread_select(query, :coach), do: Conversation.select_coach_unread(query)
  defp unread_select(query, :client), do: Conversation.select_client_unread(query)

  defp page_messages(conversation_id, opts) do
    limit = min(max(Keyword.get(opts, :limit, 50), 1), 100)

    messages =
      Message
      |> Message.for_conversation(conversation_id)
      |> maybe_before(conversation_id, Keyword.get(opts, :before))
      |> Message.newest()
      |> limit(^(limit + 1))
      |> Repo.all()

    {page, rest} = Enum.split(messages, limit)
    %{messages: Enum.reverse(page), has_more: rest != []}
  end

  defp maybe_before(query, _conversation_id, nil), do: query

  defp maybe_before(query, conversation_id, before_id) do
    case Message |> Message.for_conversation(conversation_id) |> Repo.get(before_id) do
      nil -> query
      cursor -> Message.before_message(query, cursor)
    end
  end

  defp insert_message(conversation, sender_type, sender_id, attrs) do
    result =
      Repo.transaction(fn ->
        case conversation.id |> Message.insert_changeset(sender_type, sender_id, attrs) |> Repo.insert() do
          {:ok, message} ->
            Conversation
            |> where([c], c.id == ^conversation.id)
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
      {:ok, message}
    end
  end

  defp broadcast_message(conversation, message) do
    Phoenix.PubSub.broadcast(Easy.PubSub, "conversation:#{conversation.id}", {:chat_message_created, message})

    Phoenix.PubSub.broadcast(
      Easy.PubSub,
      "inbox:business:#{conversation.business_id}",
      {:conversation_updated, conversation.id}
    )
  end

  defp advance_read_cursor(conversation, field) do
    now = DateTime.utc_now()

    Conversation
    |> where([c], c.id == ^conversation.id)
    |> Repo.update_all(set: [{field, now}])

    {:ok, conversation |> Map.put(field, now) |> Map.put(:unread_count, 0)}
  end

  # Coach inbox listings must only surface conversations for clients the caller
  # can see: owner -> all, trainer -> assigned only.
  defp constrain_to_visible_clients(query, %Ctx{owner?: true}), do: query

  defp constrain_to_visible_clients(query, %Ctx{coach_id: coach_id} = ctx) when not is_nil(coach_id) do
    visible_client_ids =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)
      |> select([c], c.id)

    where(query, [c], c.client_id in subquery(visible_client_ids))
  end

  defp constrain_to_visible_clients(query, %Ctx{}), do: query

  defp get_client_account(%Ctx{} = ctx) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp get_coach(%Ctx{} = ctx) do
    Coach
    |> Coach.for_business(ctx.business_id)
    |> Coach.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
```

Caveat for the implementer: `get_conversation/2` must also enforce trainer visibility for the *read* path. `Clients.authorize_client_id(ctx, client_id)` already does this (it is what Threads used for the same purpose) — verify with the trainer test from Step 1 before assuming.

- [ ] **Step 4: Run tests**

Run: `cd backend && mix test test/easy/chat_test.exs`
Expected: PASS. If the same-second message ordering test flakes, the `newest`/`before_message` tie-breaks on `id` are wrong — fix the builder, not the test. (UUIDv4 ids make same-microsecond ordering arbitrary but stable; with `:utc_datetime_usec` timestamps, real ties are practically impossible.)

- [ ] **Step 5: Run precommit and commit**

Run: `cd backend && mix precommit`
Expected: PASS

```bash
git add -A && git commit -m "feat(chat): Easy.Chat context — conversations, messages, read cursors, broadcasts"
```

---

### Task 4: HTTP API — OpenAPI schemas, controllers, routes

**Files:**
- Create: `backend/lib/easy_web/open_api/schemas/chat.ex`
- Create: `backend/lib/easy_web/controllers/coaches/conversation_controller.ex`
- Create: `backend/lib/easy_web/controllers/coaches/conversation_json.ex`
- Create: `backend/lib/easy_web/controllers/clients/conversation_controller.ex`
- Create: `backend/lib/easy_web/controllers/clients/conversation_json.ex`
- Modify: `backend/lib/easy_web/router.ex`
- Test: `backend/test/easy_web/controllers/coaches/conversation_controller_test.exs`, `backend/test/easy_web/controllers/clients/conversation_controller_test.exs`

**Interfaces:**
- Consumes: every `Easy.Chat` function from Task 3.
- Produces the JSON contract the frontends consume (via generated RTK hooks):
  - `Conversation`: `{id, client_id, client_name, last_message_at, last_message_preview, unread_count, inserted_at, updated_at}` (client view omits `client_name`)
  - `ChatMessage`: `{id, conversation_id, sender_type, sender_id, body, inserted_at}`
  - Messages list: `{data: ChatMessage[] (ascending), has_more: boolean}`
  - Operation ids: `listCoachConversations`, `getCoachConversation`, `getCoachClientConversation`, `listCoachConversationMessages`, `createCoachConversationMessage`, `markCoachConversationRead`, `getClientConversation`, `listClientConversationMessages`, `createClientConversationMessage`, `markClientConversationRead`.

- [ ] **Step 1: Write failing controller tests**

Create `backend/test/easy_web/controllers/coaches/conversation_controller_test.exs`:

```elixir
defmodule EasyWeb.Coaches.ConversationControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach)
    conn = build_conn() |> authenticate_coach(coach) |> put_req_header("content-type", "application/json")
    %{conn: conn, coach: coach, client: client}
  end

  describe "GET /v1/coach/clients/:client_id/conversation" do
    test "creates on first access and returns unread_count", %{conn: conn, client: client} do
      conn = get(conn, "/v1/coach/clients/#{client.id}/conversation")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["client_id"] == client.id
      assert data["unread_count"] == 0
      assert is_binary(data["client_name"])
    end

    test "404s for a client in another business", %{conn: conn} do
      other_coach = insert(:coach)
      other = insert(:client, business: other_coach.business, creator: other_coach)
      conn = get(conn, "/v1/coach/clients/#{other.id}/conversation")
      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/coach/conversations/:id/messages" do
    test "sends and lists back ascending", %{conn: conn, coach: coach, client: client} do
      %{"data" => %{"id" => conversation_id}} =
        conn |> get("/v1/coach/clients/#{client.id}/conversation") |> json_response(200)

      post_conn = post(conn, "/v1/coach/conversations/#{conversation_id}/messages", %{"body" => "Hello"})
      assert %{"data" => message} = json_response(post_conn, 201)
      assert message["sender_type"] == "coach"
      assert message["body"] == "Hello"

      list_conn =
        build_conn() |> authenticate_coach(coach) |> get("/v1/coach/conversations/#{conversation_id}/messages")

      assert %{"data" => [%{"body" => "Hello"}], "has_more" => false} = json_response(list_conn, 200)
    end

    test "422s on a blank body", %{conn: conn, client: client} do
      %{"data" => %{"id" => conversation_id}} =
        conn |> get("/v1/coach/clients/#{client.id}/conversation") |> json_response(200)

      conn = post(conn, "/v1/coach/conversations/#{conversation_id}/messages", %{"body" => ""})
      assert json_response(conn, 422)
    end
  end

  describe "GET /v1/coach/conversations" do
    test "inbox lists with unread counts, newest first", %{conn: conn, coach: coach, client: client} do
      conversation = insert(:conversation, business: coach.business, client: client)

      insert(:chat_message,
        conversation: conversation,
        sender_type: :client,
        sender_id: client.id,
        body: "unread one"
      )

      conn = get(conn, "/v1/coach/conversations")
      assert %{"data" => [data], "count" => 1} = json_response(conn, 200)
      assert data["unread_count"] == 1
    end

    test "trainer does not see unassigned clients' conversations", %{coach: coach, client: client} do
      insert(:conversation, business: coach.business, client: client)
      trainer = insert(:coach, business: coach.business)

      conn = build_conn() |> authenticate_coach(trainer) |> get("/v1/coach/conversations")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end
  end

  describe "GET /v1/coach/conversations/:id" do
    test "returns the conversation", %{conn: conn, coach: coach, client: client} do
      conversation = insert(:conversation, business: coach.business, client: client)
      conn = get(conn, "/v1/coach/conversations/#{conversation.id}")
      assert %{"data" => %{"id" => id}} = json_response(conn, 200)
      assert id == conversation.id
    end

    test "404s for an unassigned trainer", %{coach: coach, client: client} do
      conversation = insert(:conversation, business: coach.business, client: client)
      trainer = insert(:coach, business: coach.business)

      conn = build_conn() |> authenticate_coach(trainer) |> get("/v1/coach/conversations/#{conversation.id}")
      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/coach/conversations/:id/read" do
    test "zeroes unread", %{conn: conn, coach: coach, client: client} do
      conversation = insert(:conversation, business: coach.business, client: client)
      insert(:chat_message, conversation: conversation, sender_type: :client, sender_id: client.id)

      read_conn = post(conn, "/v1/coach/conversations/#{conversation.id}/read")
      assert %{"data" => %{"unread_count" => 0}} = json_response(read_conn, 200)
    end
  end

  test "requires authentication" do
    conn = build_conn() |> get("/v1/coach/conversations")
    assert json_response(conn, 403)
  end
end
```

Create `backend/test/easy_web/controllers/clients/conversation_controller_test.exs`:

```elixir
defmodule EasyWeb.Clients.ConversationControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
    conn = build_conn() |> authenticate_client(client) |> put_req_header("content-type", "application/json")
    %{conn: conn, coach: coach, client: client}
  end

  test "GET /v1/client/conversation creates lazily", %{conn: conn} do
    conn = get(conn, "/v1/client/conversation")
    assert %{"data" => data} = json_response(conn, 200)
    assert data["unread_count"] == 0
    refute Map.has_key?(data, "client_name")
  end

  test "send + list + read round-trip", %{conn: conn, client: client} do
    post_conn = post(conn, "/v1/client/conversation/messages", %{"body" => "hi coach"})
    assert %{"data" => %{"sender_type" => "client"}} = json_response(post_conn, 201)

    list_conn = build_conn() |> authenticate_client(client) |> get("/v1/client/conversation/messages")
    assert %{"data" => [%{"body" => "hi coach"}], "has_more" => false} = json_response(list_conn, 200)

    read_conn =
      build_conn()
      |> authenticate_client(client)
      |> put_req_header("content-type", "application/json")
      |> post("/v1/client/conversation/read")

    assert %{"data" => %{"unread_count" => 0}} = json_response(read_conn, 200)
  end

  test "requires authentication" do
    conn = build_conn() |> get("/v1/client/conversation")
    assert json_response(conn, 403)
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && mix test test/easy_web/controllers/coaches/conversation_controller_test.exs test/easy_web/controllers/clients/conversation_controller_test.exs`
Expected: FAIL (no routes / modules).

- [ ] **Step 3: OpenAPI schemas**

Create `backend/lib/easy_web/open_api/schemas/chat.ex`:

```elixir
defmodule EasyWeb.OpenApi.Schemas.ChatMessage do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ChatMessage",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      conversation_id: %Schema{type: :string, format: :uuid},
      sender_type: %Schema{type: :string, enum: ~w(coach client)},
      sender_id: %Schema{type: :string, format: :uuid},
      body: %Schema{type: :string},
      inserted_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [:id, :conversation_id, :sender_type, :sender_id, :body, :inserted_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.Conversation do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "Conversation",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      client_id: %Schema{type: :string, format: :uuid},
      client_name: %Schema{type: :string, nullable: true},
      last_message_at: %Schema{type: :string, format: :"date-time", nullable: true},
      last_message_preview: %Schema{type: :string, nullable: true},
      unread_count: %Schema{type: :integer},
      inserted_at: %Schema{type: :string, format: :"date-time"},
      updated_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [:id, :client_id, :unread_count, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ConversationResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Conversation, Shared}
  OpenApiSpex.schema(Shared.data_response(Conversation, "ConversationResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ConversationListResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Conversation, Shared}
  OpenApiSpex.schema(Shared.list_response(Conversation, "ConversationListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ChatMessageResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{ChatMessage, Shared}
  OpenApiSpex.schema(Shared.data_response(ChatMessage, "ChatMessageResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ChatMessagesResponse do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.ChatMessage

  OpenApiSpex.schema(%{
    title: "ChatMessagesResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      data: %Schema{type: :array, items: ChatMessage, description: "Ascending by inserted_at"},
      has_more: %Schema{type: :boolean}
    },
    required: [:data, :has_more]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ChatMessageCreateRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ChatMessageCreateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        body: %Schema{type: :string, minLength: 1, maxLength: 4000}
      },
      required: [:body],
      example: %{"body" => "Sounds good, see you Monday!"}
    },
    struct?: false
  )
end
```

(Check `Shared.data_response/2` and `Shared.list_response/2` in `backend/lib/easy_web/open_api/schemas/shared.ex` — Threads used them identically.)

- [ ] **Step 4: Coach controller + JSON**

Create `backend/lib/easy_web/controllers/coaches/conversation_controller.ex`:

```elixir
defmodule EasyWeb.Coaches.ConversationController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Chat
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ChatMessageCreateRequest,
    ChatMessageResponse,
    ChatMessagesResponse,
    ConversationListResponse,
    ConversationResponse,
    ErrorResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create_message]

  tags ["coach conversations"]

  operation :index,
    summary: "List conversations (inbox)",
    operation_id: "listCoachConversations",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Offset", required: false),
      Operation.parameter(:limit, :query, :integer, "Limit (max 100)", required: false)
    ],
    responses: [
      ok: {"Conversations", "application/json", ConversationListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :show_for_client,
    summary: "Get (or create) a client's conversation",
    operation_id: "getCoachClientConversation",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:client_id, :path, :string, "Client id")],
    responses: [
      ok: {"Conversation", "application/json", ConversationResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get a conversation",
    operation_id: "getCoachConversation",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Conversation id")],
    responses: [
      ok: {"Conversation", "application/json", ConversationResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :messages,
    summary: "List messages (cursor-paginated, ascending)",
    operation_id: "listCoachConversationMessages",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Conversation id"),
      Operation.parameter(:before, :query, :string, "Message id cursor — return messages older than this", required: false),
      Operation.parameter(:limit, :query, :integer, "Page size (default 50, max 100)", required: false)
    ],
    responses: [
      ok: {"Messages", "application/json", ChatMessagesResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :create_message,
    summary: "Send a message",
    operation_id: "createCoachConversationMessage",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Conversation id")],
    request_body: {"Message", "application/json", ChatMessageCreateRequest, required: true},
    responses: [
      created: {"Message", "application/json", ChatMessageResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :mark_read,
    summary: "Mark the conversation read (coach side)",
    operation_id: "markCoachConversationRead",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Conversation id")],
    responses: [
      ok: {"Conversation", "application/json", ConversationResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    opts =
      [offset: parse_int(params["offset"]), limit: parse_int(params["limit"])]
      |> Enum.reject(fn {_k, v} -> is_nil(v) end)

    with {:ok, %{conversations: conversations, count: count}} <-
           Chat.list_conversations(conn.assigns.ctx, opts) do
      render(conn, :index, conversations: conversations, count: count)
    end
  end

  @spec show_for_client(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show_for_client(conn, %{"client_id" => client_id}) do
    with {:ok, conversation} <-
           Chat.get_or_create_conversation_for_client(conn.assigns.ctx, client_id) do
      render(conn, :show, conversation: conversation)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {:ok, conversation} <- Chat.get_conversation(conn.assigns.ctx, id) do
      render(conn, :show, conversation: conversation)
    end
  end

  @spec messages(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def messages(conn, %{"id" => id} = params) do
    opts =
      [before: params["before"], limit: parse_int(params["limit"])]
      |> Enum.reject(fn {_k, v} -> is_nil(v) end)

    with {:ok, %{messages: messages, has_more: has_more}} <-
           Chat.list_messages(conn.assigns.ctx, id, opts) do
      render(conn, :messages, messages: messages, has_more: has_more)
    end
  end

  @spec create_message(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create_message(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, message} <- Chat.send_message(conn.assigns.ctx, id, conn.body_params) do
      conn |> put_status(:created) |> render(:message, message: message)
    end
  end

  @spec mark_read(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def mark_read(conn, %{"id" => id}) do
    with {:ok, conversation} <- Chat.mark_read(conn.assigns.ctx, id) do
      render(conn, :show, conversation: conversation)
    end
  end

  defp parse_int(nil), do: nil
  defp parse_int(value) when is_integer(value), do: value

  defp parse_int(value) when is_binary(value) do
    case Integer.parse(value) do
      {int, ""} -> int
      _ -> nil
    end
  end
end
```

Create `backend/lib/easy_web/controllers/coaches/conversation_json.ex`:

```elixir
defmodule EasyWeb.Coaches.ConversationJSON do
  alias Easy.Chat.Conversation
  alias Easy.Chat.Message
  alias Easy.Clients.Client

  @spec index(%{conversations: [Conversation.t()], count: non_neg_integer()}) :: map()
  def index(%{conversations: conversations, count: count}),
    do: %{data: Enum.map(conversations, &data/1), count: count}

  @spec show(%{conversation: Conversation.t()}) :: map()
  def show(%{conversation: conversation}), do: %{data: data(conversation)}

  @spec messages(%{messages: [Message.t()], has_more: boolean()}) :: map()
  def messages(%{messages: messages, has_more: has_more}),
    do: %{data: Enum.map(messages, &message_data/1), has_more: has_more}

  @spec message(%{message: Message.t()}) :: map()
  def message(%{message: message}), do: %{data: message_data(message)}

  @spec data(Conversation.t()) :: map()
  def data(%Conversation{} = c) do
    %{
      id: c.id,
      client_id: c.client_id,
      client_name: client_name(c.client),
      last_message_at: c.last_message_at,
      last_message_preview: c.last_message_preview,
      unread_count: c.unread_count || 0,
      inserted_at: c.inserted_at,
      updated_at: c.updated_at
    }
  end

  @spec message_data(Message.t()) :: map()
  def message_data(%Message{} = m) do
    %{
      id: m.id,
      conversation_id: m.conversation_id,
      sender_type: m.sender_type,
      sender_id: m.sender_id,
      body: m.body,
      inserted_at: m.inserted_at
    }
  end

  defp client_name(%Client{} = client),
    do: String.trim("#{client.first_name} #{client.last_name}")

  defp client_name(_), do: nil
end
```

- [ ] **Step 5: Client controller + JSON**

Create `backend/lib/easy_web/controllers/clients/conversation_controller.ex`:

```elixir
defmodule EasyWeb.Clients.ConversationController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Chat
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ChatMessageCreateRequest,
    ChatMessageResponse,
    ChatMessagesResponse,
    ConversationResponse,
    ErrorResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create_message]

  tags ["client conversation"]

  operation :show,
    summary: "Get (or create) my conversation",
    operation_id: "getClientConversation",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Conversation", "application/json", ConversationResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :messages,
    summary: "List my messages (cursor-paginated, ascending)",
    operation_id: "listClientConversationMessages",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:before, :query, :string, "Message id cursor — return messages older than this", required: false),
      Operation.parameter(:limit, :query, :integer, "Page size (default 50, max 100)", required: false)
    ],
    responses: [
      ok: {"Messages", "application/json", ChatMessagesResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :create_message,
    summary: "Send a message to my coach team",
    operation_id: "createClientConversationMessage",
    security: [%{"bearerAuth" => []}],
    request_body: {"Message", "application/json", ChatMessageCreateRequest, required: true},
    responses: [
      created: {"Message", "application/json", ChatMessageResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :mark_read,
    summary: "Mark my conversation read",
    operation_id: "markClientConversationRead",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Conversation", "application/json", ConversationResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, conversation} <- Chat.get_client_conversation(conn.assigns.ctx) do
      render(conn, :show, conversation: conversation)
    end
  end

  @spec messages(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def messages(conn, params) do
    opts =
      [before: params["before"], limit: parse_int(params["limit"])]
      |> Enum.reject(fn {_k, v} -> is_nil(v) end)

    with {:ok, %{messages: messages, has_more: has_more}} <-
           Chat.list_client_messages(conn.assigns.ctx, opts) do
      render(conn, :messages, messages: messages, has_more: has_more)
    end
  end

  @spec create_message(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create_message(conn, _params) do
    with {:ok, message} <- Chat.send_client_message(conn.assigns.ctx, conn.body_params) do
      conn |> put_status(:created) |> render(:message, message: message)
    end
  end

  @spec mark_read(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def mark_read(conn, _params) do
    with {:ok, conversation} <- Chat.mark_client_read(conn.assigns.ctx) do
      render(conn, :show, conversation: conversation)
    end
  end

  defp parse_int(nil), do: nil
  defp parse_int(value) when is_integer(value), do: value

  defp parse_int(value) when is_binary(value) do
    case Integer.parse(value) do
      {int, ""} -> int
      _ -> nil
    end
  end
end
```

Create `backend/lib/easy_web/controllers/clients/conversation_json.ex`:

```elixir
defmodule EasyWeb.Clients.ConversationJSON do
  alias Easy.Chat.Conversation
  alias Easy.Chat.Message

  @spec show(%{conversation: Conversation.t()}) :: map()
  def show(%{conversation: conversation}), do: %{data: data(conversation)}

  @spec messages(%{messages: [Message.t()], has_more: boolean()}) :: map()
  def messages(%{messages: messages, has_more: has_more}),
    do: %{data: Enum.map(messages, &message_data/1), has_more: has_more}

  @spec message(%{message: Message.t()}) :: map()
  def message(%{message: message}), do: %{data: message_data(message)}

  @spec data(Conversation.t()) :: map()
  def data(%Conversation{} = c) do
    %{
      id: c.id,
      client_id: c.client_id,
      last_message_at: c.last_message_at,
      last_message_preview: c.last_message_preview,
      unread_count: c.unread_count || 0,
      inserted_at: c.inserted_at,
      updated_at: c.updated_at
    }
  end

  @spec message_data(Message.t()) :: map()
  def message_data(%Message{} = m) do
    %{
      id: m.id,
      conversation_id: m.conversation_id,
      sender_type: m.sender_type,
      sender_id: m.sender_id,
      body: m.body,
      inserted_at: m.inserted_at
    }
  end
end
```

Note: the client-view `Conversation` includes `client_id` but not `client_name`; the shared OpenAPI `Conversation` schema marks `client_name` nullable/optional, which covers both views. Do not create a second schema for this.

- [ ] **Step 6: Routes**

In `backend/lib/easy_web/router.ex`, inside `scope "/v1/coach"` (where the thread routes were):

```elixir
    # Chat
    get "/conversations", ConversationController, :index
    get "/conversations/:id", ConversationController, :show
    get "/conversations/:id/messages", ConversationController, :messages
    post "/conversations/:id/messages", ConversationController, :create_message
    post "/conversations/:id/read", ConversationController, :mark_read
    get "/clients/:client_id/conversation", ConversationController, :show_for_client
```

Inside `scope "/v1/client"`:

```elixir
    # Chat
    get "/conversation", ConversationController, :show
    get "/conversation/messages", ConversationController, :messages
    post "/conversation/messages", ConversationController, :create_message
    post "/conversation/read", ConversationController, :mark_read
```

- [ ] **Step 7: Run the tests**

Run: `cd backend && mix test test/easy_web/controllers/coaches/conversation_controller_test.exs test/easy_web/controllers/clients/conversation_controller_test.exs`
Expected: PASS

- [ ] **Step 8: Verify the OpenAPI document renders**

Run: `cd backend && mix run -e 'EasyWeb.ApiSpec.spec() |> Jason.encode!() |> then(&IO.puts(byte_size(&1)))'`
Expected: prints a byte size (no raise). If it raises, a schema module reference is wrong.

- [ ] **Step 9: Run precommit and commit**

Run: `cd backend && mix precommit`
Expected: PASS

```bash
git add -A && git commit -m "feat(chat): conversation HTTP API for coach and client"
```

---

### Task 5: Phoenix socket + channels

**Files:**
- Modify: `backend/lib/easy_web/endpoint.ex`
- Create: `backend/lib/easy_web/channels/user_socket.ex`
- Create: `backend/lib/easy_web/channels/conversation_channel.ex`
- Create: `backend/lib/easy_web/channels/inbox_channel.ex`
- Create: `backend/test/support/channel_case.ex`
- Modify: `backend/config/runtime.exs` (prod `check_origin`)
- Test: `backend/test/easy_web/channels/conversation_channel_test.exs`, `backend/test/easy_web/channels/inbox_channel_test.exs`

**Interfaces:**
- Consumes: `Easy.Identity.Token.verify_access_token/1`, `Easy.Utils.safe_to_atom/2`, `Easy.Ctx.new/4`, `Easy.Chat.get_conversation/2`, `Easy.Chat.get_client_conversation/1`, the PubSub tuples from Task 3, `EasyWeb.Coaches.ConversationJSON.message_data/1`.
- Produces (frontend contract):
  - WS endpoint `/socket` (`phoenix` JS client), connect params `{token: <access_token>}`.
  - Topic `conversation:<conversation_id>` → event `"message_new"`, payload = ChatMessage JSON.
  - Topic `inbox` (coach only; the channel derives the business from the socket's ctx and subscribes itself to the `inbox:business:<id>` PubSub topic — the frontend never needs to know its business id) → event `"conversation_updated"`, payload `{conversation_id}`.

- [ ] **Step 1: ChannelCase support file**

Create `backend/test/support/channel_case.ex`:

```elixir
defmodule Easy.ChannelCase do
  use ExUnit.CaseTemplate

  using do
    quote do
      import Phoenix.ChannelTest
      import Easy.ChannelCase
      import Easy.Factory

      @endpoint EasyWeb.Endpoint
    end
  end

  setup tags do
    Easy.DataCase.setup_sandbox(tags)
    :ok
  end

  @spec coach_token(Easy.Orgs.Coach.t()) :: String.t()
  def coach_token(coach) do
    business = Easy.Repo.get!(Easy.Orgs.Business, coach.business_id)

    Joken.generate_and_sign!(
      Easy.Identity.Token.token_config(),
      %{
        user_id: coach.user_id,
        session_id: Ecto.UUID.generate(),
        role: "coach",
        business_id: coach.business_id,
        coach_id: coach.id,
        is_owner: business.owner_id == coach.user_id
      },
      Easy.Identity.Token.signer()
    )
  end

  @spec client_token(Easy.Clients.Client.t()) :: String.t()
  def client_token(client) do
    Joken.generate_and_sign!(
      Easy.Identity.Token.token_config(),
      %{
        user_id: client.user_id,
        session_id: Ecto.UUID.generate(),
        role: "client",
        business_id: client.business_id
      },
      Easy.Identity.Token.signer()
    )
  end
end
```

- [ ] **Step 2: Write failing channel tests**

Create `backend/test/easy_web/channels/conversation_channel_test.exs`:

```elixir
defmodule EasyWeb.ConversationChannelTest do
  use Easy.ChannelCase

  alias Easy.Chat
  alias Easy.Ctx

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, user: insert(:user))

    {:ok, conversation} =
      Chat.get_or_create_conversation_for_client(
        Ctx.new(coach.business_id, coach.user_id, coach.id, true),
        client.id
      )

    %{coach: coach, client: client, conversation: conversation}
  end

  test "rejects a connect with a bad token" do
    assert :error = connect(EasyWeb.UserSocket, %{"token" => "garbage"})
  end

  test "client can join their own conversation and receives message_new", ctx do
    {:ok, socket} = connect(EasyWeb.UserSocket, %{"token" => client_token(ctx.client)})
    {:ok, _reply, _socket} = subscribe_and_join(socket, "conversation:#{ctx.conversation.id}")

    coach_ctx = Ctx.new(ctx.coach.business_id, ctx.coach.user_id, ctx.coach.id, true)
    {:ok, message} = Chat.send_message(coach_ctx, ctx.conversation.id, %{"body" => "hello"})

    message_id = message.id
    assert_push "message_new", %{id: ^message_id, body: "hello", sender_type: :coach}
  end

  test "visible coach can join", ctx do
    {:ok, socket} = connect(EasyWeb.UserSocket, %{"token" => coach_token(ctx.coach)})
    assert {:ok, _reply, _socket} = subscribe_and_join(socket, "conversation:#{ctx.conversation.id}")
  end

  test "unassigned trainer cannot join", ctx do
    trainer = insert(:coach, business: ctx.coach.business)
    {:ok, socket} = connect(EasyWeb.UserSocket, %{"token" => coach_token(trainer)})
    assert {:error, %{reason: "unauthorized"}} = subscribe_and_join(socket, "conversation:#{ctx.conversation.id}")
  end

  test "client cannot join another client's conversation", ctx do
    other = insert(:client, business: ctx.coach.business, creator: ctx.coach, user: insert(:user))
    {:ok, socket} = connect(EasyWeb.UserSocket, %{"token" => client_token(other)})
    assert {:error, %{reason: "unauthorized"}} = subscribe_and_join(socket, "conversation:#{ctx.conversation.id}")
  end
end
```

Create `backend/test/easy_web/channels/inbox_channel_test.exs`:

```elixir
defmodule EasyWeb.InboxChannelTest do
  use Easy.ChannelCase

  alias Easy.Chat
  alias Easy.Ctx

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
    %{coach: coach, client: client}
  end

  test "coach joins the inbox and gets id-only updates for their business", %{coach: coach, client: client} do
    {:ok, socket} = connect(EasyWeb.UserSocket, %{"token" => coach_token(coach)})
    {:ok, _reply, _socket} = subscribe_and_join(socket, "inbox")

    {:ok, _message} = Chat.send_client_message(Ctx.new(client.business_id, client.user_id), %{"body" => "yo"})

    assert_push "conversation_updated", payload
    assert %{conversation_id: conversation_id} = payload
    assert map_size(payload) == 1
    assert is_binary(conversation_id)
  end

  test "coach of another business does not receive the update", %{client: client} do
    other_coach = insert(:coach)
    {:ok, socket} = connect(EasyWeb.UserSocket, %{"token" => coach_token(other_coach)})
    {:ok, _reply, _socket} = subscribe_and_join(socket, "inbox")

    {:ok, _message} = Chat.send_client_message(Ctx.new(client.business_id, client.user_id), %{"body" => "yo"})

    refute_push "conversation_updated", %{conversation_id: _}
  end

  test "client cannot join the inbox", %{client: client} do
    {:ok, socket} = connect(EasyWeb.UserSocket, %{"token" => client_token(client)})
    assert {:error, %{reason: "unauthorized"}} = subscribe_and_join(socket, "inbox")
  end
end
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && mix test test/easy_web/channels/`
Expected: FAIL — `EasyWeb.UserSocket` is not available.

- [ ] **Step 4: Implement socket + channels**

Add to `backend/lib/easy_web/endpoint.ex` (right after `use Phoenix.Endpoint, otp_app: :easy`):

```elixir
  socket "/socket", EasyWeb.UserSocket,
    websocket: true,
    longpoll: false
```

Create `backend/lib/easy_web/channels/user_socket.ex`:

```elixir
defmodule EasyWeb.UserSocket do
  use Phoenix.Socket

  alias Easy.Ctx
  alias Easy.Identity.Token
  alias Easy.Utils

  channel "conversation:*", EasyWeb.ConversationChannel
  channel "inbox", EasyWeb.InboxChannel

  @impl true
  def connect(%{"token" => token}, socket, _connect_info) do
    with {:ok, claims} <- Token.verify_access_token(token),
         role when not is_nil(role) <- Utils.safe_to_atom(claims["role"], ~w(coach client)) do
      ctx = Ctx.new(claims["business_id"], claims["user_id"], claims["coach_id"], claims["is_owner"] == true)
      {:ok, assign(socket, ctx: ctx, role: role)}
    else
      _ -> :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.ctx.user_id}"
end
```

Create `backend/lib/easy_web/channels/conversation_channel.ex`:

```elixir
defmodule EasyWeb.ConversationChannel do
  use Phoenix.Channel

  alias Easy.Chat
  alias EasyWeb.Coaches.ConversationJSON

  @impl true
  def join("conversation:" <> conversation_id, _payload, socket) do
    case authorize(socket, conversation_id) do
      :ok -> {:ok, socket}
      :error -> {:error, %{reason: "unauthorized"}}
    end
  end

  @impl true
  def handle_info({:chat_message_created, message}, socket) do
    push(socket, "message_new", ConversationJSON.message_data(message))
    {:noreply, socket}
  end

  def handle_info(_message, socket), do: {:noreply, socket}

  defp authorize(%{assigns: %{role: :client, ctx: ctx}}, conversation_id) do
    case Chat.get_client_conversation(ctx) do
      {:ok, %{id: ^conversation_id}} -> :ok
      _ -> :error
    end
  end

  defp authorize(%{assigns: %{role: :coach, ctx: ctx}}, conversation_id) do
    case Chat.get_conversation(ctx, conversation_id) do
      {:ok, _conversation} -> :ok
      _ -> :error
    end
  end

  defp authorize(_socket, _conversation_id), do: :error
end
```

Create `backend/lib/easy_web/channels/inbox_channel.ex`:

```elixir
defmodule EasyWeb.InboxChannel do
  use Phoenix.Channel

  @impl true
  def join("inbox", _payload, socket) do
    %{ctx: ctx, role: role} = socket.assigns

    if role == :coach do
      # The channel process subscribes to the business-wide topic the context
      # broadcasts on; the client never supplies (or learns) the business id.
      Phoenix.PubSub.subscribe(Easy.PubSub, "inbox:business:#{ctx.business_id}")
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  # Payload is id-only by design: trainers in the business may not be allowed to
  # see this client; the frontend refetches over HTTP, where visibility filters.
  @impl true
  def handle_info({:conversation_updated, conversation_id}, socket) do
    push(socket, "conversation_updated", %{conversation_id: conversation_id})
    {:noreply, socket}
  end

  def handle_info(_message, socket), do: {:noreply, socket}
end
```

- [ ] **Step 5: Prod check_origin**

In `backend/config/runtime.exs`, inside the `if config_env() == :prod do` block where `EasyWeb.Endpoint` is configured, add `check_origin` sourced from the same origins env CORS uses:

```elixir
  config :easy, EasyWeb.Endpoint,
    check_origin: String.split(System.get_env("CORS_ALLOWED_ORIGINS") || "", ",", trim: true)
```

(Merge into the existing `config :easy, EasyWeb.Endpoint, ...` call for prod rather than adding a duplicate block if one already exists there.)

- [ ] **Step 6: Run tests**

Run: `cd backend && mix test test/easy_web/channels/ test/easy/chat_test.exs`
Expected: PASS

- [ ] **Step 7: Run precommit and commit**

Run: `cd backend && mix precommit`
Expected: PASS

```bash
git add -A && git commit -m "feat(chat): user socket + conversation/inbox channels (receive-only)"
```

---

### Task 6: Regenerate API clients + chat API layer (both apps)

**Files:**
- Regenerate: `frontend/apps/coachapp-v2/src/api/generated.ts`, `frontend/apps/clientapp-v2/src/api/generated.ts` (and the schema files under `frontend/openapi/`)
- Modify: `frontend/apps/coachapp-v2/src/api/base.ts`, `frontend/apps/clientapp-v2/src/api/base.ts` (add tag types)
- Create: `frontend/apps/coachapp-v2/src/api/conversations.ts`
- Create: `frontend/apps/clientapp-v2/src/api/conversation.ts`
- Modify: `frontend/AGENTS.md` (hand-written infinite list registry)

**Interfaces:**
- Consumes: Task 4's endpoints/operation ids; the generated types `Conversation`, `ChatMessage`, `ListCoachConversationMessagesApiResponse` / `ListClientConversationMessagesApiResponse` (rtk-codegen names types after the OpenAPI schemas).
- Produces:
  - coachapp `@/api/conversations`: hooks `useListCoachConversationsQuery`, `useGetCoachConversationQuery`, `useGetCoachClientConversationQuery`, `useCreateCoachConversationMessageMutation`, `useMarkCoachConversationReadMutation`, `useConversationMessagesInfiniteQuery` (arg `{conversationId: string}`), and `appendMessageAction(conversationId, message)` (a dispatchable cache-update action that de-dupes by message id).
  - clientapp `@/api/conversation`: hooks `useGetClientConversationQuery`, `useCreateClientConversationMessageMutation`, `useMarkClientConversationReadMutation`, `useClientMessagesInfiniteQuery` (no arg), and `appendClientMessageAction(message)`.
  - Tag vocabulary both apps: `'Conversation'` (id `'LIST'` for the inbox/own-conversation, id `<conversationId>` for singles) and `'ChatMessage'`.

- [ ] **Step 1: Regenerate the clients**

Restart the backend dev server first (OpenApiSpex spec is cached — a stale server regenerates the OLD spec), then:

```bash
just backend   # or however the dev server is (re)started — must be running the Task 1–5 code
just gen-api
```

Verify: `grep -c "CoachConversation" frontend/apps/coachapp-v2/src/api/generated.ts` prints a nonzero count, and `grep -c "Thread" frontend/apps/coachapp-v2/src/api/generated.ts` prints 0 (thread endpoints gone).

- [ ] **Step 2: Add tag types**

In both `frontend/apps/coachapp-v2/src/api/base.ts` and `frontend/apps/clientapp-v2/src/api/base.ts`, add to the `tagTypes` array (alphabetical position):

```ts
    'ChatMessage',
    'Conversation',
```

- [ ] **Step 3: coachapp API module**

Create `frontend/apps/coachapp-v2/src/api/conversations.ts`:

```ts
import type {ChatMessage, ListCoachConversationMessagesApiResponse} from '@/api/generated';

import {api} from '@/api/base';
import {coachApi} from '@/api/generated';

export type {ChatMessage, Conversation} from '@/api/generated';

const PAGE_SIZE = 50;

// Cursor-paginated chat history stays hand-written (codegen can't emit
// infiniteQuery — see frontend/AGENTS.md). pageParam is the oldest loaded
// message id; the backend returns messages older than it, ascending.
export const conversationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    conversationMessages: build.infiniteQuery<
      ListCoachConversationMessagesApiResponse,
      {conversationId: string},
      string | undefined
    >({
      query: ({queryArg, pageParam}) => ({
        url: `/v1/coach/conversations/${queryArg.conversationId}/messages`,
        params: {limit: PAGE_SIZE, ...(pageParam && {before: pageParam})},
      }),
      infiniteQueryOptions: {
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.data[0]?.id : undefined),
      },
      providesTags: (_result, _error, arg) => [{type: 'ChatMessage', id: arg.conversationId}],
    }),
  }),
});

const enhanced = coachApi.enhanceEndpoints({
  endpoints: {
    listCoachConversations: {providesTags: [{type: 'Conversation', id: 'LIST'}]},
    getCoachConversation: {providesTags: (_r, _e, arg) => [{type: 'Conversation', id: arg.id}]},
    getCoachClientConversation: {
      providesTags: (result) => (result ? [{type: 'Conversation', id: result.data.id}] : []),
    },
    createCoachConversationMessage: {invalidatesTags: [{type: 'Conversation', id: 'LIST'}]},
    markCoachConversationRead: {
      invalidatesTags: (_r, _e, arg) => [
        {type: 'Conversation', id: 'LIST'},
        {type: 'Conversation', id: arg.id},
      ],
    },
  },
});

/** Append a message to the cached history (no-op if already present, e.g. own send echoed back over the channel). */
export const appendMessageAction = (conversationId: string, message: ChatMessage) =>
  conversationsApi.util.updateQueryData('conversationMessages', {conversationId}, (draft) => {
    const exists = draft.pages.some((page) => page.data.some((m) => m.id === message.id));
    if (!exists) {
      draft.pages[0]?.data.push(message);
    }
  });

export const {
  useListCoachConversationsQuery,
  useGetCoachConversationQuery,
  useGetCoachClientConversationQuery,
  useCreateCoachConversationMessageMutation,
  useMarkCoachConversationReadMutation,
} = enhanced;

export const {useConversationMessagesInfiniteQuery} = conversationsApi;
```

(If the generated mutation arg property names differ — check `generated.ts` for the exact `queryArg` shapes, e.g. `{id, chatMessageCreateRequest}` — match them; do not guess.)

- [ ] **Step 4: clientapp API module**

Create `frontend/apps/clientapp-v2/src/api/conversation.ts`:

```ts
import type {ChatMessage, ListClientConversationMessagesApiResponse} from '@/api/generated';

import {api} from '@/api/base';
import {clientApi} from '@/api/generated';

export type {ChatMessage, Conversation} from '@/api/generated';

const PAGE_SIZE = 50;

export const conversationApi = api.injectEndpoints({
  endpoints: (build) => ({
    clientMessages: build.infiniteQuery<ListClientConversationMessagesApiResponse, void, string | undefined>({
      query: ({pageParam}) => ({
        url: '/v1/client/conversation/messages',
        params: {limit: PAGE_SIZE, ...(pageParam && {before: pageParam})},
      }),
      infiniteQueryOptions: {
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.data[0]?.id : undefined),
      },
      providesTags: [{type: 'ChatMessage', id: 'MINE'}],
    }),
  }),
});

const enhanced = clientApi.enhanceEndpoints({
  endpoints: {
    getClientConversation: {providesTags: [{type: 'Conversation', id: 'LIST'}]},
    createClientConversationMessage: {invalidatesTags: [{type: 'Conversation', id: 'LIST'}]},
    markClientConversationRead: {invalidatesTags: [{type: 'Conversation', id: 'LIST'}]},
  },
});

export const appendClientMessageAction = (message: ChatMessage) =>
  conversationApi.util.updateQueryData('clientMessages', undefined, (draft) => {
    const exists = draft.pages.some((page) => page.data.some((m) => m.id === message.id));
    if (!exists) {
      draft.pages[0]?.data.push(message);
    }
  });

export const {
  useGetClientConversationQuery,
  useCreateClientConversationMessageMutation,
  useMarkClientConversationReadMutation,
} = enhanced;

export const {useClientMessagesInfiniteQuery} = conversationApi;
```

- [ ] **Step 5: Update the infinite-list registry**

In `frontend/AGENTS.md`, section "Infinite-scroll Lists Stay Hand-Written", add to the lists:

```md
- **coachapp:** … , conversation messages (cursor `before`, in `src/api/conversations.ts`)
- **clientapp:** … , conversation messages (cursor `before`, in `src/api/conversation.ts`)
```

- [ ] **Step 6: Typecheck both apps**

```bash
cd frontend && pnpm --filter coachapp-v2 typecheck && pnpm --filter clientapp-v2 exec tsc --noEmit
```
Expected: clean. (clientapp has no `typecheck` script — its `build` runs tsc; the exec form above is equivalent.)

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(chat): regenerate API clients, add conversation API modules"
```

---

### Task 7: Socket infrastructure (both apps)

**Files:**
- Modify: `frontend/apps/coachapp-v2/package.json`, `frontend/apps/clientapp-v2/package.json` (add `phoenix`)
- Create: `frontend/apps/coachapp-v2/src/api/socket.ts`, `frontend/apps/coachapp-v2/src/@hooks/use-channel-event.ts`
- Create: `frontend/apps/clientapp-v2/src/api/socket.ts`, `frontend/apps/clientapp-v2/src/@hooks/use-channel-event.ts`

**Interfaces:**
- Consumes: `getAccessToken` from each app's `@/api/authStorage`; backend `/socket` from Task 5.
- Produces: `getSocket(): Socket` (lazy singleton, token via params closure) and `useChannelEvent(topic: string | null, event: string, onPayload: (payload: unknown) => void)` — joins on mount, leaves on unmount, null topic = no-op. **Rule: exactly one component may join a given topic at a time** (phoenix.js rejects duplicate topic joins on one socket); Tasks 8–9 are structured to respect this.

- [ ] **Step 1: Add the dependency**

```bash
cd frontend && pnpm --filter coachapp-v2 add phoenix && pnpm --filter coachapp-v2 add -D @types/phoenix \
  && pnpm --filter clientapp-v2 add phoenix && pnpm --filter clientapp-v2 add -D @types/phoenix
```

- [ ] **Step 2: Socket module (identical in both apps)**

Create `frontend/apps/coachapp-v2/src/api/socket.ts` AND `frontend/apps/clientapp-v2/src/api/socket.ts`:

```ts
import {Socket} from 'phoenix';

import {getAccessToken} from '@/api/authStorage';

let baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

if (window.location.hostname.startsWith('192.168.')) {
  baseURL = `http://${window.location.hostname}:4000`;
}

const wsURL = `${baseURL.replace(/^http/, 'ws')}/socket`;

let socket: Socket | null = null;

// Access tokens live 5 minutes; the params closure is re-evaluated on every
// (re)connect, so reconnects always carry the freshest token.
export function getSocket(): Socket {
  if (!socket) {
    socket = new Socket(wsURL, {params: () => ({token: getAccessToken() ?? ''})});
    socket.connect();
  }
  return socket;
}
```

- [ ] **Step 3: Channel hook (identical in both apps)**

Create `frontend/apps/coachapp-v2/src/@hooks/use-channel-event.ts` AND `frontend/apps/clientapp-v2/src/@hooks/use-channel-event.ts`:

```ts
import {useEffect, useRef} from 'react';

import {getSocket} from '@/api/socket';

/**
 * Join `topic` and invoke `onPayload` for every `event`. Pass a null topic to
 * skip (e.g. while the conversation id is still loading). Only ONE mounted
 * component may join a given topic — phoenix.js rejects duplicate joins.
 */
export function useChannelEvent(topic: string | null, event: string, onPayload: (payload: unknown) => void) {
  const handlerRef = useRef(onPayload);
  handlerRef.current = onPayload;

  useEffect(() => {
    if (!topic) {
      return;
    }
    const channel = getSocket().channel(topic);
    channel.on(event, (payload: unknown) => handlerRef.current(payload));
    channel.join();
    return () => {
      channel.leave();
    };
  }, [topic, event]);
}
```

- [ ] **Step 4: Typecheck and commit**

```bash
cd frontend && pnpm --filter coachapp-v2 typecheck && pnpm --filter clientapp-v2 exec tsc --noEmit
git add -A && git commit -m "feat(chat): phoenix socket client + channel hook in both apps"
```

---

### Task 8: coachapp — inbox, conversation view, client-detail entry, nav badge

**Files:**
- Modify: `frontend/apps/coachapp-v2/src/@config/routes.ts`, `frontend/apps/coachapp-v2/src/router.tsx`, `frontend/apps/coachapp-v2/src/@components/app-shell.tsx`, `frontend/apps/coachapp-v2/src/clients/client-detail.tsx`
- Create: `frontend/apps/coachapp-v2/src/messages/messages-inbox.tsx`, `frontend/apps/coachapp-v2/src/messages/conversation-page.tsx`, `frontend/apps/coachapp-v2/src/messages/conversation-view.tsx`, `frontend/apps/coachapp-v2/src/messages/client-conversation.tsx`

**Interfaces:**
- Consumes: everything Task 6's `@/api/conversations` and Task 7's `useChannelEvent` produce.
- Produces: routes `/messages`, `/messages/:id`, `/clients/:id/messages`; `<ConversationView conversationId title backTo>`; inbox realtime (channel `inbox` joined once in AppShell).

Design notes locked here (deviations from the spec's letter, same intent):
- Client detail has no tab system — the "Messages tab" becomes a link card (same pattern as the existing Profile card) navigating to `/clients/:id/messages`.
- Sidebar gets a Messages item with an unread badge; mobile bottom nav gets the same item (6 items — acceptable; revisit if cramped).

- [ ] **Step 1: Routes**

In `frontend/apps/coachapp-v2/src/@config/routes.ts` add:

```ts
  MESSAGES: '/messages',
  CONVERSATION: '/messages/:id',
  CLIENT_MESSAGES: '/clients/:id/messages',
```

In `frontend/apps/coachapp-v2/src/router.tsx` import and register inside the AppShell children:

```tsx
import ClientConversation from '@/messages/client-conversation';
import ConversationPage from '@/messages/conversation-page';
import MessagesInbox from '@/messages/messages-inbox';
```

```tsx
      {path: ROUTES.MESSAGES, Component: MessagesInbox},
      {path: ROUTES.CONVERSATION, Component: ConversationPage},
      {path: ROUTES.CLIENT_MESSAGES, Component: ClientConversation},
```

- [ ] **Step 2: ConversationView (the shared chat surface)**

Create `frontend/apps/coachapp-v2/src/messages/conversation-view.tsx`:

```tsx
import {Button, Spinner, TextArea, Typography} from '@heroui/react';
import {ArrowLeft, Send} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';
import {Link} from 'react-router-dom';

import {useChannelEvent} from '@/@hooks/use-channel-event';
import {api} from '@/api/base';
import {
  appendMessageAction,
  type ChatMessage,
  useConversationMessagesInfiniteQuery,
  useCreateCoachConversationMessageMutation,
  useMarkCoachConversationReadMutation,
} from '@/api/conversations';

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'});
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
}

function MessageBubble({message, own}: {message: ChatMessage; own: boolean}) {
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 ${
          own ? 'rounded-br-sm bg-accent text-accent-foreground' : 'rounded-bl-sm bg-surface-secondary'
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
        <p className={`mt-0.5 text-right text-[10px] ${own ? 'text-accent-foreground/70' : 'text-muted'}`}>
          {formatTime(message.inserted_at)}
        </p>
      </div>
    </div>
  );
}

export default function ConversationView({
  backTo,
  conversationId,
  title,
}: {
  backTo: string;
  conversationId: string;
  title: string;
}) {
  const dispatch = useDispatch();
  const [body, setBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useConversationMessagesInfiniteQuery({
    conversationId,
  });
  const [sendMessage, {isLoading: isSending}] = useCreateCoachConversationMessageMutation();
  const [markRead] = useMarkCoachConversationReadMutation();

  // Pages arrive newest-chunk-first, each chunk ascending → reverse pages, keep chunks.
  const messages = [...(data?.pages ?? [])].reverse().flatMap((page) => page.data);
  const lastMessageId = messages.at(-1)?.id;

  useChannelEvent(`conversation:${conversationId}`, 'message_new', (payload) => {
    dispatch(appendMessageAction(conversationId, payload as ChatMessage));
    dispatch(api.util.invalidateTags([{type: 'Conversation', id: 'LIST'}]));
  });

  // Everything currently loaded is on screen → advance the read cursor.
  useEffect(() => {
    if (lastMessageId) {
      markRead({id: conversationId});
    }
  }, [conversationId, lastMessageId, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior: 'instant', block: 'end'});
  }, [lastMessageId]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || isSending) {
      return;
    }
    const result = await sendMessage({id: conversationId, chatMessageCreateRequest: {body: trimmed}});
    if ('data' in result && result.data) {
      dispatch(appendMessageAction(conversationId, result.data.data));
      setBody('');
    }
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex min-h-14 items-center gap-3 border-b border-border px-4">
        <Link
          className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-hover"
          to={backTo}
        >
          <ArrowLeft size={18} />
        </Link>
        <Typography
          truncate
          type="body-md"
          weight="semibold"
        >
          {title}
        </Typography>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="sm" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {hasNextPage ? (
              <Button
                className="self-center"
                isPending={isFetchingNextPage}
                onPress={() => fetchNextPage()}
                size="sm"
                variant="secondary"
              >
                Load older messages
              </Button>
            ) : null}
            {messages.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">No messages yet. Say hello!</p>
            ) : null}
            {messages.map((message, index) => {
              const prev = messages[index - 1];
              const newDay = !prev || formatDay(prev.inserted_at) !== formatDay(message.inserted_at);
              return (
                <div key={message.id}>
                  {newDay ? (
                    <p className="my-2 text-center text-xs text-muted">{formatDay(message.inserted_at)}</p>
                  ) : null}
                  <MessageBubble
                    message={message}
                    own={message.sender_type === 'coach'}
                  />
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <footer className="flex items-end gap-2 border-t border-border p-3">
        <TextArea
          aria-label="Message"
          className="flex-1"
          onChange={setBody}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Write a message…"
          rows={1}
          value={body}
        />
        <Button
          aria-label="Send"
          isDisabled={!body.trim()}
          isPending={isSending}
          onPress={handleSend}
        >
          <Send size={16} />
        </Button>
      </footer>
    </div>
  );
}
```

(HeroUI `TextArea` prop shapes vary by version — if `onChange` passes an event rather than the value, adapt to `(e) => setBody(e.target.value)`; check an existing `TextArea` usage such as `client-detail.tsx`.)

- [ ] **Step 3: Inbox page**

Create `frontend/apps/coachapp-v2/src/messages/messages-inbox.tsx`:

```tsx
import {Avatar, Chip, Description, Label, ListBox} from '@heroui/react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {type Conversation, useListCoachConversationsQuery} from '@/api/conversations';

function timeAgo(iso: string | null | undefined) {
  if (!iso) {
    return '';
  }
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) {
    return 'now';
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  if (minutes < 24 * 60) {
    return `${Math.round(minutes / 60)}h`;
  }
  return `${Math.round(minutes / (24 * 60))}d`;
}

function ConversationListItem({conversation}: {conversation: Conversation}) {
  const name = conversation.client_name || 'Client';
  const initial = name[0]?.toUpperCase() ?? '';
  const unread = conversation.unread_count > 0;

  return (
    <ListBox.Item
      className="min-h-fit px-4 py-3 sm:px-8"
      id={conversation.id}
      textValue={name}
    >
      <Avatar size="sm">
        <Avatar.Fallback>{initial}</Avatar.Fallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <Label className="truncate">{name}</Label>
        <Description className={`truncate ${unread ? 'font-medium text-foreground' : ''}`}>
          {conversation.last_message_preview ?? 'No messages yet'}
        </Description>
      </div>
      <div className="ms-auto flex shrink-0 flex-col items-end gap-1">
        <span className="text-xs text-muted">{timeAgo(conversation.last_message_at)}</span>
        {unread ? (
          <Chip
            color="accent"
            size="sm"
          >
            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
          </Chip>
        ) : null}
      </div>
    </ListBox.Item>
  );
}

export default function MessagesInbox() {
  const navigate = useNavigate();
  // ponytail: flat first-100 inbox, add offset paging when a business outgrows it.
  const {data, isError, isLoading, refetch} = useListCoachConversationsQuery({limit: 100});
  const conversations = data?.data ?? [];

  return (
    <Page>
      <Page.Header title="Messages" />
      <Page.Content>
        <BrowseListBox
          ariaLabel="Conversations"
          className="flex-1 gap-0"
          emptyState={
            <ListEmptyState
              emptyDescription="Conversations with your clients will show up here."
              hasFilter={false}
              nounPlural="messages"
            />
          }
          fetchNextPage={() => undefined}
          isError={isError}
          isLoading={isLoading}
          items={conversations}
          onAction={(key) => navigate(ROUTES.CONVERSATION.replace(':id', String(key)))}
          onRetry={refetch}
          renderItem={(conversation) => <ConversationListItem conversation={conversation} />}
          skeletonAvatar
        />
      </Page.Content>
    </Page>
  );
}
```

(Check `@/@components/page` for the actual `Page.Header` API — match whatever `list-prospects.tsx` does for its title row.)

- [ ] **Step 4: Conversation page + client-detail entry**

Create `frontend/apps/coachapp-v2/src/messages/conversation-page.tsx`:

```tsx
import {Spinner} from '@heroui/react';
import {useParams} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {useGetCoachConversationQuery} from '@/api/conversations';
import ConversationView from '@/messages/conversation-view';

export default function ConversationPage() {
  const {id} = useParams<{id: string}>();
  const {data, isLoading} = useGetCoachConversationQuery({id: id!}, {skip: !id});

  if (isLoading || !data) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <ConversationView
      backTo={ROUTES.MESSAGES}
      conversationId={data.data.id}
      title={data.data.client_name || 'Client'}
    />
  );
}
```

Create `frontend/apps/coachapp-v2/src/messages/client-conversation.tsx`:

```tsx
import {Spinner} from '@heroui/react';
import {useParams} from 'react-router-dom';

import {useGetCoachClientConversationQuery} from '@/api/conversations';
import ConversationView from '@/messages/conversation-view';

export default function ClientConversation() {
  const {id} = useParams<{id: string}>();
  const {data, isLoading} = useGetCoachClientConversationQuery({clientId: id!}, {skip: !id});

  if (isLoading || !data) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <ConversationView
      backTo={`/clients/${id}`}
      conversationId={data.data.id}
      title={data.data.client_name || 'Client'}
    />
  );
}
```

In `frontend/apps/coachapp-v2/src/clients/client-detail.tsx`, add a Messages link card directly above the existing Profile link card (same markup pattern; `MessageCircle` is already imported):

```tsx
              <Link
                className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-hover active:bg-surface-hover sm:p-5"
                to={`/clients/${client.id}/messages`}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                  <MessageCircle size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <Typography
                    type="body-sm"
                    weight="semibold"
                  >
                    Messages
                  </Typography>
                  <Typography
                    color="muted"
                    type="body-xs"
                  >
                    Chat with this client
                  </Typography>
                </div>
                <ChevronRight
                  className="shrink-0 text-muted"
                  size={18}
                />
              </Link>
```

- [ ] **Step 5: App-shell nav item, badge, inbox realtime**

In `frontend/apps/coachapp-v2/src/@components/app-shell.tsx`:

Add imports: `MessageCircle` (lucide), `useDispatch` (react-redux), `useChannelEvent` from `@/@hooks/use-channel-event`, `api` from `@/api/base`, `useListCoachConversationsQuery` from `@/api/conversations`.

Add to `SIDEBAR_TOP` (after Clients) and to `BOTTOM_NAV` (after Clients):

```tsx
  {
    badge: <UnreadMessagesBadge />,
    icon: <MessageCircle size={ICON_SIZE} />,
    label: 'Messages',
    path: ROUTES.MESSAGES,
  },
```

Add the badge component next to `PendingClientBadge`:

```tsx
function UnreadMessagesBadge() {
  // ponytail: totals the first 100 conversations; matches the inbox page cap.
  const {data} = useListCoachConversationsQuery({limit: 100});
  const count = (data?.data ?? []).reduce((sum, c) => sum + c.unread_count, 0);
  if (count === 0) {
    return null;
  }
  return (
    <Chip
      color="accent"
      size="sm"
    >
      {count > 99 ? '99+' : count}
    </Chip>
  );
}
```

Inside the AppShell component body (the default export), wire the inbox channel — this is the ONLY join of topic `inbox`:

```tsx
  const dispatch = useDispatch();
  useChannelEvent('inbox', 'conversation_updated', () => {
    // Payload is id-only; refetch over HTTP where visibility is enforced.
    dispatch(api.util.invalidateTags([{type: 'Conversation', id: 'LIST'}]));
  });
```

- [ ] **Step 6: Verify in the running app**

With backend + `just web` running: log in as a coach, open Messages (empty state), open a client → Messages card → send a message; check it renders, the inbox row appears with preview, and the nav badge stays 0 (own messages aren't unread for the coach side).

- [ ] **Step 7: Lint, typecheck, commit**

```bash
cd frontend && pnpm --filter coachapp-v2 typecheck && just lint
git add -A && git commit -m "feat(chat): coachapp messages inbox, conversation view, client entry, live badge"
```

---

### Task 9: clientapp — chat screen, nav entry, badge

**Files:**
- Modify: `frontend/apps/clientapp-v2/src/@config/routes.ts`, `frontend/apps/clientapp-v2/src/router.tsx`, `frontend/apps/clientapp-v2/src/@components/app-shell.tsx`
- Create: `frontend/apps/clientapp-v2/src/messages/coach-chat.tsx`, `frontend/apps/clientapp-v2/src/messages/use-chat-realtime.ts`

**Interfaces:**
- Consumes: Task 6's `@/api/conversation`, Task 7's `useChannelEvent`.
- Produces: route `/messages`; bottom-nav "Coach" item with unread badge; single shell-level join of `conversation:<id>` (the chat screen does NOT join — it reads the cache the shell hook updates).

- [ ] **Step 1: Route + nav**

In `frontend/apps/clientapp-v2/src/@config/routes.ts` add:

```ts
  MESSAGES: '/messages',
```

In `frontend/apps/clientapp-v2/src/router.tsx` add to the AppShell children:

```tsx
import CoachChat from '@/messages/coach-chat';
```

```tsx
      {path: ROUTES.MESSAGES, Component: CoachChat},
```

In `frontend/apps/clientapp-v2/src/@components/app-shell.tsx` add to `BOTTOM_NAV` (after Check-ins; 6 items — the tab bar flexes):

```tsx
  {badge: <UnreadBadge />, icon: <MessageCircle size={ICON_SIZE} />, label: 'Coach', path: ROUTES.MESSAGES},
```

with imports `MessageCircle` (lucide) and the badge component:

```tsx
function UnreadBadge() {
  const {data} = useGetClientConversationQuery();
  const count = data?.data.unread_count ?? 0;
  if (count === 0) {
    return null;
  }
  return (
    <span className="absolute right-1/2 top-1 grid min-w-4 -translate-x-2 place-items-center rounded-full bg-accent px-1 text-[9px] font-semibold text-accent-foreground">
      {count > 99 ? '99+' : count}
    </span>
  );
}
```

(Position the dot relative to the `NavLink` — it is already `relative`; adjust offsets visually.)

- [ ] **Step 2: Shell-level realtime hook**

Create `frontend/apps/clientapp-v2/src/messages/use-chat-realtime.ts`:

```ts
import {useDispatch} from 'react-redux';

import {useChannelEvent} from '@/@hooks/use-channel-event';
import {api} from '@/api/base';
import {appendClientMessageAction, type ChatMessage, useGetClientConversationQuery} from '@/api/conversation';

/** Mounted once in AppShell — the single join of the conversation topic. */
export function useChatRealtime() {
  const dispatch = useDispatch();
  const {data} = useGetClientConversationQuery();
  const conversationId = data?.data.id ?? null;

  useChannelEvent(conversationId ? `conversation:${conversationId}` : null, 'message_new', (payload) => {
    dispatch(appendClientMessageAction(payload as ChatMessage));
    dispatch(api.util.invalidateTags([{type: 'Conversation', id: 'LIST'}]));
  });
}
```

Call `useChatRealtime()` inside the AppShell component body (`app-shell.tsx`).

- [ ] **Step 3: Chat screen**

Create `frontend/apps/clientapp-v2/src/messages/coach-chat.tsx`. Note: NO `useChannelEvent` here — the shell hook (Step 2) owns the conversation topic; incoming messages land in the shared RTK cache this screen reads.

```tsx
import {Button, Spinner, TextArea} from '@heroui/react';
import {Send} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import {
  appendClientMessageAction,
  type ChatMessage,
  useClientMessagesInfiniteQuery,
  useCreateClientConversationMessageMutation,
  useMarkClientConversationReadMutation,
} from '@/api/conversation';

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'});
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
}

function MessageBubble({message}: {message: ChatMessage}) {
  const own = message.sender_type === 'client';
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 ${
          own ? 'rounded-br-sm bg-accent text-accent-foreground' : 'rounded-bl-sm bg-surface-secondary'
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
        <p className={`mt-0.5 text-right text-[10px] ${own ? 'text-accent-foreground/70' : 'text-muted'}`}>
          {formatTime(message.inserted_at)}
        </p>
      </div>
    </div>
  );
}

export default function CoachChat() {
  const dispatch = useDispatch();
  const [body, setBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useClientMessagesInfiniteQuery();
  const [sendMessage, {isLoading: isSending}] = useCreateClientConversationMessageMutation();
  const [markRead] = useMarkClientConversationReadMutation();

  // Pages arrive newest-chunk-first, each chunk ascending → reverse pages, keep chunks.
  const messages = [...(data?.pages ?? [])].reverse().flatMap((page) => page.data);
  const lastMessageId = messages.at(-1)?.id;

  // The screen is visible ⇒ everything loaded is read.
  useEffect(() => {
    if (lastMessageId) {
      markRead();
    }
  }, [lastMessageId, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior: 'instant', block: 'end'});
  }, [lastMessageId]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || isSending) {
      return;
    }
    const result = await sendMessage({chatMessageCreateRequest: {body: trimmed}});
    if ('data' in result && result.data) {
      dispatch(appendClientMessageAction(result.data.data));
      setBody('');
    }
  };

  return (
    // Tab bar (h-16) stays visible below — reserve its height.
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <header className="flex min-h-12 items-center border-b border-border px-4 pt-[env(safe-area-inset-top)]">
        <h1 className="text-base font-bold">Your coach</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {hasNextPage ? (
              <Button
                className="self-center"
                isPending={isFetchingNextPage}
                onPress={() => fetchNextPage()}
                size="sm"
                variant="secondary"
              >
                Load older messages
              </Button>
            ) : null}
            {messages.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">
                No messages yet. Ask your coach anything!
              </p>
            ) : null}
            {messages.map((message, index) => {
              const prev = messages[index - 1];
              const newDay = !prev || formatDay(prev.inserted_at) !== formatDay(message.inserted_at);
              return (
                <div key={message.id}>
                  {newDay ? (
                    <p className="my-2 text-center text-xs text-muted">{formatDay(message.inserted_at)}</p>
                  ) : null}
                  <MessageBubble message={message} />
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <footer className="flex items-end gap-2 border-t border-border p-3">
        <TextArea
          aria-label="Message"
          className="flex-1"
          onChange={setBody}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Write a message…"
          rows={1}
          value={body}
        />
        <Button
          aria-label="Send"
          isDisabled={!body.trim()}
          isPending={isSending}
          onPress={handleSend}
        >
          <Send size={16} />
        </Button>
      </footer>
    </div>
  );
}
```

(HeroUI `TextArea` prop shapes vary by version — if `onChange` passes an event rather than the value, adapt to `(e) => setBody(e.target.value)`; clientapp is on HeroUI 3.0.2, check an existing usage.)

- [ ] **Step 4: Verify in the running app**

Client app + coach app side by side: send from coach → appears live in client chat and badge increments while client is on another tab; open chat → badge clears; reply from client → coach inbox updates live.

- [ ] **Step 5: Lint, typecheck, commit**

```bash
cd frontend && pnpm --filter clientapp-v2 exec tsc --noEmit && just lint
git add -A && git commit -m "feat(chat): clientapp coach chat screen with live updates and unread badge"
```

---

### Task 10: Delete dead chat packages + final verification

**Files:**
- Delete: `frontend/packages/chat/`, `frontend/packages/websocket/`
- Modify: `frontend/packages/hooks/package.json`, `frontend/packages/ui/package.json` (drop `@easy/websocket` / `@easy/chat` peer/workspace deps), `frontend/pnpm-workspace.yaml` only if it lists packages explicitly

**Interfaces:**
- Consumes: nothing. Produces: a tree with no Mantine-era chat remnants.

- [ ] **Step 1: Delete and unreference**

```bash
cd frontend
rm -rf packages/chat packages/websocket
grep -rn "@easy/chat\|@easy/websocket" --include=package.json --include=pnpm-workspace.yaml . | grep -v node_modules
# remove every hit, then:
pnpm install
```

- [ ] **Step 2: Full verification sweep**

```bash
cd backend && mix precommit
cd ../frontend && pnpm --filter coachapp-v2 typecheck && pnpm --filter clientapp-v2 exec tsc --noEmit && just lint
```
Expected: all clean.

- [ ] **Step 3: End-to-end check**

Run the full flow once more (coach send → client receives live → client reply → coach inbox badge). Also verify Swagger UI (`/swaggerui`) renders the chat operations.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore(chat): remove dead @easy/chat and @easy/websocket packages"
```
