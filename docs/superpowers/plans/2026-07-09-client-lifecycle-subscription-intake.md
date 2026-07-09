# Client Lifecycle, Subscription Tracking & Default Intake — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Streamline client status to `pending | active | inactive` (+ `inactive_reason`), add an `onboarding → coaching` stage with auto-advance, derived attention flags, subscription date tracking with a daily expiry sweep, and a curated default intake form auto-assigned on invite.

**Architecture:** All state lives on the existing `clients` table (3 new columns + 1 repurposed enum). Flags are computed per page of results in the context, returned as virtual fields. The sweep is a 40-line GenServer. The intake feature reuses the entire existing FormTemplate→FormAssignment→submission→profile-mapping pipeline; we ship curated content and two hooks.

**Tech Stack:** Elixir/Phoenix/Ecto (backend), OpenApiSpex → `just gen-api` → RTK Query (frontend), React 19 + HeroUI v3 (coachapp-v2, clientapp-v2).

**Spec:** `docs/superpowers/specs/2026-07-09-client-lifecycle-subscription-intake-design.md`

## Global Constraints

- Backend: follow `backend/AGENTS.md` (authority). Ctx-first public context functions; three-case naming; `{:ok, _}`/`{:error, _}` returns with bare-atom or changeset errors; no `@moduledoc`/`@doc`; `@spec` on public functions; trusted ids via `put_change`, never `cast`; every tenant query scoped by `business_id`.
- Run `mix precommit` (format, compile --warnings-as-errors, credo, test) from `backend/` before finishing any backend task. Run tests from `backend/` with `mix test <path>`.
- Status vocabulary (exact): statuses `pending | active | inactive`; stages `onboarding | coaching`; inactive reasons `manual | subscription_expired | awaiting_seat`. UI labels: `pending` displays as **"Invited"**; the intake flag is always **"Intake incomplete"** (the word "pending" is reserved for invites).
- Frontend: never hand-edit `src/api/generated.ts` (regenerate with `just gen-api` from repo root). Numeric inputs use `NumberInput`/`FormNumberField`, never react-aria `NumberField`. Verify with `pnpm -C apps/coachapp-v2 build` / `pnpm -C apps/clientapp-v2 build` from `frontend/`.
- The dev phx.server caches the OpenAPI spec — if one is running when backend schemas change, it must be restarted before the apps see new fields (422 "Unexpected field" otherwise). `just gen-api` itself runs a fresh mix task and is not affected.
- Commit after every task (small commits, conventional messages).
- Skim `docs/agents/recurring-mistakes.md` entries for the area you touch before finishing a task.

---

### Task 1: Migration — new columns, status remap, stage backfill

**Files:**
- Create: `backend/priv/repo/migrations/20260709090000_streamline_client_lifecycle.exs`

**Interfaces:**
- Produces: `clients.stage` (varchar, NOT NULL, default `'onboarding'`), `clients.inactive_reason` (varchar, nullable), `clients.subscription_started_on` / `clients.subscription_ends_on` (date, nullable). No `'archived'` or `'awaiting_seat'` rows remain.

- [ ] **Step 1: Write the migration**

Table names verified: `training_plans`, `nutrition_plans`.

```elixir
defmodule Easy.Repo.Migrations.StreamlineClientLifecycle do
  use Ecto.Migration

  def up do
    alter table(:clients) do
      add :stage, :string, null: false, default: "onboarding"
      add :inactive_reason, :string
      add :subscription_started_on, :date
      add :subscription_ends_on, :date
    end

    execute """
    UPDATE clients SET status = 'inactive', inactive_reason = 'manual'
    WHERE status = 'archived'
    """

    execute """
    UPDATE clients SET status = 'inactive', inactive_reason = 'awaiting_seat'
    WHERE status = 'awaiting_seat'
    """

    execute """
    UPDATE clients SET stage = 'coaching'
    WHERE EXISTS (SELECT 1 FROM training_plans tp WHERE tp.client_id = clients.id)
       OR EXISTS (SELECT 1 FROM nutrition_plans np WHERE np.client_id = clients.id)
    """

    create index(:clients, [:subscription_ends_on],
             where: "status = 'active' AND subscription_ends_on IS NOT NULL",
             name: :clients_active_subscription_ends_on_index
           )
  end

  def down do
    drop index(:clients, [:subscription_ends_on],
           name: :clients_active_subscription_ends_on_index
         )

    execute """
    UPDATE clients SET status = 'awaiting_seat'
    WHERE status = 'inactive' AND inactive_reason = 'awaiting_seat'
    """

    alter table(:clients) do
      remove :stage
      remove :inactive_reason
      remove :subscription_started_on
      remove :subscription_ends_on
    end
  end
end
```

- [ ] **Step 2: Run and verify reversibility**

Run from `backend/`: `mix ecto.migrate`, then `mix ecto.rollback`, then `mix ecto.migrate` again.
Expected: all three succeed. Also run `MIX_ENV=test mix ecto.migrate`.

- [ ] **Step 3: Commit**

```bash
git add backend/priv/repo/migrations/20260709090000_streamline_client_lifecycle.exs
git commit -m "feat(clients): migration for streamlined lifecycle (stage, inactive_reason, subscription dates)"
```

---

### Task 2: Client schema — new enum values, fields, transition matrix, changeset rules

**Files:**
- Modify: `backend/lib/easy/clients/client.ex`
- Test: `backend/test/easy/clients/client_test.exs` (exists — add to it)

**Interfaces:**
- Produces: `Client` fields `stage` (`:onboarding | :coaching`, default `:onboarding`), `inactive_reason` (`:manual | :subscription_expired | :awaiting_seat`, nullable), `subscription_started_on`/`subscription_ends_on` (`:date`). `@statuses [:pending, :active, :inactive]`. `update_changeset/2` casts `:stage, :subscription_started_on, :subscription_ends_on` and: stamps `inactive_reason: :manual` on transition to inactive, clears it on transition to active, rejects reactivation while `subscription_ends_on` is past, rejects stage changes on non-active clients, rejects `ends_on < started_on`.

- [ ] **Step 1: Write failing tests**

Append to `backend/test/easy/clients/client_test.exs` (match its existing setup style; `Client.update_changeset/2` takes the struct + attrs):

```elixir
describe "streamlined lifecycle changeset rules" do
  test "archived is no longer a valid status" do
    client = %Client{status: :active}
    changeset = Client.update_changeset(client, %{"status" => "archived"})
    refute changeset.valid?
  end

  test "deactivating stamps inactive_reason manual" do
    client = %Client{status: :active}
    changeset = Client.update_changeset(client, %{"status" => "inactive"})
    assert changeset.valid?
    assert Ecto.Changeset.get_field(changeset, :inactive_reason) == :manual
  end

  test "reactivating clears inactive_reason" do
    client = %Client{status: :inactive, inactive_reason: :manual}
    changeset = Client.update_changeset(client, %{"status" => "active"})
    assert changeset.valid?
    assert Ecto.Changeset.get_field(changeset, :inactive_reason) == nil
  end

  test "reactivation is blocked while subscription_ends_on is in the past" do
    client = %Client{
      status: :inactive,
      inactive_reason: :subscription_expired,
      subscription_ends_on: Date.add(Date.utc_today(), -1)
    }

    changeset = Client.update_changeset(client, %{"status" => "active"})
    refute changeset.valid?
    assert %{status: [_]} = errors_on(changeset)
  end

  test "reactivation succeeds when the end date is extended in the same update" do
    client = %Client{
      status: :inactive,
      inactive_reason: :subscription_expired,
      subscription_ends_on: Date.add(Date.utc_today(), -1)
    }

    changeset =
      Client.update_changeset(client, %{
        "status" => "active",
        "subscription_ends_on" => Date.to_iso8601(Date.add(Date.utc_today(), 90))
      })

    assert changeset.valid?
  end

  test "subscription_ends_on must be on or after subscription_started_on" do
    client = %Client{status: :active}

    changeset =
      Client.update_changeset(client, %{
        "subscription_started_on" => "2026-08-01",
        "subscription_ends_on" => "2026-07-01"
      })

    refute changeset.valid?
    assert %{subscription_ends_on: [_]} = errors_on(changeset)
  end

  test "stage can be overridden on an active client" do
    client = %Client{status: :active, stage: :onboarding}
    changeset = Client.update_changeset(client, %{"stage" => "coaching"})
    assert changeset.valid?
  end

  test "stage cannot change on a non-active client" do
    client = %Client{status: :inactive, inactive_reason: :manual, stage: :onboarding}
    changeset = Client.update_changeset(client, %{"stage" => "coaching"})
    refute changeset.valid?
    assert %{stage: [_]} = errors_on(changeset)
  end
end
```

