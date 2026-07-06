# Business Billing & Seat Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Business-level CoachEasy subscriptions via Razorpay — 2 free client seats per business, paid subscription quantity buys extra seats, seat enforcement on invite/reactivate/accept-invite, owner-only checkout/cancel, webhook-driven billing state.

**Architecture:** New `Easy.Billing` context (local `business_billing` row is the enforcement authority; Razorpay is the payment authority), a small `Easy.Razorpay` Req boundary, one public webhook endpoint, three coach billing endpoints, a new `awaiting_seat` client status. Coachapp gets a Settings→Billing page + blocked-invite flow + status chips; clientapp gets a blocked welcome gate.

**Tech Stack:** Elixir/Phoenix/Ecto, Req (+ Req.Test for stubs), OpenApiSpex, React/TS, RTK Query (generated client via `just gen-api`), HeroUI v3, Razorpay Checkout (subscriptions).

**Spec:** `docs/superpowers/specs/2026-06-20-business-billing-seats-design.md`

## Deviations from the spec (verified against the codebase)

1. **Error shape.** Spec says `{:conflict, :seat_limit_reached, seat_summary}`. Backend convention (`backend/AGENTS.md` Return Values) requires bare atoms. We return `{:error, :seat_limit_reached}`; the FallbackController clause renders 409 **with the seat summary in the body** (it has `conn.assigns.ctx`). Same product behavior.
2. **Ownership.** There is no role on membership and no `ctx.role`. Owner = `businesses.owner_id == ctx.user_id`. The frontend learns ownership via `is_owner` on the billing summary (no `me` query carries it today).
3. **`accept-invite` capacity rule.** A `pending` client already counts as used, so converting pending→active never *increases* usage. "No capacity during accept" only happens when usage exceeds the limit (seats were reduced). Rule: accept → `active` when `used_seats <= seat_limit`, else `awaiting_seat`.

## Global Constraints

- Copy, verbatim wherever a seat count is shown: **"Used seats: active clients + pending invites"**.
- Client-app blocked copy, verbatim: **"Your coach needs to activate your seat before you can continue."**
- Coach-app status copy, verbatim: **"Joined, waiting for a seat."**
- Used seats = clients with status in (`active`, `pending`). `awaiting_seat`, `inactive`, `archived` do NOT count.
- Error reasons are bare atoms (never tagged tuples): `:seat_limit_reached`, `:not_owner`, `:razorpay_error`, `:no_subscription`, `:invalid_webhook_signature`, `:duplicate_webhook`.
- Public context functions are Ctx-first (`%Easy.Ctx{}` first arg) — RM-010.
- `lib/easy/billing/` may hold ONLY Ecto schemas (enforced by test); the Razorpay boundary goes top-level at `lib/easy/razorpay.ex`.
- Every JSON view change updates its OpenApiSpex schema in the same edit + `assert_schema` test — RM-002. Nested request objects: `struct?: false` — RM-007. Controllers read `conn.body_params` — RM-008. Enum examples must be valid members — RM-006.
- Ordering queries carry an `:id` tie-break — RM-001.
- Backend finish line: `mix precommit` (run from `backend/`). Frontend finish line: biome + tsc + build — RM-105. Restart `phx.server` after OpenApiSpex edits — RM-004.
- Frontend: routes via `ROUTES` constants (RM-102), every new screen wired to an entry point in the same change (RM-103), mutations invalidate every visible consumer (RM-118), UI changes verified live at mobile + desktop widths (RM-119).
- Non-goals (do NOT build): invoices, payment ledger, per-client payments, auto-inactivation on seat drop, DB seat constraint, plan creation from the app, coupons/trials/taxes/proration, billing dashboard.

---

### Task 1: Migration, billing schemas, `awaiting_seat` status

**Files:**
- Create: `backend/priv/repo/migrations/20260706000100_create_billing.exs`
- Create: `backend/lib/easy/billing/business_billing.ex`
- Create: `backend/lib/easy/billing/event.ex`
- Create: `backend/lib/easy/billing/webhook_receipt.ex`
- Modify: `backend/lib/easy/clients/client.ex` (statuses ~line 15, transitions ~lines 57-61)
- Modify: `backend/lib/easy/clients.ex` (summary counts query ~lines 203-216)
- Modify: `backend/lib/easy_web/open_api/schemas/client.ex` (status enum ~line 82; leave `ClientUpdateRequest` at `["active","inactive","archived"]`)
- Test: `backend/test/easy/billing/schemas_test.exs`

**Interfaces:**
- Produces: `Easy.Billing.BusinessBilling` (fields `business_id, free_seats (default 2), paid_seats (default 0), status (Ecto.Enum: :free :active :past_due :cancel_at_period_end :cancelled, default :free), razorpay_subscription_id, razorpay_plan_id, current_period_end`), `Easy.Billing.Event` (`business_id, kind (Ecto.Enum: :seats_added :seats_removed :payment_succeeded :payment_failed :cancellation_scheduled :subscription_cancelled), seat_delta, amount_paid, currency, occurred_at, metadata`), `Easy.Billing.WebhookReceipt` (`razorpay_event_id (unique), event_type, processed_at`). Client status enum now includes `:awaiting_seat`.

- [ ] **Step 1: Write the failing test**

`backend/test/easy/billing/schemas_test.exs`:

