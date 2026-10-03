defmodule Easy.Billing do
  import Ecto.Query

  alias Easy.Billing.{BusinessBilling, CheckoutIntent, Event, Webhook}
  alias Easy.Ctx
  alias Easy.Orgs.Business
  alias Easy.Razorpay
  alias Easy.Razorpay.Payload
  alias Easy.Repo

  @request_timeout_seconds 120

  @type summary :: %{
          required(:status) => BusinessBilling.status(),
          required(:free_seats) => non_neg_integer(),
          required(:paid_seats) => non_neg_integer(),
          required(:seat_limit) => non_neg_integer(),
          required(:used_seats) => non_neg_integer(),
          required(:available_seats) => integer(),
          required(:monthly_seat_price_inr) => integer() | nil,
          required(:monthly_total_inr) => integer() | nil,
          required(:billing_enabled) => boolean(),
          required(:can_add_seats) => boolean(),
          required(:can_cancel) => boolean(),
          required(:can_sync) => boolean(),
          required(:cancellation_state) => :requested | :unknown | :accepted | nil,
          required(:current_period_end) => DateTime.t() | nil,
          required(:is_owner) => boolean(),
          optional(:recent_events) => [Event.t()]
        }

  @type record_error :: :not_found | Ecto.Changeset.t()

  @type checkout_result ::
          %{action: :checkout, checkout: %{key_id: String.t(), subscription_id: String.t()}, billing: summary()}
          | %{action: :updated, billing: summary()}

  # Console-only admin op. In IEx:
  # Easy.Billing.grant_free_seats(Easy.Ctx.new("<business-id>", "<owner-user-id>"), 5)
  @spec grant_free_seats(Ctx.t(), non_neg_integer()) ::
          {:ok, BusinessBilling.t()} | {:error, record_error()}
  def grant_free_seats(%Ctx{} = ctx, free_seats) do
    Repo.transact(fn -> update_free_seats(ctx.business_id, free_seats) end)
  end

  defp update_free_seats(business_id, free_seats) do
    with {:ok, billing} <- lock_business_billing(business_id) do
      billing |> BusinessBilling.update_changeset(%{free_seats: free_seats}) |> Repo.update()
    end
  end

  @spec get_billing(Ctx.t()) :: {:ok, summary()} | {:error, record_error()}
  def get_billing(%Ctx{} = ctx) do
    with {:ok, summary} <- seat_summary(ctx) do
      {:ok, Map.put(summary, :recent_events, recent_events(ctx.business_id))}
    end
  end

  defp seat_summary(%Ctx{business_id: business_id} = ctx) do
    with {:ok, billing} <- billing_for(business_id) do
      {:ok, used} = Easy.CoachingTerms.used_seats(ctx)
      limit = BusinessBilling.seat_limit(billing)
      owner = owner?(ctx)
      unresolved = unresolved_checkout?(business_id)
      controls = billing_controls(billing, owner, unresolved)

      {:ok,
       %{
         status: billing.status,
         free_seats: billing.free_seats,
         paid_seats: billing.paid_seats,
         seat_limit: limit,
         used_seats: used,
         available_seats: limit - used,
         monthly_seat_price_inr: controls.monthly_seat_price_inr,
         monthly_total_inr: controls.monthly_total_inr,
         billing_enabled: controls.billing_enabled,
         can_add_seats: controls.can_add_seats,
         can_cancel: controls.can_cancel,
         can_sync: controls.can_sync,
         pending_checkout: pending_checkout(business_id, owner, controls.billing_enabled),
         cancellation_state: billing.cancellation_state,
         current_period_end: billing.current_period_end,
         is_owner: owner
       }}
    end
  end

  defp lock_business_billing(business_id) do
    case Repo.one(from b in BusinessBilling, where: b.business_id == ^business_id, lock: "FOR UPDATE") do
      nil -> {:error, :not_found}
      billing -> {:ok, billing}
    end
  end

  defp ensure_owner(%Ctx{} = ctx) do
    if owner?(ctx), do: :ok, else: {:error, :not_owner}
  end

  defp ensure_billing_enabled do
    if billing_enabled?(), do: :ok, else: {:error, :billing_disabled}
  end

  defp billing_enabled? do
    config = Application.get_env(:easy, Easy.Razorpay)

    Enum.all?([config[:key_id], config[:key_secret], config[:plan_id]], &(is_binary(&1) and &1 != "")) and
      is_integer(config[:seat_price_inr]) and config[:seat_price_inr] >= 0
  end

  defp billing_controls(billing, owner, unresolved) do
    enabled = billing_enabled?()
    price = if enabled, do: seat_price_inr()
    subscribed = not is_nil(billing.razorpay_subscription_id)

    %{
      monthly_seat_price_inr: price,
      monthly_total_inr: if(is_integer(price), do: price * billing.paid_seats, else: nil),
      billing_enabled: enabled,
      can_add_seats: can_add_seats?(billing, owner, enabled, unresolved),
      can_cancel: can_cancel?(billing, owner, enabled, subscribed, unresolved),
      can_sync: owner and enabled and subscribed
    }
  end

  defp can_add_seats?(%BusinessBilling{status: status, cancellation_state: cancellation}, owner, enabled, unresolved) do
    owner and enabled and is_nil(cancellation) and not unresolved and status in [:free, :active, :cancelled]
  end

  defp can_cancel?(billing, owner, enabled, subscribed, unresolved) do
    %{status: status, cancellation_state: cancellation} = billing
    eligible = owner and enabled and subscribed and not unresolved
    retryable = cancellation != :requested or request_expired?(billing.cancellation_requested_at)
    eligible and retryable and status in [:active, :past_due]
  end

  defp unresolved_checkout?(business_id) do
    Repo.exists?(from intent in CheckoutIntent, where: intent.business_id == ^business_id and intent.status in [:pending, :unknown])
  end

  defp pending_checkout(business_id, true, true) do
    case Repo.one(from intent in CheckoutIntent, where: intent.business_id == ^business_id and intent.status in [:pending, :unknown]) do
      %CheckoutIntent{} = intent ->
        %{
          key_id: Razorpay.key_id(),
          subscription_id: intent.subscription_id,
          request_id: intent.request_id,
          target_quantity: intent.target_quantity,
          status: intent.status,
          kind: intent.kind
        }

      nil ->
        nil
    end
  end

  defp pending_checkout(_business_id, _owner, _enabled), do: nil

  defp record_event(business_id, kind, attrs) do
    occurred_at = attrs[:occurred_at] || DateTime.utc_now(:second)

    business_id
    |> Event.insert_changeset(kind, occurred_at, attrs)
    |> Repo.insert()
  end

  defp recent_events(business_id) do
    Event
    |> Event.for_business(business_id)
    |> Event.newest()
    |> limit(10)
    |> Repo.all()
  end

  @spec checkout(Ctx.t(), pos_integer(), Ecto.UUID.t()) ::
          {:ok, checkout_result()}
          | {:error, :billing_disabled | :checkout_in_progress | :not_owner | :razorpay_error | record_error()}
  def checkout(%Ctx{} = ctx, seats_to_add, request_id \\ nil) do
    request_id = request_id || Ecto.UUID.generate()

    with {:ok, seats_to_add} <- BusinessBilling.parse_seat_increase(seats_to_add),
         {:ok, request_id} <- Ecto.UUID.cast(request_id),
         :ok <- ensure_billing_enabled(),
         {:ok, billing} <- get_owned_billing(ctx),
         {:ok, {billing, intent}} <- claim_checkout_intent(billing, request_id, seats_to_add) do
      run_checkout_intent(ctx, billing, intent)
    end
  end

  defp claim_checkout_intent(billing, request_id, seats_to_add) do
    Repo.transact(fn ->
      billing = Repo.one(from billing in BusinessBilling, where: billing.business_id == ^billing.business_id, lock: "FOR UPDATE")
      existing = Repo.get_by(CheckoutIntent, business_id: billing.business_id, request_id: request_id)
      unresolved = Repo.one(from intent in CheckoutIntent, where: intent.business_id == ^billing.business_id and intent.status in [:pending, :unknown])

      cond do
        existing ->
          claim_existing_checkout(billing, existing)

        unresolved ->
          {:error, :checkout_in_progress}

        true ->
          claim_new_checkout_intent(billing, request_id, seats_to_add)
      end
    end)
  end

  defp claim_existing_checkout(billing, %CheckoutIntent{kind: :update, status: status} = intent)
       when status in [:pending, :unknown] do
    if status == :unknown or request_expired?(intent.updated_at) do
      changeset =
        intent
        |> CheckoutIntent.update_changeset(%{status: :pending})
        |> Ecto.Changeset.force_change(:updated_at, DateTime.utc_now(:second))

      with {:ok, intent} <- Repo.update(changeset), do: {:ok, {billing, {:recover, intent}}}
    else
      {:error, :checkout_in_progress}
    end
  end

  defp claim_existing_checkout(billing, intent), do: {:ok, {billing, {:replay, intent}}}

  defp request_expired?(nil), do: true
  defp request_expired?(started_at), do: DateTime.diff(DateTime.utc_now(:second), started_at) >= @request_timeout_seconds

  defp claim_new_checkout_intent(billing, request_id, seats_to_add) do
    with :ok <- ensure_checkoutable(billing),
         {:ok, intent} <- create_checkout_intent(billing, request_id, seats_to_add) do
      {:ok, {billing, intent}}
    end
  end

  defp create_checkout_intent(billing, request_id, seats_to_add) do
    kind = if BusinessBilling.subscribed?(billing), do: :update, else: :create

    with {:ok, intent} <-
           billing.business_id
           |> CheckoutIntent.insert_changeset(%{
             request_id: request_id,
             target_quantity: billing.paid_seats + seats_to_add,
             kind: kind,
             status: :pending,
             subscription_id: if(kind == :update, do: billing.razorpay_subscription_id)
           })
           |> Repo.insert() do
      {:ok, {:new, intent}}
    end
  end

  defp run_checkout_intent(ctx, _billing, {:replay, %CheckoutIntent{status: :confirmed}}) do
    with {:ok, summary} <- seat_summary(ctx), do: {:ok, %{action: :updated, billing: summary}}
  end

  defp run_checkout_intent(ctx, _billing, {_replay, %CheckoutIntent{kind: :create, subscription_id: subscription_id} = intent})
       when is_binary(subscription_id) do
    checkout_result(ctx, intent)
  end

  defp run_checkout_intent(_ctx, _billing, {:replay, %CheckoutIntent{kind: :create}}) do
    {:error, :checkout_in_progress}
  end

  defp run_checkout_intent(ctx, billing, {:new, %CheckoutIntent{kind: :create} = intent}) do
    with {:ok, subscription} <- Razorpay.create_subscription(intent.target_quantity, intent.request_id),
         {:ok, intent} <- link_checkout_subscription(billing, intent, subscription) do
      checkout_result(ctx, intent)
    else
      {:error, reason} ->
        mark_checkout_unknown(intent)
        {:error, reason}
    end
  end

  defp run_checkout_intent(ctx, billing, {:new, %CheckoutIntent{kind: :update} = intent}) do
    update_quantity_intent(ctx, billing, intent)
  end

  defp run_checkout_intent(ctx, billing, {:recover, %CheckoutIntent{kind: :update} = intent}) do
    reconcile_update_intent(ctx, billing, intent)
  end

  defp link_checkout_subscription(billing, intent, subscription) do
    Repo.transact(fn ->
      with {:ok, billing} <- lock_business_billing(billing.business_id) do
        current = Repo.get_by(CheckoutIntent, business_id: billing.business_id, id: intent.id)
        link_pending_checkout(billing, current, subscription)
      end
    end)
  end

  defp link_pending_checkout(_billing, %CheckoutIntent{status: :confirmed}, _subscription), do: {:error, :checkout_in_progress}

  defp link_pending_checkout(_billing, %CheckoutIntent{subscription_id: id} = intent, %{id: id}) when not is_nil(id),
    do: {:ok, intent}

  defp link_pending_checkout(billing, %CheckoutIntent{subscription_id: nil} = intent, subscription) do
    with {:ok, _billing} <-
           billing
           |> BusinessBilling.update_changeset(%{
             razorpay_subscription_id: subscription.id,
             razorpay_plan_id: subscription.plan_id,
             status: :free,
             current_period_end: nil
           })
           |> Repo.update() do
      intent |> CheckoutIntent.update_changeset(%{subscription_id: subscription.id, status: :pending}) |> Repo.update()
    end
  end

  defp link_pending_checkout(_billing, _intent, _subscription), do: {:error, :checkout_in_progress}

  defp reconcile_update_intent(ctx, billing, intent) do
    case Razorpay.get_subscription(intent.subscription_id) do
      {:ok, subscription} ->
        recover_quantity(ctx, billing, intent, subscription)

      {:error, reason} ->
        mark_checkout_unknown(intent)
        {:error, reason}
    end
  end

  defp recover_quantity(ctx, billing, intent, %{status: "active", quantity: quantity})
       when is_integer(quantity) and quantity != intent.target_quantity do
    update_quantity_intent(ctx, billing, intent)
  end

  defp recover_quantity(ctx, billing, intent, subscription) do
    with :ok <- reconcile_subscription(billing, subscription, intent),
         {:ok, summary} <- seat_summary(ctx) do
      {:ok, %{action: :updated, billing: summary}}
    else
      {:error, reason} ->
        mark_checkout_unknown(intent)
        {:error, reason}
    end
  end

  defp update_quantity_intent(ctx, billing, intent) do
    with {:ok, subscription} <- Razorpay.update_subscription_quantity(intent.subscription_id, intent.target_quantity),
         :ok <- reconcile_subscription(billing, subscription, intent),
         {:ok, summary} <- seat_summary(ctx) do
      {:ok, %{action: :updated, billing: summary}}
    else
      {:error, reason} ->
        mark_checkout_unknown(intent)
        {:error, reason}
    end
  end

  defp mark_checkout_unknown(intent) do
    # Never regress an intent that another reconciliation already confirmed.
    from(current in CheckoutIntent,
      where: current.business_id == ^intent.business_id and current.id == ^intent.id and current.status == :pending
    )
    |> Repo.update_all(set: [status: :unknown, updated_at: DateTime.utc_now(:second)])
  end

  defp reconcile_subscription(billing, subscription, intent) do
    Repo.transact(fn ->
      with {:ok, billing} <- lock_business_billing(billing.business_id) do
        current = Repo.get_by(CheckoutIntent, business_id: billing.business_id, id: intent.id)
        reconcile_locked_intent(billing, subscription, current)
      end
    end)
    |> case do
      {:ok, :confirmed} -> :ok
      error -> error
    end
  end

  defp reconcile_locked_intent(_billing, _subscription, %CheckoutIntent{status: :confirmed}), do: {:ok, :confirmed}

  defp reconcile_locked_intent(billing, %{status: "active", quantity: quantity, id: subscription_id} = subscription, intent)
       when quantity == intent.target_quantity and subscription_id == intent.subscription_id and
              subscription_id == billing.razorpay_subscription_id do
    with :ok <- apply_subscription_state(billing, subscription),
         {:ok, _intent} <- intent |> CheckoutIntent.update_changeset(%{status: :confirmed}) |> Repo.update() do
      {:ok, :confirmed}
    end
  end

  defp reconcile_locked_intent(_billing, _subscription, _intent), do: {:error, :checkout_in_progress}

  # Support recovery when the provider accepted creation but its response was
  # lost before the subscription id reached us. The provider note proves which
  # request owns the subscription; an arbitrary id can never attach it.
  @spec recover_checkout(Ctx.t(), Ecto.UUID.t(), String.t()) ::
          {:ok, checkout_result()} | {:error, atom() | Ecto.Changeset.t()}
  def recover_checkout(%Ctx{} = ctx, request_id, subscription_id) do
    with :ok <- ensure_billing_enabled(),
         {:ok, billing} <- get_owned_billing(ctx),
         %CheckoutIntent{kind: :create} = intent <- find_checkout(ctx, request_id),
         {:ok, subscription} <- Razorpay.get_subscription(subscription_id),
         :ok <- validate_checkout_recovery(intent, subscription),
         {:ok, intent} <- link_checkout_subscription(billing, intent, subscription) do
      checkout_recovery_result(ctx, billing, intent, subscription)
    else
      nil -> {:error, :not_found}
      %CheckoutIntent{} -> {:error, :invalid_input}
      error -> error
    end
  end

  defp find_checkout(ctx, request_id), do: Repo.get_by(CheckoutIntent, business_id: ctx.business_id, request_id: request_id)

  defp validate_checkout_recovery(intent, subscription) do
    matches_reference = subscription.checkout_request_id == intent.request_id
    matches_quantity = subscription.quantity == intent.target_quantity
    matches_plan = subscription.plan_id == Application.get_env(:easy, Easy.Razorpay)[:plan_id]
    resumable = subscription.status in ["created", "authenticated", "active"] and intent.status != :confirmed

    if matches_reference and matches_quantity and matches_plan and resumable, do: :ok, else: {:error, :invalid_input}
  end

  defp checkout_recovery_result(ctx, billing, intent, %{status: "active"} = subscription),
    do: recover_quantity(ctx, billing, intent, subscription)

  defp checkout_recovery_result(ctx, _billing, intent, _subscription), do: checkout_result(ctx, intent)

  defp checkout_result(ctx, intent) do
    with {:ok, summary} <- seat_summary(ctx) do
      {:ok,
       %{
         action: :checkout,
         checkout: %{key_id: Razorpay.key_id(), subscription_id: intent.subscription_id, request_id: intent.request_id},
         billing: summary
       }}
    end
  end

  @spec cancel(Ctx.t()) ::
          {:ok, summary()}
          | {:error, :billing_disabled | :not_owner | :no_subscription | :razorpay_error | record_error()}
  def cancel(%Ctx{} = ctx) do
    with :ok <- ensure_billing_enabled(),
         {:ok, billing} <- get_owned_subscription(ctx),
         {:ok, billing} <- claim_cancellation(billing.business_id) do
      do_cancel(ctx, billing)
    end
  end

  @spec sync_billing(Ctx.t()) ::
          {:ok, summary()}
          | {:error, :billing_disabled | :not_owner | :no_subscription | :razorpay_error | record_error()}
  def sync_billing(%Ctx{} = ctx) do
    with :ok <- ensure_billing_enabled(),
         {:ok, billing} <- get_owned_subscription(ctx) do
      sync_subscription(ctx, billing)
    end
  end

  defp get_owned_billing(%Ctx{} = ctx) do
    with :ok <- ensure_owner(ctx), do: billing_for(ctx.business_id)
  end

  defp get_owned_subscription(%Ctx{} = ctx) do
    with {:ok, billing} <- get_owned_billing(ctx) do
      case billing.razorpay_subscription_id do
        nil -> {:error, :no_subscription}
        _subscription_id -> {:ok, billing}
      end
    end
  end

  defp ensure_checkoutable(%BusinessBilling{cancellation_state: state}) when not is_nil(state),
    do: {:error, :checkout_in_progress}

  defp ensure_checkoutable(%BusinessBilling{status: status}) when status in [:free, :active, :cancelled], do: :ok

  defp ensure_checkoutable(billing), do: unavailable_status(billing)

  defp ensure_cancellable(%BusinessBilling{status: status}) when status in [:active, :past_due], do: :ok

  defp ensure_cancellable(billing), do: unavailable_status(billing)

  defp unavailable_status(billing) do
    {:error, Ecto.Changeset.add_error(Ecto.Changeset.change(billing), :status, "is unavailable for this action")}
  end

  defp sync_subscription(ctx, billing) do
    case claim_interrupted_update(billing.business_id) do
      {:ok, nil} ->
        fetch_subscription_status(ctx, billing)

      {:ok, {billing, intent}} ->
        with {:ok, _result} <- run_checkout_intent(ctx, billing, intent), do: get_billing(ctx)

      error ->
        error
    end
  end

  defp claim_interrupted_update(business_id) do
    cutoff = DateTime.add(DateTime.utc_now(:second), -@request_timeout_seconds)

    Repo.transact(fn ->
      with {:ok, billing} <- lock_business_billing(business_id) do
        query =
          from(intent in CheckoutIntent,
            where: intent.business_id == ^business_id and intent.kind == :update,
            where: intent.status == :unknown or (intent.status == :pending and intent.updated_at <= ^cutoff)
          )

        claim_optional_recovery(billing, Repo.one(query))
      end
    end)
  end

  defp claim_optional_recovery(_billing, nil), do: {:ok, nil}
  defp claim_optional_recovery(billing, intent), do: claim_existing_checkout(billing, intent)

  defp fetch_subscription_status(ctx, billing) do
    with {:ok, snapshot} <- billing_snapshot(billing.business_id),
         {:ok, subscription} <- Razorpay.get_subscription(snapshot.billing.razorpay_subscription_id),
         {:ok, _result} <- sync_apply(snapshot, subscription) do
      get_billing(ctx)
    end
  end

  defp billing_snapshot(business_id) do
    Repo.transact(fn ->
      with {:ok, billing} <- lock_business_billing(business_id) do
        {:ok, %{billing: billing, pending: pending_checkout(business_id, true, true)}}
      end
    end)
  end

  defp sync_apply(snapshot, subscription) do
    Repo.transact(fn ->
      with {:ok, current} <- billing_snapshot(snapshot.billing.business_id),
           :ok <- apply_unchanged_snapshot(snapshot, current, subscription) do
        {:ok, :ok}
      end
    end)
  end

  # Provider reads run outside the lock. Discard a response if a seat change or
  # cancellation advanced billing while the request was in flight.
  defp apply_unchanged_snapshot(snapshot, current, subscription) do
    fields = [:paid_seats, :status, :razorpay_subscription_id, :current_period_end, :cancellation_state]

    if Map.take(snapshot.billing, fields) == Map.take(current.billing, fields) and snapshot.pending == current.pending do
      apply_subscription_state(current.billing, subscription)
    else
      :ok
    end
  end

  @spec handle_razorpay_webhook(binary(), String.t() | nil, String.t() | nil) :: :ok | {:error, Webhook.error()}
  def handle_razorpay_webhook(raw_body, signature, event_id) do
    Webhook.handle(raw_body, signature, event_id, &apply_webhook_event/1)
  end

  defp claim_cancellation(business_id) do
    Repo.transact(fn ->
      with {:ok, billing} <- lock_business_billing(business_id),
           :ok <- ensure_cancellable(billing) do
        claim_locked_cancellation(billing)
      end
    end)
  end

  defp claim_locked_cancellation(%BusinessBilling{cancellation_state: :requested} = billing) do
    if request_expired?(billing.cancellation_requested_at) do
      request_cancellation(billing)
    else
      {:error, :checkout_in_progress}
    end
  end

  defp claim_locked_cancellation(%BusinessBilling{cancellation_state: :accepted} = billing), do: {:ok, billing}

  defp claim_locked_cancellation(billing) do
    if unresolved_checkout?(billing.business_id) do
      {:error, :checkout_in_progress}
    else
      request_cancellation(billing)
    end
  end

  defp request_cancellation(billing) do
    billing
    |> BusinessBilling.update_changeset(%{
      cancellation_state: :requested,
      cancellation_requested_at: DateTime.utc_now(:second)
    })
    |> Repo.update()
  end

  defp do_cancel(ctx, %BusinessBilling{cancellation_state: :accepted} = billing) do
    Repo.transact(fn -> commit_cancellation(ctx, billing.business_id) end)
  end

  defp do_cancel(ctx, billing) do
    case Razorpay.cancel_subscription_at_period_end(billing.razorpay_subscription_id) do
      {:ok, _subscription} ->
        accept_cancellation(ctx, billing.business_id)

      {:error, reason} ->
        persist_cancellation_result(billing.business_id, :unknown)
        {:error, reason}
    end
  end

  defp accept_cancellation(ctx, business_id) do
    with {:ok, _} <- persist_cancellation_result(business_id, :accepted) do
      Repo.transact(fn -> commit_cancellation(ctx, business_id) end)
    end
  end

  defp persist_cancellation_result(business_id, state) do
    Repo.transact(fn ->
      with {:ok, billing} <- lock_business_billing(business_id) do
        update_cancellation_state(billing, state)
      end
    end)
  end

  defp update_cancellation_state(%BusinessBilling{cancellation_state: :requested} = billing, state) do
    billing |> BusinessBilling.update_changeset(%{cancellation_state: state}) |> Repo.update()
  end

  defp update_cancellation_state(billing, _state), do: {:ok, billing}

  defp commit_cancellation(ctx, business_id) do
    with {:ok, billing} <- lock_business_billing(business_id),
         :ok <- apply_cancellation_result(billing) do
      seat_summary(ctx)
    end
  end

  defp apply_cancellation_result(%BusinessBilling{status: status}) when status in [:cancelled, :cancel_at_period_end], do: :ok

  defp apply_cancellation_result(%BusinessBilling{cancellation_state: :accepted} = billing) do
    with {:ok, _billing} <-
           billing |> BusinessBilling.update_changeset(%{status: :cancel_at_period_end, cancellation_state: nil}) |> Repo.update() do
      record_event_result(billing.business_id, :cancellation_scheduled)
    end
  end

  defp apply_cancellation_result(_billing), do: {:error, :checkout_in_progress}

  defp billing_for(business_id) do
    case Repo.get_by(BusinessBilling, business_id: business_id) do
      nil -> {:error, :not_found}
      billing -> {:ok, billing}
    end
  end

  defp owner?(%Ctx{business_id: business_id, user_id: user_id}) do
    Repo.exists?(Business.owned_by(business_id, user_id))
  end

  defp seat_price_inr do
    Application.get_env(:easy, Easy.Razorpay)[:seat_price_inr]
  end

  # --- Razorpay webhook: dedupe + event application ---

  # --- event application; out-of-order guard: only transitions valid for local state ---

  defp apply_webhook_event(%{event: "subscription.charged", subscription: subscription, payment: payment}) do
    with_billing(subscription.id, fn billing ->
      with :ok <- apply_charged_transition(billing, subscription) do
        record_event_result(billing.business_id, :payment_succeeded, payment)
      end
    end)
  end

  defp apply_webhook_event(%{event: event, subscription: subscription})
       when event in ["subscription.pending", "subscription.halted"] do
    with_billing(subscription.id, &apply_past_due_transition/1)
  end

  defp apply_webhook_event(%{event: "subscription.cancelled", subscription: subscription}) do
    with_billing(subscription.id, &apply_cancelled_transition/1)
  end

  defp apply_webhook_event(%{event: "subscription.updated", subscription: subscription}) do
    with_billing(subscription.id, &apply_quantity_transition(&1, subscription.quantity))
  end

  # unrecognized events: receipt already stored, just ack
  defp apply_webhook_event(_params), do: :ok

  @spec apply_subscription_state(BusinessBilling.t(), Payload.subscription()) :: :ok | {:error, record_error()}
  defp apply_subscription_state(billing, subscription) do
    case subscription.status do
      "active" ->
        apply_active_subscription(billing, subscription)

      status when status in ["halted", "pending"] ->
        apply_past_due_transition(billing)

      "authenticated" ->
        :ok

      status when status in ["cancelled", "completed"] ->
        apply_cancelled_transition(billing)

      _other ->
        :ok
    end
  end

  defp apply_active_subscription(billing, subscription), do: apply_charged_transition(billing, subscription)

  defp apply_charged_transition(%BusinessBilling{status: :cancelled}, _subscription), do: :ok

  defp apply_charged_transition(billing, subscription) do
    changeset = BusinessBilling.charge_changeset(billing, subscription.quantity, subscription.current_period_end)

    with :ok <- apply_seat_change(billing, changeset) do
      confirm_pending_checkout(billing, subscription)
    end
  end

  defp confirm_pending_checkout(billing, %{quantity: quantity} = subscription) when is_integer(quantity) do
    # A create with a persisted provider id is waiting for payment. An update
    # stays pending until its original HTTP request has finished; sync/webhooks
    # must not release that guard while an older provider response is in flight.
    from(intent in CheckoutIntent,
      where: intent.business_id == ^billing.business_id and intent.subscription_id == ^subscription.id,
      where: intent.target_quantity == ^subscription.quantity,
      where: intent.status == :unknown or (intent.status == :pending and intent.kind == :create)
    )
    |> Repo.update_all(set: [status: :confirmed, updated_at: DateTime.utc_now(:second)])

    :ok
  end

  defp confirm_pending_checkout(_billing, _subscription), do: :ok

  defp apply_quantity_transition(billing, quantity) when is_integer(quantity) do
    if BusinessBilling.subscribed?(billing) do
      apply_seat_change(billing, BusinessBilling.update_changeset(billing, %{paid_seats: quantity}))
    else
      :ok
    end
  end

  defp apply_quantity_transition(_billing, _quantity), do: :ok

  defp apply_seat_change(billing, changeset) do
    with {:ok, updated} <- Repo.update(changeset) do
      record_seat_change(billing, updated.paid_seats)
    end
  end

  defp apply_past_due_transition(%BusinessBilling{status: status} = billing)
       when status in [:active, :cancel_at_period_end] do
    with {:ok, _billing} <- billing |> BusinessBilling.update_changeset(%{status: :past_due}) |> Repo.update() do
      record_event_result(billing.business_id, :payment_failed)
    end
  end

  defp apply_past_due_transition(_billing), do: :ok

  defp apply_cancelled_transition(%BusinessBilling{status: :cancelled}), do: :ok

  defp apply_cancelled_transition(billing) do
    with {:ok, _updated} <-
           billing
           |> BusinessBilling.update_changeset(%{status: :cancelled, paid_seats: 0, cancellation_state: nil})
           |> Repo.update() do
      confirm_terminal_checkouts(billing)
      record_event_result(billing.business_id, :subscription_cancelled)
    end
  end

  defp confirm_terminal_checkouts(billing) do
    from(intent in CheckoutIntent,
      where: intent.business_id == ^billing.business_id and intent.subscription_id == ^billing.razorpay_subscription_id,
      where: intent.status in [:pending, :unknown]
    )
    |> Repo.update_all(set: [status: :confirmed, updated_at: DateTime.utc_now(:second)])
  end

  # Runs inside the webhook or sync transaction, so the FOR UPDATE lock serializes
  # webhook application against a concurrent sync (see sync_billing).
  defp with_billing(subscription_id, fun) do
    case lock_billing(subscription_id) do
      nil -> :ok
      billing -> fun.(billing)
    end
  end

  defp lock_billing(subscription_id) do
    Repo.one(
      from b in BusinessBilling,
        where: b.razorpay_subscription_id == ^subscription_id,
        lock: "FOR UPDATE"
    )
  end

  defp record_seat_change(%BusinessBilling{paid_seats: old, business_id: business_id}, new) when new != old do
    kind = if new > old, do: :seats_added, else: :seats_removed
    record_event_result(business_id, kind, %{seat_delta: abs(new - old)})
  end

  defp record_seat_change(_billing, _new), do: :ok

  defp record_event_result(business_id, kind, attrs \\ %{}) do
    case record_event(business_id, kind, attrs) do
      {:ok, _event} -> :ok
      {:error, changeset} -> {:error, changeset}
    end
  end
end