- [ ] **Step 2: Run tests, verify failures**

Run: `mix test test/easy/clients/client_test.exs`
Expected: new tests FAIL (unknown fields / archived still valid).

- [ ] **Step 3: Implement schema changes**

In `backend/lib/easy/clients/client.ex`:

Replace `@statuses` (line 15) and add sibling attributes:

```elixir
@statuses [:pending, :active, :inactive]
@stages [:onboarding, :coaching]
@inactive_reasons [:manual, :subscription_expired, :awaiting_seat]
```

Inside `schema "clients" do`, after the `status` field:

```elixir
field :stage, Ecto.Enum, values: @stages, default: :onboarding
field :inactive_reason, Ecto.Enum, values: @inactive_reasons
field :subscription_started_on, :date
field :subscription_ends_on, :date
```

Extend `@update_cast_fields` with `:stage, :subscription_started_on, :subscription_ends_on` (keep `:status` in the list).

Replace `@allowed_status_transitions` (and update its comment — the system-driven exceptions are now `Billing.activate_awaiting_clients` and `SubscriptionSweeper.sweep`, both `update_all`):

```elixir
@allowed_status_transitions %{
  active: [:inactive],
  inactive: [:active]
}
```

Replace `update_changeset/2`:

```elixir
@spec update_changeset(t(), map()) :: Ecto.Changeset.t()
def update_changeset(client, attrs) do
  client
  |> cast(attrs, @update_cast_fields)
  |> normalize_goal_weight(attrs)
  |> validate_goal_weight_paired()
  |> validate_number(:goal_weight_value, greater_than: 0, less_than: 1000)
  |> validate_status_transition(client.status)
  |> validate_subscription_dates()
  |> validate_stage_change()
  |> validate_reactivation_dates(client.status)
  |> put_inactive_reason()
  |> unique_constraint(:email, name: :clients_business_id_email_index)
end
```

Add the private helpers (near `validate_status_transition/2`):

```elixir
defp validate_subscription_dates(changeset) do
  started = get_field(changeset, :subscription_started_on)
  ends = get_field(changeset, :subscription_ends_on)

  if started && ends && Date.compare(ends, started) == :lt do
    add_error(changeset, :subscription_ends_on, "must be on or after the start date")
  else
    changeset
  end
end

defp validate_stage_change(changeset) do
  case get_change(changeset, :stage) do
    nil ->
      changeset

    _stage ->
      if get_field(changeset, :status) == :active do
        changeset
      else
        add_error(changeset, :stage, "can only change for active clients")
      end
  end
end

# Reactivating a client whose subscription already ended would be undone by the
# next sweep — force the coach to extend or clear the dates in the same update.
defp validate_reactivation_dates(changeset, current_status) do
  ends = get_field(changeset, :subscription_ends_on)

  reactivating? = get_change(changeset, :status) == :active and current_status == :inactive
  expired? = not is_nil(ends) and Date.compare(ends, Date.utc_today()) == :lt

  if reactivating? and expired? do
    add_error(changeset, :status, "subscription has ended; extend or clear the dates first")
  else
    changeset
  end
end

defp put_inactive_reason(changeset) do
  case get_change(changeset, :status) do
    :inactive -> put_change(changeset, :inactive_reason, :manual)
    :active -> put_change(changeset, :inactive_reason, nil)
    _ -> changeset
  end
end
```

- [ ] **Step 4: Run tests**

Run: `mix test test/easy/clients/client_test.exs`
Expected: new tests PASS. Pre-existing tests referencing `:archived`/`:awaiting_seat` in this file will fail — update them to the new model (archived assertions become inactive; transition-matrix tests use the 2-rule matrix). Do NOT fix other files yet (Tasks 3–4).

- [ ] **Step 5: Commit**

```bash
git add backend/lib/easy/clients/client.ex backend/test/easy/clients/client_test.exs
git commit -m "feat(clients): streamlined status enum, stage, inactive_reason, subscription dates"
```

---

### Task 3: Clients context — summary counts, accept-invite, reactivation gate

**Files:**
- Modify: `backend/lib/easy/clients.ex`
- Test: `backend/test/easy/clients/read_boundary_test.exs` and/or `backend/test/easy_web/controllers/coaches/client_controller_test.exs` (wherever summary/accept coverage lives — extend in place)

**Interfaces:**
- Consumes: Task 2's schema.
- Produces: `list_clients/2` summary map has exactly keys `%{active: n, pending: n, inactive: n}`. `accept_invite/3` over capacity → `status: :inactive, inactive_reason: :awaiting_seat`. `ensure_reactivation_capacity` matches `:inactive` only.

- [ ] **Step 1: Write failing tests**

Add to the file that already tests `list_clients` summary (find with `grep -rn "summary" backend/test --include="*.exs" -l`); use existing factory patterns (`insert(:client, business: business, status: :active)`, `owner_ctx(business)`):

```elixir
test "summary counts exactly three statuses" do
  business = insert(:business)
  insert(:client, business: business, status: :active)
  insert(:client, business: business, status: :pending, user: nil)
  insert(:client, business: business, status: :inactive, inactive_reason: :manual)
  ctx = owner_ctx(business)

  {:ok, %{summary: summary}} = Clients.list_clients(ctx)
  assert summary == %{active: 1, pending: 1, inactive: 1}
end

test "accepting an invite over capacity lands inactive with awaiting_seat reason" do
  business = insert(:business)
  insert(:business_billing, business: business, free_seats: 0, paid_seats: 0)
  client = insert(:client, business: business, status: :pending, user: nil)
  user = insert(:user)

  assert {:ok, updated} = Clients.accept_invite(client, user.id, user.email)
  assert updated.status == :inactive
  assert updated.inactive_reason == :awaiting_seat
end
```

(Adapt factory names to `backend/test/support/factory.ex` — `business_billing_factory` exists with `free_seats: 2, paid_seats: 0`.)

- [ ] **Step 2: Run tests, verify failures**

Run: `mix test test/easy/clients/` — new tests FAIL (summary has 5 keys; accept sets `:awaiting_seat` status which now crashes the enum load).

- [ ] **Step 3: Implement**

In `backend/lib/easy/clients.ex`:

Replace `summary/1` (lines 254-268):

```elixir
defp summary(query) do
  counts =
    from(c in query,
      select: %{
        active: count(fragment("CASE WHEN ? = 'active' THEN 1 END", c.status)),
        pending: count(fragment("CASE WHEN ? = 'pending' THEN 1 END", c.status)),
        inactive: count(fragment("CASE WHEN ? = 'inactive' THEN 1 END", c.status))
      }
    )
    |> Repo.one()

  counts || %{active: 0, pending: 0, inactive: 0}
end
```

In `do_atomic_accept/4` (lines 525-546), replace the target-status line and the `set:` list:

```elixir
{target_status, target_reason} =
  if Billing.over_capacity?(business_id),
    do: {:inactive, :awaiting_seat},
    else: {:active, nil}
```

and in `Repo.update_all` set: `status: target_status, inactive_reason: target_reason` (keep the other fields).