```elixir
defmodule Easy.Billing.SchemasTest do
  use Easy.DataCase, async: true

  alias Easy.Billing.{BusinessBilling, Event, WebhookReceipt}
  alias Easy.Repo

  import Easy.Factory

  test "business_billing defaults to 2 free seats, 0 paid, status free" do
    business = insert(:business)

    billing = Repo.insert!(%BusinessBilling{business_id: business.id})

    assert billing.free_seats == 2
    assert billing.paid_seats == 0
    assert billing.status == :free
  end

  test "one billing row per business" do
    business = insert(:business)
    Repo.insert!(%BusinessBilling{business_id: business.id})

    assert_raise Ecto.ConstraintError, fn ->
      Repo.insert!(%BusinessBilling{business_id: business.id})
    end
  end

  test "duplicate webhook receipt is rejected by unique index" do
    Repo.insert!(%WebhookReceipt{razorpay_event_id: "evt_1", event_type: "subscription.charged"})

    assert_raise Ecto.ConstraintError, fn ->
      Repo.insert!(%WebhookReceipt{razorpay_event_id: "evt_1", event_type: "subscription.charged"})
    end
  end

  test "billing event stores kind and seat delta" do
    business = insert(:business)

    event =
      Repo.insert!(%Event{
        business_id: business.id,
        kind: :seats_added,
        seat_delta: 3,
        occurred_at: DateTime.utc_now(:second)
      })

    assert event.kind == :seats_added
  end

  test "client status enum includes awaiting_seat" do
    assert :awaiting_seat in Ecto.Enum.values(Easy.Clients.Client, :status)
  end

  test "awaiting_seat client may be archived but not manually activated" do
    client = insert(:client, status: :awaiting_seat)

    assert Easy.Clients.Client.update_changeset(client, %{status: :archived}).valid?
    refute Easy.Clients.Client.update_changeset(client, %{status: :active}).valid?
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `backend/`): `mix test test/easy/billing/schemas_test.exs`
Expected: FAIL — modules `Easy.Billing.*` don't exist.

- [ ] **Step 3: Write migration and schemas**

`backend/priv/repo/migrations/20260706000100_create_billing.exs` (mirror the id/timestamp style of the existing `20260703000000_create_identity_and_tenancy.exs` — binary ids, `:utc_datetime`):

```elixir
defmodule Easy.Repo.Migrations.CreateBilling do
  use Ecto.Migration

  def change do
    create table(:business_billing, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all), null: false
      add :free_seats, :integer, null: false, default: 2
      add :paid_seats, :integer, null: false, default: 0
      add :status, :string, null: false, default: "free"
      add :razorpay_subscription_id, :string
      add :razorpay_plan_id, :string
      add :current_period_end, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create unique_index(:business_billing, [:business_id])
    create index(:business_billing, [:razorpay_subscription_id])

    create table(:billing_events, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all), null: false
      add :kind, :string, null: false
      add :seat_delta, :integer
      add :amount_paid, :integer
      add :currency, :string
      add :occurred_at, :utc_datetime, null: false
      add :metadata, :map

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:billing_events, [:business_id, :occurred_at])

    create table(:billing_webhook_receipts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :razorpay_event_id, :string, null: false
      add :event_type, :string, null: false
      add :processed_at, :utc_datetime

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create unique_index(:billing_webhook_receipts, [:razorpay_event_id])
  end
end
```

`backend/lib/easy/billing/business_billing.ex` (copy the `@primary_key`/`@foreign_key_type` header style from `lib/easy/clients/client.ex`):

```elixir
defmodule Easy.Billing.BusinessBilling do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses [:free, :active, :past_due, :cancel_at_period_end, :cancelled]

  schema "business_billing" do
    field :free_seats, :integer, default: 2
    field :paid_seats, :integer, default: 0
    field :status, Ecto.Enum, values: @statuses, default: :free
    field :razorpay_subscription_id, :string
    field :razorpay_plan_id, :string
    field :current_period_end, :utc_datetime

    belongs_to :business, Easy.Orgs.Business

    timestamps(type: :utc_datetime)
  end

  def statuses, do: @statuses

  def changeset(billing, attrs) do
    billing
    |> cast(attrs, [:free_seats, :paid_seats, :status, :razorpay_subscription_id, :razorpay_plan_id, :current_period_end])
    |> validate_number(:free_seats, greater_than_or_equal_to: 0)
    |> validate_number(:paid_seats, greater_than_or_equal_to: 0)
  end
end
```

`backend/lib/easy/billing/event.ex`:

```elixir
defmodule Easy.Billing.Event do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @kinds [:seats_added, :seats_removed, :payment_succeeded, :payment_failed, :cancellation_scheduled, :subscription_cancelled]

  schema "billing_events" do
    field :kind, Ecto.Enum, values: @kinds
    field :seat_delta, :integer
    field :amount_paid, :integer
    field :currency, :string
    field :occurred_at, :utc_datetime
    field :metadata, :map

    belongs_to :business, Easy.Orgs.Business

    timestamps(type: :utc_datetime, updated_at: false)
  end

  def kinds, do: @kinds
end
```

`backend/lib/easy/billing/webhook_receipt.ex`:

```elixir
defmodule Easy.Billing.WebhookReceipt do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "billing_webhook_receipts" do
    field :razorpay_event_id, :string
    field :event_type, :string
    field :processed_at, :utc_datetime

    timestamps(type: :utc_datetime, updated_at: false)
  end
end
```

Client status changes in `backend/lib/easy/clients/client.ex`:

```elixir
# line ~15
@statuses [:active, :pending, :inactive, :archived, :awaiting_seat]

# @allowed_status_transitions (~lines 57-61): add the awaiting_seat entry.
# Coaches may archive a waiting client; ONLY the system activates one
# (via Billing.activate_awaiting_clients update_all, which bypasses this changeset).
@allowed_status_transitions %{
  # ...existing entries unchanged...
  awaiting_seat: [:archived]
}
```

In `backend/lib/easy/clients.ex` summary counts (~lines 203-216): add `awaiting_seat` to the counted statuses map (same pattern as the existing four).

In `backend/lib/easy_web/open_api/schemas/client.ex`: add `"awaiting_seat"` to the client **response** status enum (~line 82) and to its example only if the example is a status value (RM-006). Do NOT add it to `ClientUpdateRequest` (~line 48) — clients can't be manually set to `awaiting_seat`.

Also grep for any other hardcoded status enum lists (clientapp `/v1/client/me` profile schema): `grep -rn "pending" backend/lib/easy_web/open_api/schemas/ | grep -i status` — add `awaiting_seat` to every client-status enum you find.

- [ ] **Step 4: Migrate and run tests**

Run: `mix ecto.migrate && mix test test/easy/billing/schemas_test.exs test/easy/clients`
Expected: PASS (existing client tests must stay green).

- [ ] **Step 5: Commit**

```bash
git add backend/priv/repo/migrations backend/lib/easy/billing backend/lib/easy/clients backend/lib/easy_web/open_api/schemas/client.ex backend/test/easy/billing
git commit -m "feat(billing): billing tables, schemas, awaiting_seat client status"
```

---

### Task 2: Billing context core — seat math and the gate

**Files:**
- Create: `backend/lib/easy/billing.ex`
- Modify: `backend/test/support/factory.ex` (add `business_billing_factory`)
- Modify: `backend/config/runtime.exs` (seat price + razorpay env config, see code below — added here because `seat_summary` reads the price)
- Modify: `backend/config/test.exs`
- Test: `backend/test/easy/billing/billing_test.exs`

**Interfaces:**
- Consumes: Task 1 schemas.
- Produces (all Ctx-first, RM-010):
  - `Easy.Billing.billing_for(business_id) :: %BusinessBilling{}` (get-or-create; internal but used by webhook path which has no Ctx)
  - `Easy.Billing.seat_summary(%Ctx{}) :: map` with keys `status, free_seats, paid_seats, seat_limit, used_seats, available_seats, awaiting_seat_count, monthly_seat_price_inr, current_period_end, is_owner`
  - `Easy.Billing.ensure_seat_available(%Ctx{}) :: :ok | {:error, :seat_limit_reached}`
  - `Easy.Billing.ensure_owner(%Ctx{}) :: :ok | {:error, :not_owner}`
  - `Easy.Billing.record_event(business_id, kind, attrs \\ %{}) :: %Event{}`
  - `Easy.Billing.recent_events(%Ctx{}) :: [%Event{}]` (last 10, newest first)

- [ ] **Step 1: Write the failing test**

`backend/test/easy/billing/billing_test.exs`:

```elixir
defmodule Easy.BillingTest do
  use Easy.DataCase, async: true

  alias Easy.{Billing, Ctx}

  import Easy.Factory

  defp ctx_for(business), do: Ctx.new(business.id, business.owner_id)

  describe "seat_summary/1" do
    test "a new business has two free seats and no billing row yet" do
      business = insert(:business)

      summary = Billing.seat_summary(ctx_for(business))

      assert summary.free_seats == 2
      assert summary.paid_seats == 0
      assert summary.seat_limit == 2
      assert summary.used_seats == 0
      assert summary.available_seats == 2
      assert summary.status == :free
      assert summary.is_owner == true
    end

    test "active and pending clients count as used seats" do
      business = insert(:business)
      insert(:client, business: business, status: :active)
      insert(:client, business: business, status: :pending)

      assert Billing.seat_summary(ctx_for(business)).used_seats == 2
    end

    test "awaiting_seat, inactive, and archived clients do not count" do
      business = insert(:business)
      insert(:client, business: business, status: :awaiting_seat)
      insert(:client, business: business, status: :inactive)
      insert(:client, business: business, status: :archived)

      summary = Billing.seat_summary(ctx_for(business))

      assert summary.used_seats == 0
      assert summary.awaiting_seat_count == 1
    end

    test "is_owner is false for a non-owner coach" do
      business = insert(:business)
      other_user = insert(:user)

      refute Billing.seat_summary(Ctx.new(business.id, other_user.id)).is_owner
    end
  end

  describe "ensure_seat_available/1" do
    test "ok below the limit, seat_limit_reached at the limit" do
      business = insert(:business)
      insert(:client, business: business, status: :active)

      assert :ok = Billing.ensure_seat_available(ctx_for(business))

      insert(:client, business: business, status: :pending)

      assert {:error, :seat_limit_reached} = Billing.ensure_seat_available(ctx_for(business))
    end

    test "paid seats raise the limit" do
      business = insert(:business)
      insert(:business_billing, business: business, paid_seats: 1, status: :active)
      insert(:client, business: business, status: :active)
      insert(:client, business: business, status: :active)

      assert :ok = Billing.ensure_seat_available(ctx_for(business))
    end
  end

  describe "ensure_owner/1" do
    test "owner passes, non-owner gets :not_owner" do
      business = insert(:business)
      other_user = insert(:user)

      assert :ok = Billing.ensure_owner(ctx_for(business))
      assert {:error, :not_owner} = Billing.ensure_owner(Ctx.new(business.id, other_user.id))
    end
  end

  describe "recent_events/1" do
    test "returns newest 10" do
      business = insert(:business)

      for i <- 1..12 do
        Billing.record_event(business.id, :seats_added, %{
          seat_delta: i,
          occurred_at: DateTime.add(DateTime.utc_now(:second), i, :minute)
        })
      end

      events = Billing.recent_events(ctx_for(business))

      assert length(events) == 10
      assert hd(events).seat_delta == 12
    end
  end
end
```

Add to `backend/test/support/factory.ex` (mirror existing factory style; note `client_factory` builds its own business — pass `business:` explicitly in these tests, and check the existing factory associates business correctly when given):

```elixir
def business_billing_factory do
  %Easy.Billing.BusinessBilling{
    business: build(:business),
    free_seats: 2,
    paid_seats: 0,
    status: :free
  }
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mix test test/easy/billing/billing_test.exs`
Expected: FAIL — `Easy.Billing` not defined.

- [ ] **Step 3: Implement the context**

`backend/lib/easy/billing.ex`:

```elixir
defmodule Easy.Billing do
  @moduledoc """
  Business billing and client-seat enforcement.

  The local `business_billing` row is the enforcement authority; Razorpay is
  the payment authority (synced via webhooks). Seat math:

      seat_limit = free_seats + paid_seats
      used_seats = clients with status in (:active, :pending)
  """

  import Ecto.Query

  alias Easy.Billing.{BusinessBilling, Event}
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs.Business
  alias Easy.Repo

  @used_statuses [:active, :pending]

  def billing_for(business_id) do
    Repo.get_by(BusinessBilling, business_id: business_id) ||
      Repo.insert!(%BusinessBilling{business_id: business_id},
        on_conflict: :nothing,
        conflict_target: [:business_id]
      ) |> then(fn _ -> Repo.get_by!(BusinessBilling, business_id: business_id) end)
  end

  def seat_summary(%Ctx{business_id: business_id} = ctx) do
    billing = billing_for(business_id)
    used = used_seats(business_id)
    limit = billing.free_seats + billing.paid_seats

    %{
      status: billing.status,
      free_seats: billing.free_seats,
      paid_seats: billing.paid_seats,
      seat_limit: limit,
      used_seats: used,
      available_seats: limit - used,
      awaiting_seat_count: count_status(business_id, :awaiting_seat),
      monthly_seat_price_inr: seat_price_inr(),
      current_period_end: billing.current_period_end,
      is_owner: owner?(ctx)
    }
  end

  def ensure_seat_available(%Ctx{business_id: business_id}) do
    billing = billing_for(business_id)

    if used_seats(business_id) < billing.free_seats + billing.paid_seats do
      :ok
    else
      {:error, :seat_limit_reached}
    end
  end

  def ensure_owner(%Ctx{business_id: business_id, user_id: user_id} = ctx) do
    if owner?(ctx), do: :ok, else: {:error, :not_owner}
  end

  def record_event(business_id, kind, attrs \\ %{}) do
    Repo.insert!(%Event{
      business_id: business_id,
      kind: kind,
      seat_delta: attrs[:seat_delta],
      amount_paid: attrs[:amount_paid],
      currency: attrs[:currency],
      occurred_at: attrs[:occurred_at] || DateTime.utc_now(:second),
      metadata: attrs[:metadata]
    })
  end

  def recent_events(%Ctx{business_id: business_id}) do
    Repo.all(
      from e in Event,
        where: e.business_id == ^business_id,
        order_by: [desc: e.occurred_at, desc: e.id],
        limit: 10
    )
  end

  def used_seats(business_id) do
    Repo.one(
      from c in Client,
        where: c.business_id == ^business_id and c.status in ^@used_statuses,
        select: count(c.id)
    )
  end

  defp count_status(business_id, status) do
    Repo.one(
      from c in Client,
        where: c.business_id == ^business_id and c.status == ^status,
        select: count(c.id)
    )
  end

  defp owner?(%Ctx{business_id: business_id, user_id: user_id}) do
    Repo.exists?(from b in Business, where: b.id == ^business_id and b.owner_id == ^user_id)
  end

  def seat_price_inr do
    Application.get_env(:easy, Easy.Razorpay)[:seat_price_inr]
  end
end
```

Note: if `Ctx.new/2` doesn't exist with that arity/name, check `lib/easy/ctx.ex` and use its actual constructor. If credo flags the `billing_for` pipe, extract a private `create_default_billing/1`.

Config — append to `backend/config/runtime.exs` (dev fallbacks, mirror the existing `System.get_env` style; add the prod `raise` guards inside the existing `if config_env() == :prod` block):

```elixir
config :easy, Easy.Razorpay,
  key_id: System.get_env("RAZORPAY_KEY_ID", "rzp_test_dev"),
  key_secret: System.get_env("RAZORPAY_KEY_SECRET", "dev_secret"),
  webhook_secret: System.get_env("RAZORPAY_WEBHOOK_SECRET", "dev_webhook_secret"),
  plan_id: System.get_env("RAZORPAY_PLAN_ID", "plan_dev"),
  seat_price_inr: String.to_integer(System.get_env("BILLING_SEAT_PRICE_INR", "499"))
```

Append to `backend/config/test.exs`:

```elixir
config :easy, Easy.Razorpay,
  key_id: "rzp_test_key",
  key_secret: "test_secret",
  webhook_secret: "test_webhook_secret",
  plan_id: "plan_test",
  seat_price_inr: 499,
  req_options: [plug: {Req.Test, Easy.Razorpay}]
```

- [ ] **Step 4: Run tests**

Run: `mix test test/easy/billing/billing_test.exs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/lib/easy/billing.ex backend/test backend/config
git commit -m "feat(billing): billing context — seat math, gate, events, config"
```

---

### Task 3: Seat enforcement in the client lifecycle

**Files:**
- Modify: `backend/lib/easy/clients.ex` (`invite_client/2` ~line 72, `update_client/3` ~line 83, `do_atomic_accept/3` ~line 438)
- Modify: `backend/lib/easy/billing.ex` (add `activate_awaiting_clients/1`)
- Test: `backend/test/easy/billing/seat_enforcement_test.exs`

**Interfaces:**
- Consumes: `Billing.ensure_seat_available/1`, `Billing.billing_for/1`, `Billing.used_seats/1`.
- Produces:
  - `Easy.Clients.invite_client/2` now also returns `{:error, :seat_limit_reached}`
  - `Easy.Clients.update_client/3` returns `{:error, :seat_limit_reached}` when reactivating (`inactive`/`archived` → `active`) at the limit
  - accept-invite produces an `:awaiting_seat` client when over capacity
  - `Easy.Billing.activate_awaiting_clients(business_id) :: {:ok, activated_count}`

- [ ] **Step 1: Write the failing test**

`backend/test/easy/billing/seat_enforcement_test.exs`:

```elixir
defmodule Easy.Billing.SeatEnforcementTest do
  use Easy.DataCase, async: true

  alias Easy.{Billing, Clients, Ctx}
  alias Easy.Clients.Client
  alias Easy.Repo

  import Easy.Factory

  defp ctx_for(business), do: Ctx.new(business.id, business.owner_id)

  defp fill_free_seats(business) do
    insert(:client, business: business, status: :active)
    insert(:client, business: business, status: :active)
  end

  # NOTE: build invite attrs the same way test/easy_web/controllers/coaches/
  # client_controller_test.exs does (client_attrs_factory) so required fields match.

  test "invite is blocked at the seat limit" do
    business = insert(:business)
    fill_free_seats(business)

    assert {:error, :seat_limit_reached} =
             Clients.invite_client(ctx_for(business), params_for(:client_attrs))
  end

  test "invite succeeds below the limit and a pending invite reserves a seat" do
    business = insert(:business)
    insert(:client, business: business, status: :active)

    assert {:ok, _client} = Clients.invite_client(ctx_for(business), params_for(:client_attrs))
    assert Billing.seat_summary(ctx_for(business)).used_seats == 2
    assert {:error, :seat_limit_reached} =
             Clients.invite_client(ctx_for(business), params_for(:client_attrs))
  end

  test "reactivation is blocked at the seat limit" do
    business = insert(:business)
    fill_free_seats(business)
    inactive = insert(:client, business: business, status: :inactive)

    assert {:error, :seat_limit_reached} =
             Clients.update_client(ctx_for(business), inactive.id, %{status: :active})
  end

  test "reactivation succeeds when a seat is free" do
    business = insert(:business)
    insert(:client, business: business, status: :active)
    inactive = insert(:client, business: business, status: :inactive)

    assert {:ok, %{status: :active}} =
             Clients.update_client(ctx_for(business), inactive.id, %{status: :active})
  end

  test "non-status updates are not seat-gated at the limit" do
    business = insert(:business)
    fill_free_seats(business)
    [client | _] = Repo.all(Client)

    assert {:ok, _} = Clients.update_client(ctx_for(business), client.id, %{first_name: "New"})
  end

  test "accept-invite becomes active when capacity exists" do
    business = insert(:business)
    {:ok, invited} = Clients.invite_client(ctx_for(business), params_for(:client_attrs))
    user = insert(:user)

    # Call the same context fn the accept flow uses (Clients.accept_invite/3 —
    # match its real signature from lib/easy/clients.ex:177).
    assert {:ok, %{status: :active}} = Clients.accept_invite(invited, user, invited.email)
  end

  test "accept-invite becomes awaiting_seat when capacity does not exist" do
    business = insert(:business)
    {:ok, invited} = Clients.invite_client(ctx_for(business), params_for(:client_attrs))
    # Capacity disappears after the invite: fill both free seats over the pending one.
    fill_free_seats(business)
    user = insert(:user)

    assert {:ok, %{status: :awaiting_seat}} = Clients.accept_invite(invited, user, invited.email)
  end

  test "activate_awaiting_clients activates the oldest awaiting_seat clients up to capacity" do
    business = insert(:business)
    oldest = insert(:client, business: business, status: :awaiting_seat,
      inserted_at: ~U[2026-01-01 00:00:00Z])
    newer = insert(:client, business: business, status: :awaiting_seat,
      inserted_at: ~U[2026-02-01 00:00:00Z])
    insert(:client, business: business, status: :active)
    # limit 2, used 1 -> capacity for exactly one

    assert {:ok, 1} = Billing.activate_awaiting_clients(business.id)
    assert Repo.get!(Client, oldest.id).status == :active
    assert Repo.get!(Client, newer.id).status == :awaiting_seat
  end

  test "existing active clients stay active after payment failure or cancellation" do
    business = insert(:business)
    insert(:business_billing, business: business, paid_seats: 0, status: :cancelled)
    fill_free_seats(business)
    extra = insert(:client, business: business, status: :active)

    assert Repo.get!(Client, extra.id).status == :active
    # ...but additions stay blocked:
    assert {:error, :seat_limit_reached} =
             Clients.invite_client(ctx_for(business), params_for(:client_attrs))
  end
end
```

Adjust `Clients.accept_invite/3` call sites in the test to the REAL signature at `lib/easy/clients.ex:177-185` — read it first; the two accept tests must go through the same function the OTP verify flow calls.

- [ ] **Step 2: Run test to verify it fails**

Run: `mix test test/easy/billing/seat_enforcement_test.exs`
Expected: FAIL — invite is not gated, `activate_awaiting_clients` undefined.

- [ ] **Step 3: Implement the gates**

In `backend/lib/easy/clients.ex`:

1. `invite_client/2` (~line 72): add `:ok <- Easy.Billing.ensure_seat_available(ctx)` as the first step of its `with` chain (before coach lookup).
2. `update_client/3` (~line 83): gate only reactivation —

```elixir
def update_client(%Ctx{} = ctx, client_id, attrs) do
  with {:ok, client} <- get_client(ctx, client_id),
       :ok <- ensure_reactivation_capacity(ctx, client, attrs) do
    # ...existing update path unchanged...
  end
end

defp ensure_reactivation_capacity(ctx, %{status: current}, attrs)
     when current in [:inactive, :archived] do
  if to_string(attrs[:status] || attrs["status"]) == "active" do
    Easy.Billing.ensure_seat_available(ctx)
  else
    :ok
  end
end

defp ensure_reactivation_capacity(_ctx, _client, _attrs), do: :ok
```

(Match the real shape of `update_client` — the point is: seat-check ONLY when an `inactive`/`archived` client is being set to `active`.)

3. `do_atomic_accept/3` (~lines 438-458): compute the target status before the `update_all` —

```elixir
target_status =
  if over_capacity?(client.business_id), do: :awaiting_seat, else: :active
```

and use `status: ^target_status` in the `update_all` set (keep the `status == :pending` guard and race handling exactly as-is). Add to `Easy.Billing`:

```elixir
# pending -> active does not change used_seats (pending already counts),
# so "no capacity at accept" means usage already exceeds the limit
# (seats were reduced since the invite).
def over_capacity?(business_id) do
  billing = billing_for(business_id)
  used_seats(business_id) > billing.free_seats + billing.paid_seats
end
```

4. Add to `backend/lib/easy/billing.ex`:

```elixir
def activate_awaiting_clients(business_id) do
  billing = billing_for(business_id)
  available = billing.free_seats + billing.paid_seats - used_seats(business_id)

  if available > 0 do
    ids =
      Repo.all(
        from c in Client,
          where: c.business_id == ^business_id and c.status == :awaiting_seat,
          order_by: [asc: c.inserted_at, asc: c.id],
          limit: ^available,
          select: c.id
      )

    {count, _} =
      Repo.update_all(
        from(c in Client, where: c.id in ^ids and c.status == :awaiting_seat),
        set: [status: :active, updated_at: DateTime.utc_now(:second)]
      )

    {:ok, count}
  else
    {:ok, 0}
  end
end
```

- [ ] **Step 4: Run tests**

Run: `mix test test/easy/billing/seat_enforcement_test.exs test/easy/clients test/easy_web/controllers/auth`
Expected: PASS (accept-invite and client controller suites stay green).

- [ ] **Step 5: Commit**

```bash
git add backend/lib/easy backend/test
git commit -m "feat(billing): seat gates on invite, reactivation, accept-invite; awaiting activation"
```

---

### Task 4: Razorpay boundary

**Files:**
- Create: `backend/lib/easy/razorpay.ex`
- Test: `backend/test/easy/razorpay_test.exs`

**Interfaces:**
- Consumes: `config :easy, Easy.Razorpay` (Task 2).
- Produces:
  - `Easy.Razorpay.create_subscription(quantity) :: {:ok, map} | {:error, :razorpay_error}`
  - `Easy.Razorpay.update_subscription_quantity(sub_id, quantity) :: {:ok, map} | {:error, :razorpay_error}`
  - `Easy.Razorpay.cancel_subscription_at_period_end(sub_id) :: {:ok, map} | {:error, :razorpay_error}`
  - `Easy.Razorpay.valid_webhook_signature?(raw_body, signature) :: boolean`
  - `Easy.Razorpay.key_id() :: String.t()`

- [ ] **Step 1: Write the failing test**

`backend/test/easy/razorpay_test.exs`:

```elixir
defmodule Easy.RazorpayTest do
  use ExUnit.Case, async: true

  alias Easy.Razorpay

  test "create_subscription posts plan and quantity, returns body on 2xx" do
    Req.Test.stub(Easy.Razorpay, fn conn ->
      assert conn.method == "POST"
      assert conn.request_path == "/v1/subscriptions"
      Req.Test.json(conn, %{"id" => "sub_123", "plan_id" => "plan_test", "quantity" => 3})
    end)

    assert {:ok, %{"id" => "sub_123"}} = Razorpay.create_subscription(3)
  end

  test "non-2xx normalizes to :razorpay_error" do
    Req.Test.stub(Easy.Razorpay, fn conn ->
      conn |> Plug.Conn.put_status(400) |> Req.Test.json(%{"error" => %{"description" => "bad"}})
    end)

    assert {:error, :razorpay_error} = Razorpay.create_subscription(1)
  end

  test "transport error normalizes to :razorpay_error" do
    Req.Test.stub(Easy.Razorpay, fn conn -> Req.Test.transport_error(conn, :econnrefused) end)

    assert {:error, :razorpay_error} = Razorpay.create_subscription(1)
  end

  test "update and cancel hit the right paths" do
    Req.Test.stub(Easy.Razorpay, fn conn ->
      case {conn.method, conn.request_path} do
        {"PATCH", "/v1/subscriptions/sub_1"} -> Req.Test.json(conn, %{"id" => "sub_1", "quantity" => 5})
        {"POST", "/v1/subscriptions/sub_1/cancel"} -> Req.Test.json(conn, %{"id" => "sub_1", "status" => "cancelled"})
      end
    end)

    assert {:ok, %{"quantity" => 5}} = Razorpay.update_subscription_quantity("sub_1", 5)
    assert {:ok, _} = Razorpay.cancel_subscription_at_period_end("sub_1")
  end

  test "webhook signature verification" do
    body = ~s({"event":"subscription.charged"})
    good = :crypto.mac(:hmac, :sha256, "test_webhook_secret", body) |> Base.encode16(case: :lower)

    assert Razorpay.valid_webhook_signature?(body, good)
    refute Razorpay.valid_webhook_signature?(body, "deadbeef")
    refute Razorpay.valid_webhook_signature?(body, nil)
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mix test test/easy/razorpay_test.exs`
Expected: FAIL — module undefined.

- [ ] **Step 3: Implement the boundary**

`backend/lib/easy/razorpay.ex`:

```elixir
defmodule Easy.Razorpay do
  @moduledoc """
  Thin Req boundary for the Razorpay subscriptions API.
  Normalizes all failures to {:error, :razorpay_error} (details are logged).
  Docs: https://razorpay.com/docs/api/payments/subscriptions/
  """

  require Logger

  # total_count is mandatory for Razorpay subscriptions; 120 monthly cycles = 10y.
  @total_count 120

  def create_subscription(quantity) do
    request(:post, "/subscriptions",
      json: %{plan_id: config(:plan_id), quantity: quantity, total_count: @total_count, customer_notify: 1}
    )
  end

  def update_subscription_quantity(subscription_id, quantity) do
    request(:patch, "/subscriptions/#{subscription_id}",
      json: %{quantity: quantity, schedule_change_at: "now"}
    )
  end

  def cancel_subscription_at_period_end(subscription_id) do
    request(:post, "/subscriptions/#{subscription_id}/cancel", json: %{cancel_at_cycle_end: 1})
  end

  def valid_webhook_signature?(_raw_body, nil), do: false

  def valid_webhook_signature?(raw_body, signature) do
    expected =
      :crypto.mac(:hmac, :sha256, config(:webhook_secret), raw_body)
      |> Base.encode16(case: :lower)

    Plug.Crypto.secure_compare(expected, signature)
  end

  def key_id, do: config(:key_id)

  defp request(method, path, opts) do
    [
      method: method,
      base_url: "https://api.razorpay.com/v1",
      url: path,
      auth: {:basic, "#{config(:key_id)}:#{config(:key_secret)}"}
    ]
    |> Keyword.merge(opts)
    |> Keyword.merge(config(:req_options) || [])
    |> Req.request()
    |> handle_response()
  end

  defp handle_response({:ok, %Req.Response{status: status, body: body}}) when status in 200..299 do
    {:ok, body}
  end

  defp handle_response({:ok, %Req.Response{status: status, body: body}}) do
    Logger.error("razorpay error status=#{status} body=#{inspect(body)}")
    {:error, :razorpay_error}
  end

  defp handle_response({:error, exception}) do
    Logger.error("razorpay transport error: #{inspect(exception)}")
    {:error, :razorpay_error}
  end

  defp config(key), do: Application.get_env(:easy, __MODULE__)[key]
end
```

- [ ] **Step 4: Run tests**

Run: `mix test test/easy/razorpay_test.exs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/lib/easy/razorpay.ex backend/test/easy/razorpay_test.exs
git commit -m "feat(billing): Razorpay Req boundary"
```

---

### Task 5: Checkout and cancellation

**Files:**
- Modify: `backend/lib/easy/billing.ex`
- Test: `backend/test/easy/billing/checkout_test.exs`

**Interfaces:**
- Consumes: `Easy.Razorpay` (Task 4), `ensure_owner/1`, `record_event/3`, `activate_awaiting_clients/1`.
- Produces:
  - `Easy.Billing.checkout(%Ctx{}, seats_to_add) ::`
    `{:ok, %{action: :checkout, checkout: %{key_id, subscription_id}, billing: summary}}` (no subscription yet)
    `| {:ok, %{action: :updated, billing: summary}}` (existing subscription)
    `| {:error, :not_owner} | {:error, :razorpay_error}`
  - `Easy.Billing.cancel(%Ctx{}) :: {:ok, summary} | {:error, :not_owner} | {:error, :no_subscription} | {:error, :razorpay_error}`

- [ ] **Step 1: Write the failing test**

`backend/test/easy/billing/checkout_test.exs`:

```elixir
defmodule Easy.Billing.CheckoutTest do
  use Easy.DataCase, async: true

  alias Easy.{Billing, Ctx}

  import Easy.Factory

  defp ctx_for(business), do: Ctx.new(business.id, business.owner_id)

  defp stub_razorpay do
    Req.Test.stub(Easy.Razorpay, fn conn ->
      case {conn.method, conn.request_path} do
        {"POST", "/v1/subscriptions"} ->
          Req.Test.json(conn, %{"id" => "sub_new", "plan_id" => "plan_test", "quantity" => 3, "status" => "created"})

        {"PATCH", "/v1/subscriptions/sub_existing"} ->
          Req.Test.json(conn, %{"id" => "sub_existing", "quantity" => 4, "status" => "active"})

        {"POST", "/v1/subscriptions/sub_existing/cancel"} ->
          Req.Test.json(conn, %{"id" => "sub_existing", "status" => "cancelled"})
      end
    end)
  end

  test "checkout is owner-only" do
    business = insert(:business)
    other = insert(:user)

    assert {:error, :not_owner} = Billing.checkout(Ctx.new(business.id, other.id), 1)
    assert {:error, :not_owner} = Billing.cancel(Ctx.new(business.id, other.id))
  end

  test "first checkout creates a subscription and returns a checkout payload" do
    stub_razorpay()
    business = insert(:business)

    assert {:ok, %{action: :checkout, checkout: checkout, billing: billing}} =
             Billing.checkout(ctx_for(business), 3)

    assert checkout.subscription_id == "sub_new"
    assert checkout.key_id == "rzp_test_key"
    # paid_seats NOT bumped yet — webhook confirms payment
    assert billing.paid_seats == 0
    assert Billing.billing_for(business.id).razorpay_subscription_id == "sub_new"
  end

  test "checkout with an existing active subscription updates quantity immediately" do
    stub_razorpay()
    business = insert(:business)
    insert(:business_billing, business: business, paid_seats: 3, status: :active,
      razorpay_subscription_id: "sub_existing")

    assert {:ok, %{action: :updated, billing: billing}} = Billing.checkout(ctx_for(business), 1)
    assert billing.paid_seats == 4
    assert [%{kind: :seats_added, seat_delta: 1} | _] = Billing.recent_events(ctx_for(business))
  end

  test "buying seats activates the oldest awaiting_seat clients" do
    stub_razorpay()
    business = insert(:business)
    insert(:business_billing, business: business, paid_seats: 3, status: :active,
      razorpay_subscription_id: "sub_existing")
    insert(:client, business: business, status: :active)
    insert(:client, business: business, status: :active)
    insert(:client, business: business, status: :active)
    insert(:client, business: business, status: :active)
    insert(:client, business: business, status: :active)
    waiting = insert(:client, business: business, status: :awaiting_seat)

    {:ok, _} = Billing.checkout(ctx_for(business), 1)

    assert Repo.get!(Easy.Clients.Client, waiting.id).status == :active
  end

  test "cancel schedules cancellation at period end and keeps paid seats" do
    stub_razorpay()
    business = insert(:business)
    insert(:business_billing, business: business, paid_seats: 3, status: :active,
      razorpay_subscription_id: "sub_existing")

    assert {:ok, billing} = Billing.cancel(ctx_for(business))
    assert billing.status == :cancel_at_period_end
    assert billing.paid_seats == 3
    assert [%{kind: :cancellation_scheduled} | _] = Billing.recent_events(ctx_for(business))
  end

  test "cancel without a subscription is :no_subscription" do
    business = insert(:business)

    assert {:error, :no_subscription} = Billing.cancel(ctx_for(business))
  end

  test "razorpay failure surfaces as :razorpay_error and changes nothing" do
    Req.Test.stub(Easy.Razorpay, fn conn -> Req.Test.transport_error(conn, :econnrefused) end)
    business = insert(:business)

    assert {:error, :razorpay_error} = Billing.checkout(ctx_for(business), 1)
    assert Billing.billing_for(business.id).razorpay_subscription_id == nil
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mix test test/easy/billing/checkout_test.exs`
Expected: FAIL — `checkout/2`, `cancel/1` undefined.

- [ ] **Step 3: Implement**

Add to `backend/lib/easy/billing.ex`:

```elixir
alias Easy.Razorpay

def checkout(%Ctx{business_id: business_id} = ctx, seats_to_add)
    when is_integer(seats_to_add) and seats_to_add > 0 do
  with :ok <- ensure_owner(ctx) do
    billing = billing_for(business_id)
    target_quantity = billing.paid_seats + seats_to_add

    case billing.razorpay_subscription_id do
      nil -> create_checkout(ctx, billing, target_quantity)
      subscription_id -> update_quantity(ctx, billing, subscription_id, target_quantity, seats_to_add)
    end
  end
end

defp create_checkout(ctx, billing, target_quantity) do
  with {:ok, subscription} <- Razorpay.create_subscription(target_quantity) do
    billing
    |> BusinessBilling.changeset(%{
      razorpay_subscription_id: subscription["id"],
      razorpay_plan_id: subscription["plan_id"]
    })
    |> Repo.update!()

    # paid_seats stays 0 until the webhook confirms payment
    {:ok,
     %{
       action: :checkout,
       checkout: %{key_id: Razorpay.key_id(), subscription_id: subscription["id"]},
       billing: seat_summary(ctx)
     }}
  end
end

defp update_quantity(ctx, billing, subscription_id, target_quantity, seats_to_add) do
  with {:ok, _} <- Razorpay.update_subscription_quantity(subscription_id, target_quantity) do
    billing
    |> BusinessBilling.changeset(%{paid_seats: target_quantity})
    |> Repo.update!()

    record_event(billing.business_id, :seats_added, %{seat_delta: seats_to_add})
    activate_awaiting_clients(billing.business_id)

    {:ok, %{action: :updated, billing: seat_summary(ctx)}}
  end
end

def cancel(%Ctx{business_id: business_id} = ctx) do
  with :ok <- ensure_owner(ctx),
       %BusinessBilling{razorpay_subscription_id: subscription_id} = billing
       when not is_nil(subscription_id) <- billing_for(business_id),
       {:ok, _} <- Razorpay.cancel_subscription_at_period_end(subscription_id) do
    billing
    |> BusinessBilling.changeset(%{status: :cancel_at_period_end})
    |> Repo.update!()

    record_event(business_id, :cancellation_scheduled)
    {:ok, seat_summary(ctx)}
  else
    %BusinessBilling{razorpay_subscription_id: nil} -> {:error, :no_subscription}
    error -> error
  end
end
```

(If credo complains about the `with`-guard pattern in `cancel/1`, split into an explicit `case` on `billing.razorpay_subscription_id`.)

- [ ] **Step 4: Run tests**

Run: `mix test test/easy/billing`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/lib/easy/billing.ex backend/test/easy/billing
git commit -m "feat(billing): owner-only checkout and period-end cancellation"
```

---

### Task 6: Razorpay webhook

**Files:**
- Create: `backend/lib/easy_web/plugs/cache_raw_body.ex`
- Create: `backend/lib/easy_web/controllers/webhook_controller.ex`
- Modify: `backend/lib/easy_web/endpoint.ex` (Plug.Parsers `body_reader`)
- Modify: `backend/lib/easy_web/router.ex` (public webhook scope)
- Modify: `backend/lib/easy/billing.ex` (`handle_razorpay_webhook/3` + event application)
- Test: `backend/test/easy_web/controllers/webhook_controller_test.exs`

**Interfaces:**
- Consumes: `Razorpay.valid_webhook_signature?/2`, `billing_for/1`, `record_event/3`, `activate_awaiting_clients/1`, `WebhookReceipt`.
- Produces: `POST /v1/webhooks/razorpay`; `Easy.Billing.handle_razorpay_webhook(raw_body, signature, event_id) :: :ok | {:error, :invalid_webhook_signature} | {:error, :duplicate_webhook}`.

- [ ] **Step 1: Write the failing test**

`backend/test/easy_web/controllers/webhook_controller_test.exs`:

```elixir
defmodule EasyWeb.WebhookControllerTest do
  use Easy.ConnCase, async: true

  alias Easy.Billing
  alias Easy.Clients.Client
  alias Easy.Repo

  import Easy.Factory

  @secret "test_webhook_secret"

  defp sign(body), do: :crypto.mac(:hmac, :sha256, @secret, body) |> Base.encode16(case: :lower)

  defp post_webhook(conn, payload, opts \\ []) do
    body = Jason.encode!(payload)

    conn
    |> put_req_header("content-type", "application/json")
    |> put_req_header("x-razorpay-signature", Keyword.get(opts, :signature, sign(body)))
    |> put_req_header("x-razorpay-event-id", Keyword.get(opts, :event_id, "evt_#{System.unique_integer([:positive])}"))
    |> post("/v1/webhooks/razorpay", body)
  end

  defp charged_payload(sub_id, quantity, amount_paise) do
    %{
      "event" => "subscription.charged",
      "payload" => %{
        "subscription" => %{"entity" => %{"id" => sub_id, "quantity" => quantity, "current_end" => 1_790_000_000}},
        "payment" => %{"entity" => %{"amount" => amount_paise, "currency" => "INR"}}
      }
    }
  end

  setup do
    business = insert(:business)
    billing = insert(:business_billing, business: business, razorpay_subscription_id: "sub_wh", status: :free)
    %{business: business, billing: billing}
  end

  test "webhook signature is required", %{conn: conn} do
    conn = post_webhook(conn, charged_payload("sub_wh", 3, 149_700), signature: "bad")

    assert conn.status == 401
  end

  test "successful payment updates paid seats and writes billing events", %{conn: conn, business: business} do
    conn = post_webhook(conn, charged_payload("sub_wh", 3, 149_700))

    assert conn.status == 200
    billing = Billing.billing_for(business.id)
    assert billing.paid_seats == 3
    assert billing.status == :active
    assert billing.current_period_end

    kinds = business.id |> events_for() |> Enum.map(& &1.kind)
    assert :payment_succeeded in kinds
    assert :seats_added in kinds
  end

  test "duplicate webhook is ignored", %{conn: conn, business: business} do
    payload = charged_payload("sub_wh", 3, 149_700)
    post_webhook(conn, payload, event_id: "evt_dup")
    conn2 = post_webhook(build_conn(), payload, event_id: "evt_dup")

    # acked 200, but applied once
    assert conn2.status == 200
    assert business.id |> events_for() |> Enum.count(&(&1.kind == :payment_succeeded)) == 1
  end

  test "payment success activates awaiting_seat clients", %{conn: conn, business: business} do
    insert(:client, business: business, status: :active)
    insert(:client, business: business, status: :active)
    waiting = insert(:client, business: business, status: :awaiting_seat)

    post_webhook(conn, charged_payload("sub_wh", 2, 99_800))

    assert Repo.get!(Client, waiting.id).status == :active
  end

  test "payment failure sets past_due", %{conn: conn, business: business} do
    post_webhook(conn, charged_payload("sub_wh", 3, 149_700))

    conn2 =
      post_webhook(build_conn(), %{
        "event" => "subscription.pending",
        "payload" => %{"subscription" => %{"entity" => %{"id" => "sub_wh"}}}
      })

    assert conn2.status == 200
    billing = Billing.billing_for(business.id)
    assert billing.status == :past_due
    assert business.id |> events_for() |> Enum.any?(&(&1.kind == :payment_failed))
  end

  test "cancellation clears paid seats but existing clients keep access", %{conn: conn, business: business} do
    active = insert(:client, business: business, status: :active)
    post_webhook(conn, charged_payload("sub_wh", 3, 149_700))

    conn2 =
      post_webhook(build_conn(), %{
        "event" => "subscription.cancelled",
        "payload" => %{"subscription" => %{"entity" => %{"id" => "sub_wh"}}}
      })

    assert conn2.status == 200
    billing = Billing.billing_for(business.id)
    assert billing.status == :cancelled
    assert billing.paid_seats == 0
    assert Repo.get!(Client, active.id).status == :active
  end

  test "events for an unknown subscription are acked and ignored", %{conn: conn} do
    conn = post_webhook(conn, charged_payload("sub_unknown", 3, 100))

    assert conn.status == 200
  end

  defp events_for(business_id) do
    Repo.all(Ecto.Query.from(e in Easy.Billing.Event, where: e.business_id == ^business_id))
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mix test test/easy_web/controllers/webhook_controller_test.exs`
Expected: FAIL — route doesn't exist (404).

- [ ] **Step 3: Implement**

`backend/lib/easy_web/plugs/cache_raw_body.ex` — cache the raw body ONLY for the webhook path (signature verification needs the exact bytes):

```elixir
defmodule EasyWeb.Plugs.CacheRawBody do
  @moduledoc "Body reader for Plug.Parsers that keeps the raw body for webhook signature checks."

  def read_body(%Plug.Conn{request_path: "/v1/webhooks/" <> _} = conn, opts) do
    with {:ok, body, conn} <- Plug.Conn.read_body(conn, opts) do
      {:ok, body, Plug.Conn.assign(conn, :raw_body, body)}
    end
  end

  def read_body(conn, opts), do: Plug.Conn.read_body(conn, opts)
end
```

In `backend/lib/easy_web/endpoint.ex`, add to the existing `plug Plug.Parsers` options:

```elixir
body_reader: {EasyWeb.Plugs.CacheRawBody, :read_body, []},
```

`backend/lib/easy_web/controllers/webhook_controller.ex`:

```elixir
defmodule EasyWeb.WebhookController do
  use EasyWeb, :controller

  def razorpay(conn, _params) do
    signature = conn |> get_req_header("x-razorpay-signature") |> List.first()
    event_id = conn |> get_req_header("x-razorpay-event-id") |> List.first()

    case Easy.Billing.handle_razorpay_webhook(conn.assigns[:raw_body], signature, event_id) do
      :ok -> send_resp(conn, 200, "ok")
      # duplicates are acked so Razorpay stops retrying
      {:error, :duplicate_webhook} -> send_resp(conn, 200, "ok")
      {:error, :invalid_webhook_signature} -> send_resp(conn, 401, "invalid signature")
    end
  end
end
```

Router (`backend/lib/easy_web/router.ex`) — no-auth scope, next to the existing `/v1/public` scope:

```elixir
scope "/v1/webhooks", EasyWeb do
  pipe_through :api_public  # use whatever minimal json pipeline /v1/public uses

  post "/razorpay", WebhookController, :razorpay
end
```

Add to `backend/lib/easy/billing.ex`:

```elixir
alias Easy.Billing.WebhookReceipt

def handle_razorpay_webhook(raw_body, signature, event_id) do
  with true <- Razorpay.valid_webhook_signature?(raw_body, signature),
       {:ok, params} <- Jason.decode(raw_body),
       :ok <- claim_receipt(event_id || fallback_event_id(raw_body), params["event"]) do
    apply_webhook_event(params)
  else
    false -> {:error, :invalid_webhook_signature}
    {:error, %Jason.DecodeError{}} -> {:error, :invalid_webhook_signature}
    {:error, :duplicate_webhook} -> {:error, :duplicate_webhook}
  end
end

defp claim_receipt(event_id, event_type) do
  %WebhookReceipt{razorpay_event_id: event_id, event_type: event_type || "unknown", processed_at: DateTime.utc_now(:second)}
  |> Repo.insert(on_conflict: :nothing, conflict_target: [:razorpay_event_id])
  |> case do
    # id nil after on_conflict: :nothing insert means the row already existed
    {:ok, %{id: nil}} -> {:error, :duplicate_webhook}
    {:ok, _} -> :ok
  end
end

defp fallback_event_id(raw_body), do: "sha:" <> Base.encode16(:crypto.hash(:sha256, raw_body), case: :lower)

# --- event application; out-of-order guard: only transitions valid for local state ---

defp apply_webhook_event(%{"event" => "subscription.charged", "payload" => payload}) do
  subscription = payload["subscription"]["entity"]
  payment = payload["payment"]["entity"]

  with_billing(subscription["id"], fn billing ->
    quantity = subscription["quantity"] || billing.paid_seats

    billing
    |> BusinessBilling.changeset(%{
      paid_seats: quantity,
      status: :active,
      current_period_end: subscription["current_end"] && DateTime.from_unix!(subscription["current_end"])
    })
    |> Repo.update!()

    record_event(billing.business_id, :payment_succeeded, %{
      amount_paid: payment["amount"] && div(payment["amount"], 100),
      currency: payment["currency"]
    })

    record_seat_change(billing, quantity)
    activate_awaiting_clients(billing.business_id)
    :ok
  end)
end

defp apply_webhook_event(%{"event" => event, "payload" => payload})
     when event in ["subscription.pending", "subscription.halted"] do
  with_billing(payload["subscription"]["entity"]["id"], fn billing ->
    if billing.status in [:active, :cancel_at_period_end] do
      billing |> BusinessBilling.changeset(%{status: :past_due}) |> Repo.update!()
      record_event(billing.business_id, :payment_failed)
    end

    :ok
  end)
end

defp apply_webhook_event(%{"event" => "subscription.cancelled", "payload" => payload}) do
  with_billing(payload["subscription"]["entity"]["id"], fn billing ->
    if billing.status != :cancelled do
      billing |> BusinessBilling.changeset(%{status: :cancelled, paid_seats: 0}) |> Repo.update!()
      record_event(billing.business_id, :subscription_cancelled)
    end

    :ok
  end)
end

defp apply_webhook_event(%{"event" => "subscription.updated", "payload" => payload}) do
  subscription = payload["subscription"]["entity"]

  with_billing(subscription["id"], fn billing ->
    if billing.status in [:active, :past_due, :cancel_at_period_end] and
         is_integer(subscription["quantity"]) do
      record_seat_change(billing, subscription["quantity"])

      billing
      |> BusinessBilling.changeset(%{paid_seats: subscription["quantity"]})
      |> Repo.update!()

      activate_awaiting_clients(billing.business_id)
    end

    :ok
  end)
end

# unrecognized events: receipt already stored, just ack
defp apply_webhook_event(_params), do: :ok

defp with_billing(nil, _fun), do: :ok

defp with_billing(subscription_id, fun) do
  case Repo.get_by(BusinessBilling, razorpay_subscription_id: subscription_id) do
    nil -> :ok
    billing -> fun.(billing)
  end
end

defp record_seat_change(%{paid_seats: old}, new) when new > old,
  do: record_event_seat_delta(new - old, :seats_added)
defp record_seat_change(%{paid_seats: old}, new) when new < old,
  do: record_event_seat_delta(old - new, :seats_removed)
defp record_seat_change(_billing, _new), do: :ok
```

Careful: `record_seat_change` above needs the `business_id` — implement it as a 2-arity private helper taking `(billing, new_quantity)` and calling `record_event(billing.business_id, kind, %{seat_delta: abs(new - old)})`. Write it out plainly; keep credo nesting ≤ 2 (RM-003).

- [ ] **Step 4: Run tests**

Run: `mix test test/easy_web/controllers/webhook_controller_test.exs && mix test`
Expected: PASS, full suite green (the `body_reader` change touches every request — the full run is the check).

- [ ] **Step 5: Commit**

```bash
git add backend/lib backend/test
git commit -m "feat(billing): razorpay webhook — signature, dedupe, state sync"
```

---

### Task 7: Coach billing API + OpenApiSpex + fallback

**Files:**
- Create: `backend/lib/easy_web/controllers/coaches/billing_controller.ex`
- Create: `backend/lib/easy_web/open_api/schemas/billing.ex`
- Modify: `backend/lib/easy_web/router.ex` (coach scope, ~line 89)
- Modify: `backend/lib/easy_web/controllers/fallback_controller.ex`
- Modify: `backend/lib/easy_web/controllers/coaches/client_controller.ex` (document 409 on invite/update operations)
- Test: `backend/test/easy_web/controllers/coaches/billing_controller_test.exs`

**Interfaces:**
- Consumes: `Billing.seat_summary/1`, `recent_events/1`, `checkout/2`, `cancel/1`.
- Produces (contract for the frontend after `just gen-api`):
  - `GET /v1/coach/billing` → `{data: {status, free_seats, paid_seats, seat_limit, used_seats, available_seats, awaiting_seat_count, monthly_seat_price_inr, current_period_end, is_owner, recent_events: [{id, kind, seat_delta, amount_paid, currency, occurred_at}]}}`
  - `POST /v1/coach/billing/checkout` `{seats_to_add}` → `{data: {action: "checkout"|"updated", checkout: {key_id, subscription_id} | null, billing: <summary>}}`
  - `POST /v1/coach/billing/cancel` → `{data: <summary>}`
  - 409 body on seat limit (from FallbackController): `{error: {code: "seat_limit_reached", message: "No seats available"}, seat_summary: <summary>}` — **mirror the app's existing error envelope**; keep `seat_summary` top-level next to it.

- [ ] **Step 1: Write the failing test**

`backend/test/easy_web/controllers/coaches/billing_controller_test.exs` (mirror the setup/auth helpers of `client_controller_test.exs`):

```elixir
defmodule EasyWeb.Coaches.BillingControllerTest do
  use Easy.ConnCase, async: true

  import Easy.Factory
  import OpenApiSpex.TestAssertions

  # setup: mirror client_controller_test.exs — insert coach (owner) + authenticate_coach

  describe "GET /v1/coach/billing" do
    test "returns the seat summary with recent events", %{conn: conn, business: business} do
      insert(:client, business: business, status: :active)

      conn = get(conn, "/v1/coach/billing")

      assert %{"data" => data} = json_response(conn, 200)
      assert data["free_seats"] == 2
      assert data["used_seats"] == 1
      assert data["seat_limit"] == 2
      assert data["is_owner"] == true
      assert is_list(data["recent_events"])
      # RM-002: rendered entity matches the OpenApiSpex schema
      assert_schema(data, "BillingSummary", EasyWeb.ApiSpec.spec())
    end
  end

  describe "POST /v1/coach/billing/checkout" do
    test "first purchase returns a checkout payload", %{conn: conn} do
      Req.Test.stub(Easy.Razorpay, fn req_conn ->
        Req.Test.json(req_conn, %{"id" => "sub_x", "plan_id" => "plan_test"})
      end)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/billing/checkout", %{seats_to_add: 2})

      assert %{"data" => %{"action" => "checkout", "checkout" => %{"subscription_id" => "sub_x"}}} =
               json_response(conn, 200)
    end

    test "non-owner coach gets 403", %{conn: _conn, business: business} do
      # authenticate a second coach of the same business who is NOT owner_id
      # (insert(:coach, business: business) + authenticate_coach)
      # assert 403 with the standard error envelope
    end
  end

  describe "POST /v1/coach/billing/cancel" do
    test "schedules cancellation", %{conn: conn, business: business} do
      insert(:business_billing, business: business, paid_seats: 2, status: :active,
        razorpay_subscription_id: "sub_c")

      Req.Test.stub(Easy.Razorpay, fn req_conn ->
        Req.Test.json(req_conn, %{"id" => "sub_c", "status" => "cancelled"})
      end)

      conn = conn |> put_req_header("content-type", "application/json") |> post("/v1/coach/billing/cancel")

      assert %{"data" => %{"status" => "cancel_at_period_end"}} = json_response(conn, 200)
    end
  end

  describe "seat-limit conflict on invite" do
    test "invite at the limit returns 409 with the seat summary", %{conn: conn, business: business} do
      insert(:client, business: business, status: :active)
      insert(:client, business: business, status: :active)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/clients/invite", params_for(:client_attrs))

      body = json_response(conn, 409)
      assert body["seat_summary"]["used_seats"] == 2
      assert body["seat_summary"]["available_seats"] == 0
    end
  end

  test "403 without auth token" do
    conn = build_conn() |> get("/v1/coach/billing")
    assert conn.status in [401, 403]
  end
end
```

Fill in the setup block and non-owner test by copying the exact helper usage from `client_controller_test.exs` — the factory graph must give you `business.owner_id` == authenticated coach's user id for owner tests.

- [ ] **Step 2: Run test to verify it fails**

Run: `mix test test/easy_web/controllers/coaches/billing_controller_test.exs`
Expected: FAIL — 404, no route.

- [ ] **Step 3: Implement**

`backend/lib/easy_web/open_api/schemas/billing.ex` (RM-006: examples are valid enum members; RM-007: `struct?: false` everywhere):

```elixir
defmodule EasyWeb.OpenApi.Schemas.Billing do
  alias OpenApiSpex.Schema

  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.Shared

  defmodule BillingEvent do
    OpenApiSpex.schema(
      %{
        title: "BillingEvent",
        type: :object,
        properties: %{
          id: %Schema{type: :string, format: :uuid},
          kind: %Schema{
            type: :string,
            enum: ["seats_added", "seats_removed", "payment_succeeded", "payment_failed", "cancellation_scheduled", "subscription_cancelled"],
            example: "seats_added"
          },
          seat_delta: %Schema{type: :integer, nullable: true, example: 3},
          amount_paid: %Schema{type: :integer, nullable: true, description: "INR (rupees)", example: 1497},
          currency: %Schema{type: :string, nullable: true, example: "INR"},
          occurred_at: %Schema{type: :string, format: :"date-time"}
        },
        required: [:id, :kind, :occurred_at]
      },
      struct?: false
    )
  end

  defmodule BillingSummary do
    OpenApiSpex.schema(
      %{
        title: "BillingSummary",
        type: :object,
        properties: %{
          status: %Schema{
            type: :string,
            enum: ["free", "active", "past_due", "cancel_at_period_end", "cancelled"],
            example: "free"
          },
          free_seats: %Schema{type: :integer, example: 2},
          paid_seats: %Schema{type: :integer, example: 3},
          seat_limit: %Schema{type: :integer, example: 5},
          used_seats: %Schema{type: :integer, description: "active clients + pending invites", example: 4},
          available_seats: %Schema{type: :integer, example: 1},
          awaiting_seat_count: %Schema{type: :integer, example: 0},
          monthly_seat_price_inr: %Schema{type: :integer, example: 499},
          current_period_end: %Schema{type: :string, format: :"date-time", nullable: true},
          is_owner: %Schema{type: :boolean},
          recent_events: %Schema{type: :array, items: BillingEvent, nullable: true}
        },
        required: [:status, :free_seats, :paid_seats, :seat_limit, :used_seats, :available_seats, :awaiting_seat_count, :monthly_seat_price_inr, :is_owner]
      },
      struct?: false
    )
  end

  defmodule CheckoutRequest do
    OpenApiSpex.schema(
      %{
        title: "BillingCheckoutRequest",
        type: :object,
        properties: %{seats_to_add: %Schema{type: :integer, minimum: 1, example: 3}},
        required: [:seats_to_add]
      },
      struct?: false
    )
  end

  defmodule CheckoutPayload do
    OpenApiSpex.schema(
      %{
        title: "BillingCheckoutPayload",
        type: :object,
        properties: %{
          key_id: %Schema{type: :string, example: "rzp_test_key"},
          subscription_id: %Schema{type: :string, example: "sub_123"}
        },
        required: [:key_id, :subscription_id]
      },
      struct?: false
    )
  end

  defmodule CheckoutResult do
    OpenApiSpex.schema(
      %{
        title: "BillingCheckoutResult",
        type: :object,
        properties: %{
          action: %Schema{type: :string, enum: ["checkout", "updated"], example: "checkout"},
          checkout: %Schema{allOf: [CheckoutPayload], nullable: true},
          billing: BillingSummary
        },
        required: [:action, :billing]
      },
      struct?: false
    )
  end

  # Response wrappers — use Shared.data_response/2 exactly like schemas/client.ex does:
  # BillingResponse (data: BillingSummary), CheckoutResponse (data: CheckoutResult)
end
```

(Match the exact module naming/namespacing and `Shared.data_response` usage of `lib/easy_web/open_api/schemas/client.ex` — copy its head.)

`backend/lib/easy_web/controllers/coaches/billing_controller.ex` (mirror `client_controller.ex` structure: `use OpenApiSpex.ControllerSpecs`, `CastAndValidate` for checkout, fallback controller, `conn.assigns.ctx`, `conn.body_params` per RM-008):

```elixir
defmodule EasyWeb.Coaches.BillingController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Billing
  alias EasyWeb.OpenApi.Schemas.Billing, as: BillingSchemas

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:checkout]

  action_fallback EasyWeb.FallbackController

  tags ["billing"]

  operation :show,
    summary: "Get billing and seat summary",
    responses: [ok: {"Billing", "application/json", BillingSchemas.BillingResponse}]

  def show(conn, _params) do
    ctx = conn.assigns.ctx
    summary = Map.put(Billing.seat_summary(ctx), :recent_events, Billing.recent_events(ctx))
    json(conn, %{data: render_summary(summary)})
  end

  operation :checkout,
    summary: "Buy seats (owner only)",
    request_body: {"Checkout", "application/json", BillingSchemas.CheckoutRequest},
    responses: [ok: {"Checkout result", "application/json", BillingSchemas.CheckoutResponse}]

  def checkout(conn, _params) do
    %{seats_to_add: seats_to_add} = conn.body_params

    with {:ok, result} <- Billing.checkout(conn.assigns.ctx, seats_to_add) do
      json(conn, %{data: %{action: result.action, checkout: result[:checkout], billing: render_summary(result.billing)}})
    end
  end

  operation :cancel,
    summary: "Schedule cancellation at period end (owner only)",
    responses: [ok: {"Billing", "application/json", BillingSchemas.BillingResponse}]

  def cancel(conn, _params) do
    with {:ok, summary} <- Billing.cancel(conn.assigns.ctx) do
      json(conn, %{data: render_summary(summary)})
    end
  end

  defp render_summary(summary) do
    Map.update(summary, :recent_events, nil, fn
      nil -> nil
      events -> Enum.map(events, &render_event/1)
    end)
  end

  defp render_event(event) do
    %{
      id: event.id,
      kind: event.kind,
      seat_delta: event.seat_delta,
      amount_paid: event.amount_paid,
      currency: event.currency,
      occurred_at: event.occurred_at
    }
  end
end
```

(If the codebase renders through JSON view modules rather than inline maps, follow that pattern instead — check `client_controller.ex`. RM-002 applies either way.)

Router — inside the existing `scope "/v1/coach"` block:

```elixir
get "/billing", BillingController, :show
post "/billing/checkout", BillingController, :checkout
post "/billing/cancel", BillingController, :cancel
```

FallbackController — add clauses (mirror the file's existing error envelope; the codes below assume the `Easy.Error`-style shape):

```elixir
def call(conn, {:error, :seat_limit_reached}) do
  seat_summary = Easy.Billing.seat_summary(conn.assigns.ctx)

  conn
  |> put_status(:conflict)
  |> json(%{
    error: %{code: "seat_limit_reached", message: "No seats available"},
    seat_summary: seat_summary
  })
end

def call(conn, {:error, :not_owner}) do
  # render 403 via the same path the existing :unauthorized clause uses
end

def call(conn, {:error, :no_subscription}) do
  # 422 via the existing unprocessable path
end

def call(conn, {:error, :razorpay_error}) do
  # 502 Bad Gateway, generic message; details are already logged by the boundary
end
```

Also add `409` responses to the OpenApiSpex `operation` blocks for `ClientController.invite` and `.update` (document the seat-limit envelope so the generated client types it — define a small `SeatLimitError` schema in `schemas/billing.ex` with `error` + `seat_summary: BillingSummary`).

- [ ] **Step 4: Run tests, then the backend finish line**

Run: `mix test test/easy_web/controllers/coaches/billing_controller_test.exs && mix precommit`
Expected: PASS, precommit clean.

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(billing): coach billing API, OpenApi schemas, seat-limit 409"
```

---

### Task 8: Frontend API client + Razorpay checkout helper

**Files:**
- Regenerate: `frontend/apps/coachapp-v2/src/api/generated.ts` (via `just gen-api` — never hand-edit)
- Modify: `frontend/apps/coachapp-v2/src/api/base.ts` (add `'Billing'` to `tagTypes`, ~line 98)
- Create: `frontend/apps/coachapp-v2/src/api/billing.ts`
- Modify: `frontend/apps/coachapp-v2/src/api/clients.ts` (invite/revoke/update also invalidate `Billing` — RM-118; add `'awaiting_seat'` to `ClientStatus` line 7)
- Create: `frontend/apps/coachapp-v2/src/lib/razorpay.ts`

**Interfaces:**
- Consumes: backend endpoints from Task 7 (restart `phx.server` first — RM-004).
- Produces: `useGetBillingQuery`, `useCheckoutSeatsMutation`, `useCancelBillingMutation`, `BillingSummary` type, `openRazorpayCheckout(opts)`, `getSeatLimitError(err)`.

- [ ] **Step 1: Regenerate the API client**

```bash
# from repo root; backend dev server must be RESTARTED after Task 7 (RM-004)
just gen-api
```

Expected: `coachapp-v2/src/api/generated.ts` gains the three billing endpoints and `BillingSummary`/`BillingCheckoutResult` types. The trailing biome error on the generated file is expected (RM-105).

- [ ] **Step 2: Wrap with cache tags**

`frontend/apps/coachapp-v2/src/api/base.ts`: add `'Billing'` to the `tagTypes` array.

`frontend/apps/coachapp-v2/src/api/billing.ts` (mirror the enhance pattern of `api/profile.ts` — wrap generated endpoints, don't rewrite them; if the generated names differ, use the real ones):

```ts
import { coachApi } from './generated';

export type { BillingSummary } from './generated';

const billingApi = coachApi.enhanceEndpoints({
  endpoints: {
    // use the actual generated endpoint names from generated.ts
    getCoachBilling: { providesTags: [{ type: 'Billing', id: 'SUMMARY' }] },
    postCoachBillingCheckout: { invalidatesTags: [{ type: 'Billing', id: 'SUMMARY' }, { type: 'Client', id: 'LIST' }] },
    postCoachBillingCancel: { invalidatesTags: [{ type: 'Billing', id: 'SUMMARY' }] },
  },
});

export const {
  useGetCoachBillingQuery: useGetBillingQuery,
  usePostCoachBillingCheckoutMutation: useCheckoutSeatsMutation,
  usePostCoachBillingCancelMutation: useCancelBillingMutation,
} = billingApi;

/** Extract the seat summary from a 409 seat_limit_reached error, or null. */
export function getSeatLimitError(err: unknown): { seatSummary: BillingSummary } | null {
  const e = err as { status?: number; data?: { error?: { code?: string }; seat_summary?: BillingSummary } };
  if (e?.status === 409 && e?.data?.error?.code === 'seat_limit_reached' && e.data.seat_summary) {
    return { seatSummary: e.data.seat_summary };
  }
  return null;
}
```

(Adjust to the real generated names and the real error envelope from Task 7. If `enhanceEndpoints` isn't the established pattern, follow whatever `api/profile.ts` does — `injectEndpoints` with `overrideExisting: true`.)

In `api/clients.ts`: extend `invalidatesTags` on `inviteClient`, `revokeInvitation`, and the client-update mutation with `{ type: 'Billing', id: 'SUMMARY' }` (seat usage changes with all three). Add `'awaiting_seat'` to the `ClientStatus` union.

- [ ] **Step 3: Razorpay checkout loader**

`frontend/apps/coachapp-v2/src/lib/razorpay.ts`:

```ts
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(opts: {
  keyId: string;
  subscriptionId: string;
  onSuccess: () => void;
  onDismiss?: () => void;
}): Promise<void> {
  await loadScript();
  new window.Razorpay({
    key: opts.keyId,
    subscription_id: opts.subscriptionId,
    name: 'CoachEasy',
    handler: opts.onSuccess,
    modal: { ondismiss: opts.onDismiss },
  }).open();
}
```

- [ ] **Step 4: Typecheck**

Run (from `frontend/`): `pnpm --filter coachapp-v2 exec tsc --noEmit && pnpm --filter coachapp-v2 exec biome check src`
Expected: clean (except known generated-file noise).

- [ ] **Step 5: Commit**

```bash
git add frontend/apps/coachapp-v2/src/api frontend/apps/coachapp-v2/src/lib/razorpay.ts frontend/openapi
git commit -m "feat(coachapp): billing API client and Razorpay checkout loader"
```

---

### Task 9: Coachapp Settings → Billing page

**Files:**
- Create: `frontend/apps/coachapp-v2/src/settings/billing.tsx`
- Create: `frontend/apps/coachapp-v2/src/settings/add-seats-dialog.tsx` (shared with Task 10's blocked invite flow)
- Modify: `frontend/apps/coachapp-v2/src/settings/settings.tsx` (add `BillingSection`)
- Modify: `frontend/apps/coachapp-v2/src/@config/routes.ts` (add `SETTINGS_BILLING: '/settings/billing'`)
- Modify: `frontend/apps/coachapp-v2/src/router.tsx` (route entry)

**Interfaces:**
- Consumes: `useGetBillingQuery`, `useCheckoutSeatsMutation`, `useCancelBillingMutation`, `openRazorpayCheckout`, HeroUI (`Chip`, `Button`, `AlertDialog`, `Typography`, `NumberInput` per RM-121), `SectionHeading`, `Page`.
- Produces: `ROUTES.SETTINGS_BILLING` screen; `<AddSeatsDialog isOwner onDone />` reusable component.

- [ ] **Step 1: Settings section**

In `settings.tsx`, add a `BillingSection` mirroring `AcquisitionSection` (SectionHeading + surface card + ChevronRight nav row) navigating to `ROUTES.SETTINGS_BILLING` (RM-102), and render it in the sections column. Add the route constant and the router entry under `AppShellScreen` in the same change (RM-103).

- [ ] **Step 2: AddSeatsDialog**

`frontend/apps/coachapp-v2/src/settings/add-seats-dialog.tsx` — one component used from both the billing page and the blocked invite flow:

```tsx
import { useState } from 'react';
import { AlertDialog, Button, NumberInput } from '@heroui/react';
import { useCheckoutSeatsMutation, useGetBillingQuery } from '@/api/billing';
import { openRazorpayCheckout } from '@/lib/razorpay';
import { getApiErrorMessage } from '@/api/shared';
import { toast } from '@heroui/react';

export function AddSeatsDialog({ onDone }: { onDone?: () => void }) {
  const [seats, setSeats] = useState(1);
  const [checkout, { isLoading }] = useCheckoutSeatsMutation();
  const { refetch } = useGetBillingQuery();

  const buy = async (close: () => void) => {
    try {
      const result = await checkout({ seats_to_add: seats }).unwrap();
      if (result.data.action === 'checkout' && result.data.checkout) {
        await openRazorpayCheckout({
          keyId: result.data.checkout.key_id,
          subscriptionId: result.data.checkout.subscription_id,
          onSuccess: () => {
            // webhook confirms payment; refetch picks up state when it lands
            toast.success('Payment received. Seats will activate shortly.');
            refetch();
            close();
            onDone?.();
          },
        });
      } else {
        toast.success(`Added ${seats} seat${seats > 1 ? 's' : ''}`);
        close();
        onDone?.();
      }
    } catch (err) {
      toast.danger(getApiErrorMessage(err, "Couldn't add seats"));
    }
  };

  // AlertDialog compound structure: copy the exact composition from
  // clients/components/invitation-widget.tsx:170-225 (Backdrop/Container/Dialog/
  // Header/Heading/Body/Footer with {close} render prop).
  // Body: NumberInput (min 1) bound to seats + price line
  // "₹{price} / seat / month". Footer: Cancel + Button onPress={() => buy(close)}
  // isPending={isLoading} (constant-width pending, RM-125).
  return /* ... */;
}
```

- [ ] **Step 3: Billing page**

`frontend/apps/coachapp-v2/src/settings/billing.tsx` — follow coachapp Page Anatomy (`coachapp-v2/AGENTS.md`). Content:

```tsx
// Structure (Page wrapper + max-w-lg column, like settings.tsx):
//
// SEAT USAGE card (rounded-xl border border-border bg-surface):
//   Typography body-sm text-muted: "Used seats: active clients + pending invites"   <- verbatim copy
//   Big count: `${billing.used_seats} / ${billing.seat_limit}`
//   Typography body-xs text-muted: `${billing.free_seats} free + ${billing.paid_seats} paid`
//   <Chip size="sm" variant="soft" color={STATUS_COLOR[billing.status]}>{STATUS_LABEL[billing.status]}</Chip>
//   Price line: `₹${billing.monthly_seat_price_inr} / seat / month`
//   current_period_end when present: "Renews <date>" (or "Ends <date>" when cancel_at_period_end)
//   awaiting_seat_count > 0: warning line "N clients waiting for a seat"
//
// ACTIONS (owner only — billing.is_owner):
//   <AddSeatsDialog onDone={refetch} />  (trigger button "Add seats")
//   Cancel button, shown when status is 'active' | 'past_due':
//     AlertDialog confirm ("Paid seats stay until <period end>. Existing clients keep access.")
//     onPress -> useCancelBillingMutation
//   Non-owner: Typography text-muted "Ask the owner to manage billing."
//
// ACTIVITY card: billing.recent_events map ->
//   seats_added: `Added ${e.seat_delta} seats`
//   seats_removed: `Removed ${e.seat_delta} seats`
//   payment_succeeded: `Payment succeeded — INR ${e.amount_paid}`
//   payment_failed: 'Payment failed'
//   cancellation_scheduled: 'Cancellation scheduled'
//   subscription_cancelled: 'Subscription cancelled'
//   + occurred_at formatted with the app's existing date util (grep for one before adding)
//   Empty state: "No billing activity yet."
//
// Loading: skeleton matching final layout (RM-125). Error: ErrorState "Couldn't load billing".

const STATUS_LABEL: Record<BillingSummary['status'], string> = {
  free: 'Free plan',
  active: 'Active',
  past_due: 'Payment overdue',
  cancel_at_period_end: 'Cancels at period end',
  cancelled: 'Cancelled',
};
const STATUS_COLOR: Record<BillingSummary['status'], 'default' | 'success' | 'warning'> = {
  free: 'default',
  active: 'success',
  past_due: 'warning',
  cancel_at_period_end: 'warning',
  cancelled: 'default',
};
```

Write the full component — the block above defines the required content, copy, and states; the exact JSX follows the app's existing settings subpage (`settings/profile-fields.tsx`) for header/back-nav structure.

- [ ] **Step 4: Build + live check**

Run: `pnpm --filter coachapp-v2 exec tsc --noEmit && pnpm --filter coachapp-v2 build`
Then verify live (RM-119): open the billing page at mobile (390px) and desktop widths — free state, and (via seeded/paid business if available) active state. Record which states were checked.

- [ ] **Step 5: Commit**

```bash
git add frontend/apps/coachapp-v2/src
git commit -m "feat(coachapp): settings billing page with add-seats and cancel flows"
```

---

### Task 10: Coachapp blocked invite flow + awaiting_seat chips

**Files:**
- Modify: `frontend/apps/coachapp-v2/src/clients/invite-client.tsx` (seat-limit blocked state)
- Modify: `frontend/apps/coachapp-v2/src/clients/clients-list/client-list-item.tsx` (STATUS_CONFIG, lines 7-12)
- Modify: `frontend/apps/coachapp-v2/src/clients/lib/client.ts` (STATUS_CHIP_COLOR + label map, lines 9-14)
- Modify: `frontend/apps/coachapp-v2/src/clients/client-detail.tsx` (chip ~lines 357-363 + owner "Add seats" action)

**Interfaces:**
- Consumes: `getSeatLimitError` (Task 8), `AddSeatsDialog` (Task 9), `BillingSummary`.

- [ ] **Step 1: Status chips**

`clients-list/client-list-item.tsx` STATUS_CONFIG — add:

```ts
awaiting_seat: { color: 'warning', label: 'Joined, waiting for a seat.' },
```

(verbatim spec copy). `clients/lib/client.ts`: add `awaiting_seat: 'warning'` to `STATUS_CHIP_COLOR` and add a shared `STATUS_LABEL` map (one source of truth — RM-107) so the detail page stops rendering the raw status string. `client-detail.tsx`: use `STATUS_LABEL[client.status]` in the hero chip; when `status === 'awaiting_seat'`, render below it: owner → `<AddSeatsDialog />` trigger button "Add seats"; the owner flag comes from `useGetBillingQuery().data?.data.is_owner`; non-owner → `Typography text-muted` "Ask the owner to add seats."

- [ ] **Step 2: Blocked invite flow**

In `invite-client.tsx`, the submit handler currently routes errors through `applyFormErrors` (~lines 135-140). Intercept the seat-limit case first:

```tsx
const [seatLimit, setSeatLimit] = useState<BillingSummary | null>(null);

// in the catch of the submit handler:
const limit = getSeatLimitError(err);
if (limit) {
  setSeatLimit(limit.seatSummary);
  return;
}
applyFormErrors(err, FALLBACK, form.setError, INVITE_CLIENT_FORM_FIELDS);
```

When `seatLimit` is set, render a blocked panel instead of (or above) the form — card with:

- Heading: "No seats available"
- Verbatim line: **"Used seats: active clients + pending invites"** with `${seatLimit.used_seats} / ${seatLimit.seat_limit}`
- `seatLimit.is_owner === true`: `<AddSeatsDialog onDone={() => setSeatLimit(null)} />` trigger "Add seats" — after purchase the coach can resubmit the same filled form (no refetch needed in the happy path; the summary came from the 409).
- `seatLimit.is_owner === false`: "Ask the owner to add seats."
- A "Back" button clearing `seatLimit` to return to the form.

- [ ] **Step 3: Build + live check**

Run: `pnpm --filter coachapp-v2 exec tsc --noEmit && pnpm --filter coachapp-v2 build`
Live (RM-119): with a business at the seat limit, walk the invite flow as owner (blocked panel → add seats) and verify an `awaiting_seat` client renders the chip in list + detail. Mobile + desktop widths.

- [ ] **Step 4: Commit**

```bash
git add frontend/apps/coachapp-v2/src/clients
git commit -m "feat(coachapp): seat-limit invite flow and awaiting_seat status surfaces"
```

---

### Task 11: Clientapp blocked welcome screen

**Files:**
- Create: `frontend/apps/clientapp-v2/src/@components/awaiting-seat-screen.tsx`
- Modify: `frontend/apps/clientapp-v2/src/@components/app-shell.tsx` (status gate)

**Interfaces:**
- Consumes: `useGetClientProfileQuery` (`src/api/profile.ts` — `ClientProfile.status`, `coach.business_name`).

- [ ] **Step 1: Blocked screen**

`awaiting-seat-screen.tsx`:

```tsx
import { Typography } from '@heroui/react';
import { useGetClientProfileQuery } from '@/api/profile';

export function AwaitingSeatScreen() {
  const { data: profile } = useGetClientProfileQuery();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      {profile?.coach?.business_name ? (
        <Typography type="h6">{profile.coach.business_name}</Typography>
      ) : null}
      <Typography type="h5">You're almost in</Typography>
      <Typography type="body-sm" color="muted">
        Your coach needs to activate your seat before you can continue.
      </Typography>
    </div>
  );
}
```

(Copy is verbatim from the spec. Match the app's existing logout affordance if the login/otp screens expose one — if a signout helper exists, add a small "Log out" ghost button; otherwise skip.)

- [ ] **Step 2: Gate in the shell**

In `app-shell.tsx` (inside `AppShell`, before rendering tabs + `Outlet`):

```tsx
const { data: profile, isLoading } = useGetClientProfileQuery();

if (!isLoading && profile?.status === 'awaiting_seat') {
  return <AwaitingSeatScreen />;
}
```

Keep the existing splash/loading behavior for the `isLoading` phase (don't flash the blocked screen). This blocks ALL shell routes — no plans, logging, or workflows — which is exactly the spec.

- [ ] **Step 3: Build + live check**

Run: `pnpm --filter clientapp-v2 exec tsc --noEmit && pnpm --filter clientapp-v2 build`
Live (RM-119): set a client to `awaiting_seat` in the DB, log in as them, verify the blocked screen at mobile width (clientapp is mobile-only); verify an `active` client still gets the normal app.

- [ ] **Step 4: Commit**

```bash
git add frontend/apps/clientapp-v2/src
git commit -m "feat(clientapp): awaiting_seat blocked welcome screen"
```

---

### Task 12: Full verification pass

**Files:** none new.

- [ ] **Step 1: Backend finish line**

Run (from `backend/`): `mix precommit`
Expected: format, credo, full test suite all green.

- [ ] **Step 2: Frontend finish line**

Run (from repo root): `just lint && just build`
Expected: biome + check-rm + tsc + builds green for both apps (known generated-file biome noise excepted).

- [ ] **Step 3: End-to-end smoke (spec's frontend checks)**

With backend + coachapp running (restart `phx.server` — RM-004):

1. Fresh business → Settings → Billing shows `0 / 2`, "Free plan", price line.
2. Invite 2 clients → `2 / 2`. Third invite → blocked panel with verbatim used-seats copy.
3. Owner: Add seats from blocked flow → Razorpay test checkout opens (test key). Non-owner path: "Ask the owner to add seats." (verify by temporarily hitting the 409 with `is_owner` false, or a second coach account if seeds allow).
4. `awaiting_seat` client: chip "Joined, waiting for a seat." in list + detail; clientapp shows blocked welcome.
5. Simulate a `subscription.charged` webhook with a signed curl against localhost → paid seats rise, awaiting client activates, activity list shows "Payment succeeded".
6. Record which states were visually verified and at which widths (RM-119) in the completion report.

- [ ] **Step 4: Ledger check**

Skim `docs/agents/recurring-mistakes.md` for the touched areas (done at plan time; re-verify RM-002 assert_schema tests exist for BillingSummary and the client status change). If any new recurring mistake surfaced during implementation, add a rule entry.

- [ ] **Step 5: Final commit (if anything changed)**

```bash
git add -A && git commit -m "chore(billing): verification pass fixes"
```

---

## Self-review notes

- Spec coverage: product rules → Tasks 2-3; lifecycle → Tasks 1, 3; data model → Task 1; Razorpay boundary → Task 4; checkout flow → Tasks 5, 8, 9; cancellation → Tasks 5, 9; webhooks → Task 6; API surface → Task 7; coach UI → Tasks 9-10; client UI → Task 11; error handling → Tasks 5-7; spec's test list → Tasks 2, 3, 5, 6, 7 map every listed backend test; frontend checks → Task 12.
- Known judgment calls (flag to reviewer, all justified above): bare-atom errors instead of tagged tuples (backend convention wins); optimistic `paid_seats` bump on subscription **update** path (spec says "returns the updated billing summary" — webhook re-syncs idempotently); accept-invite capacity rule interpreted as over-capacity check (pending already holds a seat).
- Line numbers cited are from 2026-07-06 research and drift — treat as anchors, re-locate by symbol name.
