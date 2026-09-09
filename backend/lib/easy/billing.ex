defmodule Easy.Billing do
  import Ecto.Query

  alias Easy.Billing.{BusinessBilling, Event, Webhook}
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs.Business
  alias Easy.Razorpay
  alias Easy.Razorpay.Payload
  alias Easy.Repo

  @type summary :: %{
          required(:status) => BusinessBilling.status(),
          required(:free_seats) => non_neg_integer(),
          required(:paid_seats) => non_neg_integer(),
          required(:seat_limit) => non_neg_integer(),
          required(:used_seats) => non_neg_integer(),
          required(:available_seats) => integer(),
          required(:awaiting_seat_count) => non_neg_integer(),
          required(:monthly_seat_price_inr) => integer() | nil,
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
    with {:ok, billing} <- billing_for(ctx.business_id) do
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
      used = used_seats(business_id)

      {:ok,
       %{
         status: billing.status,
         free_seats: billing.free_seats,
         paid_seats: billing.paid_seats,
         seat_limit: BusinessBilling.seat_limit(billing),
         used_seats: used,
         available_seats: BusinessBilling.available_seats(billing, used),
         awaiting_seat_count: count_awaiting_seat(business_id),
         monthly_seat_price_inr: seat_price_inr(),
         current_period_end: billing.current_period_end,
         is_owner: owner?(ctx)
       }}
    end
  end

  # Runs a seat-consuming write atomically with the capacity check. Locks the
  # business billing row so two concurrent invites/reactivations can't both pass
  # the check and exceed the limit: whichever commits first, the second re-reads
  # the now-higher usage under the same lock and is rejected. No Razorpay call
  # runs here, so no lock is ever held over HTTP.
  @spec reserve_seat(Ctx.t(), (-> {:ok, value} | {:error, reason})) ::
          {:ok, value} | {:error, :seat_limit_reached | record_error() | reason}
        when value: var, reason: var
  def reserve_seat(%Ctx{business_id: business_id}, write) when is_function(write, 0) do
    Repo.transact(fn -> reserve_within_lock(business_id, write) end)
  end

  defp reserve_within_lock(business_id, write) do
    with {:ok, billing} <- lock_business_billing(business_id) do
      if within_seat_limit?(business_id, billing), do: write.(), else: {:error, :seat_limit_reached}
    end
  end

  defp within_seat_limit?(business_id, billing) do
    BusinessBilling.available_seats(billing, used_seats(business_id)) > 0
  end

  # Upsert-lock: INSERT ... ON CONFLICT DO UPDATE both guarantees the row exists
  # and takes a row lock held for the rest of the transaction, so a concurrent
  # reserve_seat for the same business serializes here — even on a business whose
  # billing row did not exist yet.
  defp lock_business_billing(business_id) do
    business_id
    |> BusinessBilling.insert_changeset()
    |> Repo.insert(
      on_conflict: [set: [business_id: business_id]],
      conflict_target: :business_id,
      returning: true
    )
  end

  defp ensure_owner(%Ctx{} = ctx) do
    if owner?(ctx), do: :ok, else: {:error, :not_owner}
  end

  defp ensure_billing_enabled do
    if Application.get_env(:easy, Easy.Razorpay)[:key_id],
      do: :ok,
      else: {:error, :billing_disabled}
  end

  # pending -> active does not change used_seats (pending already counts),
  # so "no capacity at accept" means usage already exceeds the limit
  # (seats were reduced since the invite).
  @spec seat_status_for_invitation(Client.t()) ::
          {:ok, {:active | :inactive, nil | :awaiting_seat}} | {:error, record_error()}
  def seat_status_for_invitation(%Client{business_id: business_id}) do
    with {:ok, billing} <- billing_for(business_id) do
      {:ok, BusinessBilling.invitation_status(billing, used_seats(business_id))}
    end
  end

  defp activate_with_capacity(%BusinessBilling{business_id: business_id} = billing) do
    available = BusinessBilling.available_seats(billing, used_seats(business_id))

    if available > 0 do
      awaiting = Client |> Client.for_business(business_id) |> Client.awaiting_seat()

      ids =
        awaiting
        |> Client.oldest()
        |> limit(^available)
        |> select([client], client.id)
        |> Repo.all()

      {count, _} =
        awaiting
        |> where([client], client.id in ^ids)
        |> Repo.update_all(set: [status: :active, inactive_reason: nil, updated_at: DateTime.utc_now(:second)])

      {:ok, count}
    else
      {:ok, 0}
    end
  end

  defp record_event(business_id, kind, attrs \\ %{}) do
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

  @spec checkout(Ctx.t(), pos_integer()) ::
          {:ok, checkout_result()} | {:error, :billing_disabled | :not_owner | :razorpay_error | record_error()}
  def checkout(%Ctx{} = ctx, seats_to_add) do
    with {:ok, seats_to_add} <- BusinessBilling.parse_seat_increase(seats_to_add),
         :ok <- ensure_billing_enabled(),
         {:ok, billing} <- get_owned_billing(ctx) do
      if BusinessBilling.subscribed?(billing) do
        update_quantity(ctx, billing, seats_to_add)
      else
        # :free or :cancelled — any existing subscription id is stale (never paid, or
        # already cancelled). Start a fresh Razorpay subscription rather than reviving it.
        create_checkout(ctx, billing, billing.paid_seats + seats_to_add)
      end
    end
  end

  @spec cancel(Ctx.t()) ::
          {:ok, summary()} | {:error, :not_owner | :no_subscription | :razorpay_error | record_error()}
  def cancel(%Ctx{} = ctx) do
    with {:ok, billing} <- get_owned_subscription(ctx) do
      do_cancel(ctx, billing)
    end
  end

  @spec sync_billing(Ctx.t()) ::
          {:ok, summary()} | {:error, :not_owner | :no_subscription | :razorpay_error | record_error()}
  def sync_billing(%Ctx{} = ctx) do
    with {:ok, billing} <- get_owned_subscription(ctx) do
      sync_subscription(ctx, billing.razorpay_subscription_id)
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

  defp sync_subscription(ctx, subscription_id) do
    with {:ok, subscription} <- Razorpay.get_subscription(subscription_id),
         {:ok, _result} <- sync_apply(subscription_id, subscription) do
      get_billing(ctx)
    end
  end

  # Lock the billing row so a webhook applying the same charge concurrently can't
  # double-record a seats_added event: whichever commits first wins, the second
  # re-reads the updated paid_seats and record_seat_change no-ops. The transaction
  # opens AFTER the Razorpay fetch (in sync_billing) so no lock is held over HTTP I/O.
  defp sync_apply(subscription_id, subscription) do
    Repo.transact(fn ->
      with :ok <- with_billing(subscription_id, &apply_subscription_state(&1, subscription)) do
        {:ok, :ok}
      end
    end)
  end

  @spec handle_razorpay_webhook(binary(), String.t() | nil, String.t() | nil) :: :ok | {:error, Webhook.error()}
  def handle_razorpay_webhook(raw_body, signature, event_id) do
    Webhook.handle(raw_body, signature, event_id, &apply_webhook_event/1)
  end

  defp create_checkout(ctx, billing, target_quantity) do
    with {:ok, subscription} <- Razorpay.create_subscription(target_quantity),
         {:ok, _billing} <-
           billing
           |> BusinessBilling.update_changeset(%{
             razorpay_subscription_id: subscription.id,
             razorpay_plan_id: subscription.plan_id
           })
           |> Repo.update(),
         {:ok, summary} <- seat_summary(ctx) do
      # paid_seats stays 0 until the webhook confirms payment
      {:ok,
       %{
         action: :checkout,
         checkout: %{key_id: Razorpay.key_id(), subscription_id: subscription.id},
         billing: summary
       }}
    end
  end

  # The Razorpay request stays outside the transaction so no DB lock is held over
  # HTTP; every local write after provider success shares one transaction so a
  # failed event insert can't leave paid_seats committed without its event.
  defp update_quantity(ctx, billing, seats_to_add) do
    target_quantity = billing.paid_seats + seats_to_add

    with {:ok, _} <- Razorpay.update_subscription_quantity(billing.razorpay_subscription_id, target_quantity) do
      Repo.transact(fn -> commit_quantity_update(ctx, billing, target_quantity) end)
    end
  end

  defp commit_quantity_update(ctx, billing, target_quantity) do
    changeset = BusinessBilling.update_changeset(billing, %{paid_seats: target_quantity})

    with :ok <- apply_seat_change(billing, changeset),
         {:ok, summary} <- seat_summary(ctx) do
      {:ok, %{action: :updated, billing: summary}}
    end
  end

  defp do_cancel(ctx, billing) do
    with {:ok, _} <- Razorpay.cancel_subscription_at_period_end(billing.razorpay_subscription_id) do
      Repo.transact(fn -> commit_cancellation(ctx, billing) end)
    end
  end

  defp commit_cancellation(ctx, billing) do
    with {:ok, _billing} <-
           billing |> BusinessBilling.update_changeset(%{status: :cancel_at_period_end}) |> Repo.update(),
         {:ok, _event} <- record_event(billing.business_id, :cancellation_scheduled) do
      seat_summary(ctx)
    end
  end

  defp billing_for(business_id) do
    case fetch_billing(business_id) do
      {:error, :not_found} -> create_default_billing(business_id)
      result -> result
    end
  end

  defp fetch_billing(business_id) do
    case Repo.get_by(BusinessBilling, business_id: business_id) do
      nil -> {:error, :not_found}
      billing -> {:ok, billing}
    end
  end

  defp create_default_billing(business_id) do
    with {:ok, _billing} <-
           business_id
           |> BusinessBilling.insert_changeset()
           |> Repo.insert(on_conflict: :nothing, conflict_target: [:business_id]) do
      fetch_billing(business_id)
    end
  end

  defp used_seats(business_id) do
    Client
    |> Client.for_business(business_id)
    |> Client.occupying_seat()
    |> Repo.aggregate(:count, :id)
  end

  defp count_awaiting_seat(business_id) do
    Client
    |> Client.for_business(business_id)
    |> Client.awaiting_seat()
    |> Repo.aggregate(:count, :id)
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
      status when status in ["active", "authenticated"] ->
        apply_charged_transition(billing, subscription)

      status when status in ["halted", "pending"] ->
        apply_past_due_transition(billing)

      status when status in ["cancelled", "completed"] ->
        apply_cancelled_transition(billing)

      _other ->
        :ok
    end
  end

  defp apply_charged_transition(billing, subscription) do
    changeset = BusinessBilling.charge_changeset(billing, subscription.quantity, subscription.current_period_end)
    apply_seat_change(billing, changeset)
  end

  defp apply_quantity_transition(billing, quantity) when is_integer(quantity) do
    if BusinessBilling.subscribed?(billing) do
      apply_seat_change(billing, BusinessBilling.update_changeset(billing, %{paid_seats: quantity}))
    else
      :ok
    end
  end

  defp apply_quantity_transition(_billing, _quantity), do: :ok

  defp apply_seat_change(billing, changeset) do
    with {:ok, updated} <- Repo.update(changeset),
         :ok <- record_seat_change(billing, updated.paid_seats),
         {:ok, _count} <- activate_with_capacity(updated) do
      :ok
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
    with {:ok, _billing} <-
           billing
           |> BusinessBilling.update_changeset(%{status: :cancelled, paid_seats: 0})
           |> Repo.update() do
      record_event_result(billing.business_id, :subscription_cancelled)
    end
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