In `ensure_reactivation_capacity/3` (line 218-219), change the guard `when current in [:inactive, :archived]` to `when current == :inactive`.

Add the spec §7 stage filter: in `client.ex` add the standard builder

```elixir
@spec for_stage(Ecto.Queryable.t(), atom() | String.t() | nil) :: Ecto.Query.t()
def for_stage(query \\ __MODULE__, stage)
def for_stage(query, nil), do: query
def for_stage(query, ""), do: query
def for_stage(query, stage), do: from(c in query, where: c.stage == ^stage)
```

and in `list_clients/2` read `stage = Keyword.get(opts, :stage)` and pipe `|> Client.for_stage(stage)` into `base` after `for_status`. (Controller/OpenAPI param lands in Task 10.)

- [ ] **Step 4: Run tests**

Run: `mix test test/easy/clients/`
Expected: PASS. Update any other assertions in these files still expecting 5-key summaries or `:awaiting_seat` status.

- [ ] **Step 5: Commit**

```bash
git add backend/lib/easy/clients.ex backend/test/easy/clients/
git commit -m "feat(clients): 3-bucket summary, awaiting-seat accept via inactive_reason"
```

---

### Task 4: Billing — activate-awaiting predicate and seat summary

**Files:**
- Modify: `backend/lib/easy/billing.ex`
- Test: existing billing tests (`backend/test/easy/billing_test.exs` or similar — find with `ls backend/test/easy | grep billing`)

**Interfaces:**
- Consumes: `inactive_reason: :awaiting_seat` convention from Tasks 2–3.
- Produces: `activate_awaiting_clients/1` selects/updates only `status == :inactive and inactive_reason == :awaiting_seat` rows, setting `status: :active, inactive_reason: nil`. `seat_summary/1`'s `awaiting_seat_count` counts the same predicate (field name unchanged).

- [ ] **Step 1: Write failing test**

```elixir
test "activate_awaiting_clients only touches awaiting_seat-reason rows" do
  business = insert(:business)
  insert(:business_billing, business: business, free_seats: 5, paid_seats: 0)
  waiting = insert(:client, business: business, status: :inactive, inactive_reason: :awaiting_seat)
  paused = insert(:client, business: business, status: :inactive, inactive_reason: :manual)

  assert {:ok, 1} = Billing.activate_awaiting_clients(business.id)

  assert Repo.get!(Client, waiting.id).status == :active
  assert Repo.get!(Client, waiting.id).inactive_reason == nil
  assert Repo.get!(Client, paused.id).status == :inactive
end
```

- [ ] **Step 2: Run, verify failure** — `mix test <billing test file>`: FAILS (both flip, or enum crash on old query).

- [ ] **Step 3: Implement**

In `activate_awaiting_clients/1` (billing.ex:75-100): both queries change `c.status == ^:awaiting_seat` to `c.status == :inactive and c.inactive_reason == :awaiting_seat`, and the `update_all` set becomes `set: [status: :active, inactive_reason: nil, updated_at: DateTime.utc_now(:second)]`.

In `seat_summary/1` (line 43): replace `count_status(business_id, :awaiting_seat)` with a reason-based count (add a private helper next to `count_status`):

```elixir
defp count_awaiting_seat(business_id) do
  from(c in Client,
    where:
      c.business_id == ^business_id and c.status == :inactive and
        c.inactive_reason == :awaiting_seat
  )
  |> Repo.aggregate(:count)
end
```

`used_seats/1` (`[:active, :pending]`) is unchanged.

- [ ] **Step 4: Run** — billing tests PASS (update any assertions referencing the old status).

- [ ] **Step 5: Commit**

```bash
git add backend/lib/easy/billing.ex backend/test/
git commit -m "feat(billing): awaiting-seat clients live under inactive_reason"
```

---

### Task 5: Subscription expiry sweep

**Files:**
- Create: `backend/lib/easy/clients/subscription_sweeper.ex`
- Modify: `backend/lib/easy/application.ex`, `backend/config/test.exs`
- Test: Create `backend/test/easy/clients/subscription_sweeper_test.exs`

**Interfaces:**
- Produces: `Easy.Clients.SubscriptionSweeper.sweep/0` → `{count, nil}`; GenServer runs it on boot + every 24h (disabled in test via `config :easy, start_subscription_sweeper: false`).

- [ ] **Step 1: Write failing test**

```elixir
defmodule Easy.Clients.SubscriptionSweeperTest do
  use Easy.SchemaCase, async: false

  alias Easy.Clients.Client
  alias Easy.Clients.SubscriptionSweeper
  alias Easy.Repo

  test "sweep deactivates only active clients past their end date" do
    business = insert(:business)
    yesterday = Date.add(Date.utc_today(), -1)
    tomorrow = Date.add(Date.utc_today(), 1)

    expired = insert(:client, business: business, status: :active, subscription_ends_on: yesterday)
    current = insert(:client, business: business, status: :active, subscription_ends_on: tomorrow)
    dateless = insert(:client, business: business, status: :active)
    already_inactive =
      insert(:client, business: business, status: :inactive, inactive_reason: :manual, subscription_ends_on: yesterday)

    assert {1, nil} = SubscriptionSweeper.sweep()

    assert %{status: :inactive, inactive_reason: :subscription_expired} = Repo.get!(Client, expired.id)
    assert Repo.get!(Client, current.id).status == :active
    assert Repo.get!(Client, dateless.id).status == :active
    assert %{status: :inactive, inactive_reason: :manual} = Repo.get!(Client, already_inactive.id)
  end

  test "sweep is idempotent" do
    business = insert(:business)
    insert(:client, business: business, status: :active, subscription_ends_on: Date.add(Date.utc_today(), -3))

    assert {1, nil} = SubscriptionSweeper.sweep()
    assert {0, nil} = SubscriptionSweeper.sweep()
  end
end
```

- [ ] **Step 2: Run, verify failure** — `mix test test/easy/clients/subscription_sweeper_test.exs`: module undefined.

- [ ] **Step 3: Implement**

`backend/lib/easy/clients/subscription_sweeper.ex`:

```elixir
defmodule Easy.Clients.SubscriptionSweeper do
  use GenServer

  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Repo

  @day_ms 24 * 60 * 60 * 1000

  @spec start_link(keyword()) :: GenServer.on_start()
  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    send(self(), :sweep)
    {:ok, %{}}
  end

  @impl true
  def handle_info(:sweep, state) do
    sweep()
    Process.send_after(self(), :sweep, @day_ms)
    {:noreply, state}
  end

  # Cross-tenant by design: this is the one system-wide job that ends expired
  # subscriptions. ponytail: UTC date boundary + 24h tick; Oban + business
  # timezones if precision ever matters.
  @spec sweep() :: {non_neg_integer(), nil}
  def sweep do
    today = Date.utc_today()

    Repo.update_all(
      from(c in Client, where: c.status == :active and c.subscription_ends_on < ^today),
      set: [
        status: :inactive,
        inactive_reason: :subscription_expired,
        updated_at: DateTime.utc_now(:second)
      ]
    )
  end
end
```

In `backend/lib/easy/application.ex`, change the children list:

```elixir
children =
  [
    Easy.Repo,
    {Phoenix.PubSub, name: Easy.PubSub},
    {Task.Supervisor, name: Easy.TaskSupervisor}
  ] ++ sweeper_child() ++ [EasyWeb.Endpoint]
```

and add:

```elixir
defp sweeper_child do
  if Application.get_env(:easy, :start_subscription_sweeper, true),
    do: [Easy.Clients.SubscriptionSweeper],
    else: []
end
```

In `backend/config/test.exs` add: `config :easy, start_subscription_sweeper: false`

- [ ] **Step 4: Run** — sweeper tests PASS; then `mix test` to confirm the app still boots in test env.

- [ ] **Step 5: Commit**

```bash
git add backend/lib/easy/clients/subscription_sweeper.ex backend/lib/easy/application.ex backend/config/test.exs backend/test/easy/clients/subscription_sweeper_test.exs
git commit -m "feat(clients): daily subscription expiry sweep"
```

---

### Task 6: Stage auto-advance on first plan assignment

**Files:**
- Modify: `backend/lib/easy/clients.ex`, `backend/lib/easy/training_plans.ex` (`assign_plan_to_client/4`, lines ~177-196), `backend/lib/easy/nutrition_plans.ex` (`assign_plan_to_client/4`, lines ~145-153)
- Test: `backend/test/easy/training_plans_test.exs`, `backend/test/easy/nutrition_plans_test.exs` (extend existing assign tests)

**Interfaces:**
- Produces: `Easy.Clients.advance_stage_to_coaching(ctx, client_id) :: :ok` — flips `stage` from `:onboarding` to `:coaching` (no-op otherwise). Called by both plan-assignment functions after a successful clone.

- [ ] **Step 1: Write failing tests**

In each plans test file, inside the existing `assign_plan_to_client` describe block (reuse its setup — coach ctx, template plan, client):

```elixir
test "assigning a plan advances an onboarding client to coaching", %{ctx: ctx, plan: plan} do
  client = insert(:client, business_id: ctx.business_id, status: :active, stage: :onboarding, assigned_coach_id: ctx.coach_id)

  assert {:ok, _assigned} = TrainingPlans.assign_plan_to_client(ctx, client.id, plan.id, %{})
  assert Repo.get!(Client, client.id).stage == :coaching
end

test "assigning a plan leaves a coaching client's stage alone", %{ctx: ctx, plan: plan} do
  client = insert(:client, business_id: ctx.business_id, status: :active, stage: :coaching, assigned_coach_id: ctx.coach_id)

  assert {:ok, _assigned} = TrainingPlans.assign_plan_to_client(ctx, client.id, plan.id, %{})
  assert Repo.get!(Client, client.id).stage == :coaching
end
```

(Mirror in `nutrition_plans_test.exs` with `NutritionPlans`. Adapt setup names to what each file actually uses.)

- [ ] **Step 2: Run, verify failures** — stage stays `:onboarding`.

- [ ] **Step 3: Implement**

In `backend/lib/easy/clients.ex` add (public, near `update_client`):

```elixir
# System-driven half of the stage lifecycle: the first assigned plan is the
# moment coaching starts. Manual overrides go through update_client.
@spec advance_stage_to_coaching(Ctx.t(), String.t()) :: :ok
def advance_stage_to_coaching(%Ctx{} = ctx, client_id) do
  Client
  |> Client.for_business(ctx.business_id)
  |> where([c], c.id == ^client_id and c.stage == :onboarding)
  |> Repo.update_all(set: [stage: :coaching, updated_at: DateTime.utc_now(:second)])

  :ok
end
```

In `training_plans.ex` `assign_plan_to_client/4`, wrap the existing `clone_plan` result:

```elixir
with {:ok, assigned} <-
       clone_plan(plan, clone_attrs,
         creator_id: coach.id,
         client_id: client_id,
         source_template_id: plan.id
       ) do
  :ok = Clients.advance_stage_to_coaching(ctx, client_id)
  {:ok, assigned}
end
```

In `nutrition_plans.ex` `assign_plan_to_client/4`, same pattern around `assign_to_client(plan, client_id, coach.id, attrs)`.

(Stage advance runs after the clone transaction, not inside it — a crash between leaves stage at `onboarding`, which the coach can override. Not worth threading a multi-context transaction.)

- [ ] **Step 4: Run** — `mix test test/easy/training_plans_test.exs test/easy/nutrition_plans_test.exs`: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/lib/easy/clients.ex backend/lib/easy/training_plans.ex backend/lib/easy/nutrition_plans.ex backend/test/
git commit -m "feat(clients): auto-advance stage to coaching on first plan assignment"
```

---

### Task 7: Derived attention flags on list and detail

**Files:**
- Modify: `backend/lib/easy/clients/client.ex` (virtual fields), `backend/lib/easy/clients.ex` (`list_clients/2`, `get_client_with_preloads/2`)
- Test: extend the clients context/read tests

**Interfaces:**
- Produces: every `Client` returned by `list_clients/2` and `get_client_with_preloads/2` has virtual booleans `intake_incomplete`, `needs_plan`, `expiring_soon` populated. Derivations: intake = open intake FormAssignment (`:assigned`/`:in_progress`); needs_plan = no `:active`-status training AND no `:active`-status nutrition plan; expiring_soon = `status == :active` and `subscription_ends_on` in `[today, today+7]`.

- [ ] **Step 1: Write failing tests**

```elixir
describe "attention flags" do
  test "flags are derived per client" do
    business = insert(:business)
    ctx = owner_ctx(business)

    fresh = insert(:client, business: business, status: :active)
    expiring =
      insert(:client, business: business, status: :active, subscription_ends_on: Date.add(Date.utc_today(), 3))

    {:ok, %{clients: clients}} = Clients.list_clients(ctx)
    by_id = Map.new(clients, &{&1.id, &1})

    assert by_id[fresh.id].needs_plan
    refute by_id[fresh.id].intake_incomplete
    refute by_id[fresh.id].expiring_soon
    assert by_id[expiring.id].expiring_soon
  end

  test "an open intake assignment sets intake_incomplete; an active plan clears needs_plan" do
    business = insert(:business)
    ctx = owner_ctx(business)
    client = insert(:client, business: business, status: :active)

    template = insert(:form_template, business: business, purpose: :intake)
    insert(:form_assignment, business: business, client: client, form_template: template, purpose: :intake, status: :assigned)
    insert(:training_plan, business: business, client: client, status: :active)

    {:ok, %{clients: [loaded]}} = Clients.list_clients(ctx)
    assert loaded.intake_incomplete
    refute loaded.needs_plan
  end
end
```

(Check `backend/test/support/factory.ex` for `form_template_factory` / `form_assignment_factory` / `training_plan_factory` names and required fields; adapt. If a factory is missing, add a minimal one following the file's existing style.)

- [ ] **Step 2: Run, verify failure** — fields don't exist.

- [ ] **Step 3: Implement**

In `client.ex` schema, after the subscription fields:

```elixir
field :intake_incomplete, :boolean, virtual: true, default: false
field :needs_plan, :boolean, virtual: true, default: false
field :expiring_soon, :boolean, virtual: true, default: false
```

In `clients.ex`, add a private helper (bottom of file):

```elixir
@expiring_soon_days 7

defp put_attention_flags(clients, business_id) when is_list(clients) do
  ids = Enum.map(clients, & &1.id)

  intake_open =
    from(fa in Easy.ClientProfiles.FormAssignment,
      where:
        fa.business_id == ^business_id and fa.client_id in ^ids and
          fa.purpose == :intake and fa.status in [:assigned, :in_progress],
      select: fa.client_id
    )
    |> Repo.all()
    |> MapSet.new()

  with_training =
    from(tp in Easy.Training.TrainingPlan,
      where: tp.business_id == ^business_id and tp.client_id in ^ids and tp.status == :active,
      select: tp.client_id
    )
    |> Repo.all()
    |> MapSet.new()

  with_nutrition =
    from(np in Easy.Nutrition.Plan,
      where: np.business_id == ^business_id and np.client_id in ^ids and np.status == :active,
      select: np.client_id
    )
    |> Repo.all()
    |> MapSet.new()

  today = Date.utc_today()
  horizon = Date.add(today, @expiring_soon_days)

  Enum.map(clients, fn c ->
    %{
      c
      | intake_incomplete: c.id in intake_open,
        needs_plan: c.id not in with_training and c.id not in with_nutrition,
        expiring_soon:
          c.status == :active and not is_nil(c.subscription_ends_on) and
            Date.compare(c.subscription_ends_on, today) != :lt and
            Date.compare(c.subscription_ends_on, horizon) != :gt
    }
  end)
end
```

Wire it in: in `list_clients/2`, pipe the final `Repo.all()` through `|> put_attention_flags(ctx.business_id)`. In `get_client_with_preloads/2`, change the success path so the loaded client goes through `put_attention_flags([client], ctx.business_id)` and returns the single element:

```elixir
def get_client_with_preloads(%Ctx{} = ctx, client_id) do
  Client
  |> Client.for_business(ctx.business_id)
  |> Client.visible_to(ctx)
  |> Client.include_preloads(ctx.business_id)
  |> Repo.get(client_id)
  |> case do
    nil -> {:error, :not_found}
    client -> {:ok, client |> List.wrap() |> put_attention_flags(ctx.business_id) |> hd()}
  end
end
```

- [ ] **Step 4: Run** — `mix test test/easy/clients/`: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/lib/easy/clients/client.ex backend/lib/easy/clients.ex backend/test/
git commit -m "feat(clients): derived attention flags (intake, needs plan, expiring soon)"
```

---

### Task 8: Client-app lockout for non-active clients

**Files:**
- Create: `backend/lib/easy_web/plugs/ensure_active_client.ex`
- Modify: `backend/lib/easy_web/router.ex` (the pipeline used by the `/v1/client` scope)
- Test: Create `backend/test/easy_web/plugs/ensure_active_client_test.exs` (or extend an existing client-scope controller test)

**Interfaces:**
- Produces: any authenticated `/v1/client/*` request from a user whose client row in the token's business is not `:active` gets `403` with error code `"client_inactive"`. (Auth/invite routes are outside this pipeline and unaffected.)

Note: no lockout exists today — inactive clients can still use the client API. This task creates the enforcement the spec's "deactivated = locked out" promise depends on.

- [ ] **Step 1: Read the denial pattern**

Read `backend/lib/easy_web/plugs/ensure_role.ex` and copy its exact rejection response shape (status + JSON body helper) so 403s look consistent. Find the client pipeline: `grep -n "v1/client\|pipeline\|EnsureRole" backend/lib/easy_web/router.ex`.

- [ ] **Step 2: Write failing test**

Pick one cheap authenticated client endpoint (e.g. the client account profile route) from existing client controller tests and copy their auth/conn setup:

```elixir
test "an inactive client is locked out with client_inactive", %{conn: conn} do
  client = insert(:client, status: :inactive, inactive_reason: :subscription_expired)
  conn = authenticate_as_client(conn, client)   # reuse this file's existing helper

  conn = get(conn, ~p"/v1/client/account/profile")

  assert %{"error" => %{"code" => "client_inactive"}} = json_response(conn, 403)
end
```

- [ ] **Step 3: Run, verify failure** — currently 200.

- [ ] **Step 4: Implement**

```elixir
defmodule EasyWeb.Plugs.EnsureActiveClient do
  import Plug.Conn

  alias Easy.Clients.Client
  alias Easy.Repo

  def init(opts), do: opts

  def call(conn, _opts) do
    ctx = conn.assigns.ctx

    active? =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.for_user(ctx.user_id)
      |> Client.accepted()
      |> Repo.exists?()

    if active?, do: conn, else: deny(conn)
  end

  defp deny(conn) do
    # Mirror EnsureRole's denial shape exactly; only code/message differ.
    conn
    |> put_status(:forbidden)
    |> Phoenix.Controller.json(%{
      error: %{code: "client_inactive", message: "Your coaching subscription is not active."}
    })
    |> halt()
  end
end
```

(Adjust `deny/1` to match EnsureRole's actual body shape from Step 1.) Add `plug EasyWeb.Plugs.EnsureActiveClient` to the client pipeline in `router.ex`, immediately after the EnsureRole plug.

- [ ] **Step 5: Run** — new test PASSES; run the full client-scope controller tests (`mix test test/easy_web/controllers/clients/` or equivalent path) — fixtures using non-active clients may need `status: :active`.

- [ ] **Step 6: Commit**

```bash
git add backend/lib/easy_web/plugs/ensure_active_client.ex backend/lib/easy_web/router.ex backend/test/
git commit -m "feat(auth): lock non-active clients out of the client API"
```

---

### Task 9: Default intake — content module, auto-assign on invite, intake_status sync

**Files:**
- Create: `backend/lib/easy/client_profiles/default_intake.ex`
- Modify: `backend/lib/easy/client_profiles.ex`, `backend/lib/easy/clients.ex` (`invite_client/2`)
- Test: `backend/test/easy/client_profiles_test.exs` (extend)

**Interfaces:**
- Produces: `Easy.ClientProfiles.DefaultIntake.sections() :: [map()]` (string-keyed, shape `%{"title" => _, "questions" => [%{"id", "label", "type", "required", "options"?, "profile_mapping"?}]}`). `Easy.ClientProfiles.assign_default_intake_to_client(ctx, client_id) :: {:ok, FormAssignment.t()} | {:error, term()}` — get-or-creates the business's active intake `FormTemplate` (named "Intake") and assigns it. `Clients.invite_client/2` calls it after creating the invitation. `submit_client_form_assignment/3` on an intake-purpose assignment also sets the client profile's `intake_status: :completed` + `intake_completed_at`.

- [ ] **Step 1: Write failing tests**

Add to `backend/test/easy/client_profiles_test.exs` (it has `insert_client/0` and `client_ctx/1` helpers; mirror how existing submission tests build coach ctx + template + assignment):

```elixir
describe "assign_default_intake_to_client/2" do
  test "creates the template once per business and assigns it" do
    client = insert_client()
    business = Repo.get!(Easy.Orgs.Business, client.business_id)
    ctx = owner_ctx(business)

    assert {:ok, assignment} = ClientProfiles.assign_default_intake_to_client(ctx, client.id)
    assert assignment.purpose == :intake
    assert assignment.status == :assigned

    client2 = insert(:client, business: business, status: :active)
    assert {:ok, assignment2} = ClientProfiles.assign_default_intake_to_client(ctx, client2.id)
    assert assignment2.form_template_id == assignment.form_template_id

    assert Repo.aggregate(FormTemplate, :count) == 1
  end
end

describe "intake submission completes intake_status" do
  test "submitting an intake assignment marks the profile intake completed" do
    # build: coach ctx, default intake assigned, client submits answers for required questions
    client = insert_client()
    business = Repo.get!(Easy.Orgs.Business, client.business_id)
    coach_ctx = owner_ctx(business)
    {:ok, assignment} = ClientProfiles.assign_default_intake_to_client(coach_ctx, client.id)

    ctx = client_ctx(client)
    answers = %{"primary-goal" => "Lose weight", "typical-day" => "Rice and dal"}

    assert {:ok, _submission} =
             ClientProfiles.submit_client_form_assignment(ctx, assignment.id, %{"answers" => answers})

    {:ok, profile} = ClientProfiles.get_or_create_profile(coach_ctx, client.id)
    assert profile.intake_status == :completed
    assert profile.intake_completed_at
    assert profile.general["primary_goal"] == "Lose weight"
  end
end
```

(Adapt: check how existing `submit_client_form_assignment` tests shape the attrs map and client ctx.)

- [ ] **Step 2: Run, verify failures** — functions undefined.

- [ ] **Step 3: Implement `DefaultIntake`**

`backend/lib/easy/client_profiles/default_intake.ex` — content per spec §5 (4 sections, ~15 questions, every answer mapped into the matching `ClientProfile` section). Types must be from the supported set `text | number | boolean | date | select | multi_select`; answers are keyed by question `id`:

```elixir
defmodule Easy.ClientProfiles.DefaultIntake do
  @sections [
    %{
      "title" => "About you & goals",
      "questions" => [
        %{
          "id" => "primary-goal",
          "label" => "What's your primary goal?",
          "type" => "select",
          "required" => true,
          "options" => ["Lose weight", "Build muscle", "Get fitter", "Sport performance"],
          "profile_mapping" => %{"kind" => "core", "section" => "general", "field" => "primary_goal"}
        },
        %{
          "id" => "success-3-months",
          "label" => "What does success look like in 3 months?",
          "type" => "text",
          "required" => true,
          "profile_mapping" => %{"kind" => "core", "section" => "general", "field" => "goal_description"}
        },
        %{
          "id" => "target-weight",
          "label" => "Target weight (kg)",
          "type" => "number",
          "required" => false,
          "profile_mapping" => %{"kind" => "core", "section" => "general", "field" => "target_weight"}
        }
      ]
    },
    %{
      "title" => "Training",
      "questions" => [
        %{
          "id" => "experience",
          "label" => "How long have you been training?",
          "type" => "select",
          "required" => true,
          "options" => ["I'm new", "Less than a year", "1–3 years", "3+ years"],
          "profile_mapping" => %{"kind" => "core", "section" => "training", "field" => "experience_level"}
        },
        %{
          "id" => "days-per-week",
          "label" => "How many days a week can you train?",
          "type" => "select",
          "required" => true,
          "options" => ["2", "3", "4", "5", "6"],
          "profile_mapping" => %{"kind" => "core", "section" => "training", "field" => "days_per_week"}
        },
        %{
          "id" => "equipment",
          "label" => "What equipment do you have access to?",
          "type" => "select",
          "required" => true,
          "options" => ["Full gym", "Home basics (dumbbells, bands)", "Bodyweight only"],
          "profile_mapping" => %{"kind" => "core", "section" => "training", "field" => "equipment"}
        },
        %{
          "id" => "injuries",
          "label" => "Any injuries or movements to avoid?",
          "type" => "text",
          "required" => false,
          "profile_mapping" => %{"kind" => "core", "section" => "training", "field" => "injuries"}
        }
      ]
    },
    %{
      "title" => "Nutrition",
      "questions" => [
        %{
          "id" => "dietary-preference",
          "label" => "Dietary preference",
          "type" => "select",
          "required" => true,
          "options" => ["No restrictions", "Vegetarian", "Eggetarian", "Vegan", "Other"],
          "profile_mapping" => %{"kind" => "core", "section" => "nutrition", "field" => "dietary_preference"}
        },
        %{
          "id" => "allergies",
          "label" => "Any food allergies or intolerances?",
          "type" => "text",
          "required" => false,
          "profile_mapping" => %{"kind" => "core", "section" => "nutrition", "field" => "allergies"}
        },
        %{
          "id" => "meals-per-day",
          "label" => "How many meals do you eat a day?",
          "type" => "select",
          "required" => true,
          "options" => ["2", "3", "4", "5+"],
          "profile_mapping" => %{"kind" => "core", "section" => "nutrition", "field" => "meals_per_day"}
        },
        %{
          "id" => "typical-day",
          "label" => "Walk us through what you eat on a normal day",
          "type" => "text",
          "required" => true,
          "profile_mapping" => %{"kind" => "core", "section" => "nutrition", "field" => "typical_day"}
        }
      ]
    },
    %{
      "title" => "Lifestyle",
      "questions" => [
        %{
          "id" => "daily-activity",
          "label" => "How active is your day-to-day?",
          "type" => "select",
          "required" => true,
          "options" => ["Desk job", "On my feet part of the day", "Physically demanding"],
          "profile_mapping" => %{"kind" => "core", "section" => "lifestyle", "field" => "daily_activity"}
        },
        %{
          "id" => "sleep",
          "label" => "How much do you sleep on average?",
          "type" => "select",
          "required" => true,
          "options" => ["Under 6 hours", "6–7 hours", "7–8 hours", "8+ hours"],
          "profile_mapping" => %{"kind" => "core", "section" => "lifestyle", "field" => "sleep"}
        },
        %{
          "id" => "stress",
          "label" => "Stress levels lately?",
          "type" => "select",
          "required" => true,
          "options" => ["Low", "Moderate", "High"],
          "profile_mapping" => %{"kind" => "core", "section" => "lifestyle", "field" => "stress"}
        },
        %{
          "id" => "anything-else",
          "label" => "Anything else your coach should know?",
          "type" => "text",
          "required" => false,
          "profile_mapping" => %{"kind" => "core", "section" => "lifestyle", "field" => "notes"}
        }
      ]
    }
  ]

  @spec sections() :: [map()]
  def sections, do: @sections
end
```

- [ ] **Step 4: Implement assign + get-or-create in `client_profiles.ex`**

```elixir
@spec assign_default_intake_to_client(Ctx.t(), String.t()) ::
        {:ok, FormAssignment.t()} | {:error, term()}
def assign_default_intake_to_client(%Ctx{} = ctx, client_id) do
  with {:ok, template} <- get_or_create_default_intake_template(ctx) do
    assign_form_template_to_client(ctx, client_id, template.id, %{})
  end
end

defp get_or_create_default_intake_template(%Ctx{} = ctx) do
  FormTemplate
  |> FormTemplate.for_business(ctx.business_id)
  |> where([t], t.purpose == :intake and t.status == :active)
  |> order_by([t], asc: t.inserted_at)
  |> limit(1)
  |> Repo.one()
  |> case do
    nil ->
      create_form_template(ctx, %{
        "name" => "Intake",
        "purpose" => "intake",
        "status" => "active",
        "sections" => Easy.ClientProfiles.DefaultIntake.sections()
      })

    template ->
      {:ok, template}
  end
end
```

(If `FormTemplate.for_business/2` doesn't exist, add the standard builder to `form_template.ex`.)

- [ ] **Step 5: Hook into `invite_client/2`** (`backend/lib/easy/clients.ex:101-111`) — add one with-clause after `create_invitation`:

```elixir
{:ok, client} <- create_invitation(coach, invite_attrs),
{:ok, _assignment} <- Easy.ClientProfiles.assign_default_intake_to_client(ctx, client.id),
:ok <- maybe_send_invitation_email(client, coach) do
```

- [ ] **Step 6: Sync intake_status in `submit_client_form_assignment/3`** (`client_profiles.ex:318-357`) — inside the transaction, after the `FormAssignment.complete_changeset` update succeeds, replace `{:ok, _assignment} -> submission` with:

```elixir
{:ok, _assignment} ->
  if assignment.purpose == :intake do
    sync_intake_completed!(ctx, client.id, submitted_at)
  end

  submission
```

and add:

```elixir
defp sync_intake_completed!(ctx, client_id, submitted_at) do
  case get_or_create_profile_for_client(ctx, client_id) do
    {:ok, profile} ->
      profile
      |> Ecto.Changeset.change(intake_status: :completed, intake_completed_at: submitted_at)
      |> Repo.update()
      |> case do
        {:ok, _} -> :ok
        {:error, reason} -> Repo.rollback(reason)
      end

    {:error, reason} ->
      Repo.rollback(reason)
  end
end
```

- [ ] **Step 7: Run** — `mix test test/easy/client_profiles_test.exs test/easy/clients/`: PASS. Existing `invite_client` tests may now also create templates/assignments — update any count assertions.

- [ ] **Step 8: Commit**

```bash
git add backend/lib/easy/client_profiles/ backend/lib/easy/client_profiles.ex backend/lib/easy/clients.ex backend/test/
git commit -m "feat(intake): curated default intake, auto-assigned on invite, completes profile intake_status"
```

---

### Task 10: OpenAPI schemas, JSON view, controller params, regen

**Files:**
- Modify: `backend/lib/easy_web/open_api/schemas/client.ex`, `backend/lib/easy_web/controllers/coaches/client_json.ex`, `backend/lib/easy_web/controllers/coaches/client_controller.ex` (index `status` param enum, lines ~123-129)
- Generated: `frontend/openapi/*`, both apps' `src/api/generated.ts` (via `just gen-api`)

**Interfaces:**
- Produces: API `Client` object gains `stage`, `inactive_reason` (nullable), `subscription_started_on`/`subscription_ends_on` (nullable date strings), `intake_incomplete`/`needs_plan`/`expiring_soon` (booleans); `status` enum is `["active", "pending", "inactive"]` everywhere; `ClientUpdateRequest` accepts `status ∈ ["active","inactive"]`, `stage`, and both dates; `ClientSummary` has exactly `active/pending/inactive`.

- [ ] **Step 1: Update `schemas/client.ex`**

- `Client` response: `status` enum → `["active", "pending", "inactive"]`; add properties:

```elixir
stage: %Schema{type: :string, enum: ["onboarding", "coaching"]},
inactive_reason: %Schema{
  type: :string,
  enum: ["manual", "subscription_expired", "awaiting_seat"],
  nullable: true
},
subscription_started_on: %Schema{type: :string, format: :date, nullable: true},
subscription_ends_on: %Schema{type: :string, format: :date, nullable: true},
intake_incomplete: %Schema{type: :boolean},
needs_plan: %Schema{type: :boolean},
expiring_soon: %Schema{type: :boolean},
```

Add `:stage, :inactive_reason, :subscription_started_on, :subscription_ends_on, :intake_incomplete, :needs_plan, :expiring_soon` to the `required` list (nullable + required = always present, may be null — matches the file's existing style).
- `ClientUpdateRequest`: `status` enum → `["active", "inactive"]`; add `stage` (same enum) and both date properties (nullable).
- `ClientSummary`: properties and `required` → exactly `active, pending, inactive`.

- [ ] **Step 2: Update `client_json.ex`** — add to the `data/1` map:

```elixir
stage: client.stage,
inactive_reason: client.inactive_reason,
subscription_started_on: client.subscription_started_on,
subscription_ends_on: client.subscription_ends_on,
intake_incomplete: client.intake_incomplete,
needs_plan: client.needs_plan,
expiring_soon: client.expiring_soon,
```

- [ ] **Step 3: Update `client_controller.ex`** — the `:index` operation's `status` query param enum becomes `["active", "pending", "inactive"]`; add an optional `stage` query param (`%Schema{type: :string, enum: ["onboarding", "coaching"]}`, following the `status` param's style) and pass it through in `index/2`: `stage: Map.get(params, "stage")` in the opts list.

- [ ] **Step 4: Verify + regenerate**

Run from `backend/`: `mix precommit` (fix any controller tests asserting old response shapes).
Run from repo root: `just gen-api`.
Expected: spec dump + both `generated.ts` files regenerate cleanly. If a dev phx.server is running, restart it.

- [ ] **Step 5: Commit**

```bash
git add backend/lib/easy_web/ frontend/openapi frontend/apps/coachapp-v2/src/api/generated.ts frontend/apps/clientapp-v2/src/api/generated.ts backend/test/
git commit -m "feat(api): lifecycle fields on client contract, 3-status enums"
```

---

### Task 11: Coachapp — status/stage display and roster

**Files:**
- Modify: `frontend/apps/coachapp-v2/src/clients/lib/client.ts`, `frontend/apps/coachapp-v2/src/clients/list-clients.tsx` (FILTER_OPTIONS, lines ~24-30), `frontend/apps/coachapp-v2/src/clients/clients-list/client-list-item.tsx`, `frontend/apps/coachapp-v2/src/api/clients.ts` (`ClientStatus`, `allowedStatusesFor`, `ClientSummary`)

**Interfaces:**
- Consumes: generated `Client` type now has `stage`, `inactive_reason`, flags (Task 10).
- Produces: `STATUS_DISPLAY` (3 entries, `pending` labeled "Invited"), `stageChip(client)` and `INACTIVE_REASON_LABEL` exported from `clients/lib/client.ts` (also used by Task 12's detail page).

- [ ] **Step 1: Update `api/clients.ts`**

`ClientStatus` / `AllowedUpdateStatus` narrow to the new enums (derive from generated types where possible). Replace `allowedStatusesFor`:

```ts
export function allowedStatusesFor(status: ClientStatus): AllowedUpdateStatus[] {
  if (status === 'pending') return [];
  return ['active', 'inactive'];
}
```

`ClientSummary` type → `{active: number; pending: number; inactive: number}`.

- [ ] **Step 2: Update `clients/lib/client.ts`**

```ts
export const STATUS_DISPLAY: Record<ClientStatus, {color: 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  pending: {color: 'default', label: 'Invited'},
  inactive: {color: 'default', label: 'Inactive'},
};

export const INACTIVE_REASON_LABEL: Record<string, string> = {
  manual: 'Paused by you',
  subscription_expired: 'Subscription ended',
  awaiting_seat: 'Needs a seat',
};

// Stage chip per spec §3: during onboarding, show the highest-priority missing
// item instead of flag badges; during coaching the flags render as badges.
export function stageChip(client: Client): {color: 'default' | 'success' | 'warning'; label: string} {
  if (client.stage !== 'onboarding') return {color: 'success', label: 'Coaching'};
  if (client.intake_incomplete) return {color: 'warning', label: 'Onboarding · Intake incomplete'};
  if (client.needs_plan) return {color: 'warning', label: 'Onboarding · Needs plan'};
  return {color: 'default', label: 'Onboarding'};
}
```

(Import the `Client` type from `@/api/clients` as the file already does for `ClientStatus`.)

- [ ] **Step 3: Update `list-clients.tsx` FILTER_OPTIONS**

```ts
const FILTER_OPTIONS: FilterOption[] = [
  {id: 'all', label: 'All', filter: {}},
  {id: 'active', label: 'Active', filter: {status: 'active'}, summaryKey: 'active'},
  {id: 'invited', label: 'Invited', filter: {status: 'pending'}, summaryKey: 'pending'},
  {id: 'inactive', label: 'Inactive', filter: {status: 'inactive'}, summaryKey: 'inactive'},
];
```

- [ ] **Step 4: Rewrite the chip block in `client-list-item.tsx`**

Replace the single status `Chip` (current lines 50-56) and the `status` lookup with:

```tsx
import {INACTIVE_REASON_LABEL, STATUS_DISPLAY, stageChip} from '@/clients/lib/client';
import {formatIsoDateShort} from '@easy/utils';
```

```tsx
function RowChips({client}: {client: Client}) {
  if (client.status === 'active') {
    const stage = stageChip(client);
    return (
      <>
        {client.stage === 'coaching' && client.intake_incomplete ? (
          <Chip color="warning" size="sm" variant="soft">Intake incomplete</Chip>
        ) : null}
        {client.stage === 'coaching' && client.needs_plan ? (
          <Chip color="warning" size="sm" variant="soft">Needs plan</Chip>
        ) : null}
        {client.expiring_soon ? (
          <Chip color="warning" size="sm" variant="soft">Expiring soon</Chip>
        ) : null}
        <Chip color={stage.color} size="sm" variant="soft">{stage.label}</Chip>
      </>
    );
  }

  if (client.status === 'inactive') {
    const label =
      client.inactive_reason === 'subscription_expired' && client.subscription_ends_on
        ? `Subscription ended ${formatIsoDateShort(client.subscription_ends_on)}`
        : (INACTIVE_REASON_LABEL[client.inactive_reason ?? 'manual'] ?? 'Inactive');
    return <Chip color="default" size="sm" variant="soft">{label}</Chip>;
  }

  const status = STATUS_DISPLAY[client.status];
  return <Chip color={status.color} size="sm" variant="soft">{status.label}</Chip>;
}
```

and render `<RowChips client={client} />` where the old chip was. Keep the subtitle logic as-is.

- [ ] **Step 5: Build**

Run from `frontend/`: `pnpm -C apps/coachapp-v2 build`
Expected: compiles. Fix any remaining references to `archived`/`awaiting_seat` the compiler surfaces (e.g. `clients-list/types.ts` summary keys) — EXCEPT `edit-client-form.tsx`/`client-detail.tsx`, which Task 12 rewrites (if they block the build, do the minimal enum fix here and finish properly in Task 12).

- [ ] **Step 6: Commit**

```bash
git add frontend/apps/coachapp-v2/src
git commit -m "feat(coachapp): 3-status roster with stage chips and attention badges"
```

---

### Task 12: Coachapp — client detail, edit form, reactivation CTAs

**Files:**
- Modify: `frontend/apps/coachapp-v2/src/clients/client-detail.tsx`, `frontend/apps/coachapp-v2/src/clients/client-form/edit-client-form.tsx`

**Interfaces:**
- Consumes: `stageChip`, `INACTIVE_REASON_LABEL`, `allowedStatusesFor` from Task 11.

- [ ] **Step 1: Update `edit-client-form.tsx`**

- zod schema: `status: z.enum(['active', 'inactive']).optional()`; add `stage: z.enum(['onboarding', 'coaching']).optional()`, `subscription_started_on: z.string().optional()`, `subscription_ends_on: z.string().optional()`.
- `clientToEditFormValues`: status `undefined` only for `pending`; map `stage` and both dates (empty string when null).
- Render, following the form's existing `FormSelectField`/`FieldRow` patterns:
  - Status select (existing, options now from the new `allowedStatusesFor`), hidden for `pending` as today.
  - Stage select (options Onboarding/Coaching) rendered only when `client.status === 'active'`.
  - A "Subscription" `Fieldset` with two native date fields (`FormTextField` with `type="date"` — or the app's existing DateField wrapper if `src/@components/form-fields/` has one; check first): "Subscription start", "Subscription end".
- Request mapping: send `stage` and dates in the update body; convert `''` → `null`.
- Server 422 on the reactivation guard surfaces via the existing `applyFormErrors` wiring on the `status` field — verify `status` is in the known-fields list if the helper takes one.

- [ ] **Step 2: Update `client-detail.tsx`**

- Replace the status chip area (lines ~312-367): for active clients render `stageChip(client)` chip + the same badge set as the roster (reuse `RowChips` by exporting it from `client-list-item.tsx` or inline the equivalent); for inactive show the `INACTIVE_REASON_LABEL` chip.
- `isAwaitingSeat` becomes `client.status === 'inactive' && client.inactive_reason === 'awaiting_seat'` — the existing `AddSeatsDialog`/"Ask the owner" block stays, gated by that.
- Add a "Subscription" card in the detail grid (match sibling cards' markup): shows `Started <date>` / `Ends <date>` (or "No subscription dates"), an "Expiring soon" warning chip when flagged, and for `inactive_reason === 'subscription_expired'` a primary Button **"Extend subscription"** navigating to the existing edit route (`/clients/${client.id}/edit`) — the edit form is where dates + status are set together; no new dialog.

- [ ] **Step 3: Build + verify**

`pnpm -C apps/coachapp-v2 build` → clean. Then run the dev stack (`just dev`) and click through: roster tabs, an active onboarding client, edit form date fields, deactivate → Inactive tab chip. Verify at 375px and desktop widths.

- [ ] **Step 4: Commit**

```bash
git add frontend/apps/coachapp-v2/src
git commit -m "feat(coachapp): client detail subscription card, stage override, reactivation CTAs"
```

---

### Task 13: Coachapp — hide the profile-fields builder

**Files:**
- Modify: `frontend/apps/coachapp-v2/src/settings/settings.tsx`

- [ ] **Step 1:** Remove the `<ClientProfileSection />` mount from the `Settings` component (line ~313) and the now-unused `ClientProfileSection` component + its imports in the same file. Route + screen files stay (deliberate — spec §5 hides, doesn't delete). The Library check-ins template builder is NOT touched: it serves the live weekly check-ins feature; the spec's "hide the builder" applies to the intake/profile-fields surface only.

- [ ] **Step 2:** `pnpm -C apps/coachapp-v2 build` → clean (Biome will flag unused imports; remove them).

- [ ] **Step 3: Commit**

```bash
git add frontend/apps/coachapp-v2/src/settings/settings.tsx
git commit -m "feat(coachapp): hide profile-fields builder from settings"
```

---

### Task 14: Clientapp — intake card on home

**Files:**
- Modify: `frontend/apps/clientapp-v2/src/training/training-home.tsx`
- Create: `frontend/apps/clientapp-v2/src/checkins/intake-card.tsx`

**Interfaces:**
- Consumes: existing `useListClientFormAssignmentsQuery` from `@/api/checkins`, `ROUTES.CHECKIN_FILL` (`/check-ins/:id`), existing fill screen (`fill-checkin.tsx`) — the intake renders and submits through it unchanged.

- [ ] **Step 1: Create `intake-card.tsx`** (match clientapp's existing card components — check how `training-home.tsx` builds its hero/cards and reuse those primitives):

```tsx
import {Button, Card} from '@heroui/react';
import {ClipboardCheck} from 'lucide-react';
import {useNavigate} from 'react-router';

import {useListClientFormAssignmentsQuery} from '@/api/checkins';
import {ROUTES} from '@/@config/routes';

export default function IntakeCard() {
  const navigate = useNavigate();
  const {data} = useListClientFormAssignmentsQuery();

  const intake = data?.data?.find(
    (a) => a.purpose === 'intake' && (a.status === 'assigned' || a.status === 'in_progress'),
  );

  if (!intake) return null;

  return (
    <Card className="mb-4">
      <Card.Header className="flex items-center gap-2">
        <ClipboardCheck size={18} />
        <span className="font-medium">Tell your coach about yourself</span>
      </Card.Header>
      <Card.Body className="text-muted text-sm">
        Your coach needs your intake answers to build your first plan.
      </Card.Body>
      <Card.Footer>
        <Button
          className="min-h-11 w-full"
          onPress={() => navigate(ROUTES.CHECKIN_FILL.replace(':id', intake.id))}
        >
          Fill intake form
        </Button>
      </Card.Footer>
    </Card>
  );
}
```

(Adapt Card/Button composition to whatever HeroUI patterns clientapp actually uses — mirror an existing card in `training-home.tsx`.)

- [ ] **Step 2:** Render `<IntakeCard />` at the top of `TrainingHome`'s `PageLayout` body.

- [ ] **Step 3:** `pnpm -C apps/clientapp-v2 build` → clean. Manual check: a freshly-invited client sees the card; after submitting, it disappears (cache tag `FormAssignment` already invalidates via `@/api/checkins`).

- [ ] **Step 4: Commit**

```bash
git add frontend/apps/clientapp-v2/src
git commit -m "feat(clientapp): intake card on home until intake is submitted"
```

---

### Task 15: Full verification sweep

- [ ] **Step 1:** Backend: `cd backend && mix precommit` → zero failures/warnings.
- [ ] **Step 2:** Frontend: `cd frontend && pnpm build` (all apps) and `just lint` from repo root → clean; review any Biome writes.
- [ ] **Step 3:** End-to-end walkthrough on the dev stack (`just dev`), following the spec's walkthrough: invite → accept → intake card → submit → profile filled + `Onboarding · Needs plan` → assign plan → `Coaching` → set `subscription_ends_on` to yesterday via the edit form is blocked (guard) — instead set it to today, run `Easy.Clients.SubscriptionSweeper.sweep()` in `iex` after changing the date in the DB to yesterday, confirm the client lands in Inactive with "Subscription ended", client app gets 403, then "Extend subscription" → new dates + active again.
- [ ] **Step 4:** Skim `docs/agents/recurring-mistakes.md` for backend + coachapp entries; fix anything violated.
- [ ] **Step 5:** Note for follow-ups file (do not build): clientapp shows raw API errors when locked out (403 `client_inactive`) — a friendly "subscription ended" screen is deferred.
- [ ] **Step 6: Commit** any fixes; the branch is ready for review/merge.
