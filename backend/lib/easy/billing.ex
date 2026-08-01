defmodule Easy.Billing do
  import Ecto.Query

  alias Easy.Billing.{BusinessBilling, Event, WebhookReceipt}
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs.Business
  alias Easy.Razorpay
  alias Easy.Repo

  @used_statuses [:active, :pending]

  # Console-only admin op. In IEx:
  # Easy.Billing.grant_free_seats(Easy.Ctx.new("<business-id>", "<owner-user-id>"), 5)
  @spec grant_free_seats(Ctx.t(), non_neg_integer()) ::
          {:ok, BusinessBilling.t()} | {:error, Ecto.Changeset.t()}
  def grant_free_seats(%Ctx{} = ctx, free_seats) do
    ctx.business_id
    |> billing_for()
    |> BusinessBilling.update_changeset(%{free_seats: free_seats})
    |> Repo.update()
  end

  @spec get_billing(Ctx.t()) :: {:ok, map()}
  def get_billing(%Ctx{} = ctx) do
    {:ok, ctx |> seat_summary() |> Map.put(:recent_events, recent_events(ctx.business_id))}
  end

  defp seat_summary(%Ctx{business_id: business_id} = ctx) do
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
      awaiting_seat_count: count_awaiting_seat(business_id),
      monthly_seat_price_inr: seat_price_inr(),
      current_period_end: billing.current_period_end,
      is_owner: owner?(ctx)
    }
  end

  # Runs a seat-consuming write atomically with the capacity check. Locks the
  # business billing row so two concurrent invites/reactivations can't both pass
  # the check and exceed the limit: whichever commits first, the second re-reads
  # the now-higher usage under the same lock and is rejected. No Razorpay call
  # runs here, so no lock is ever held over HTTP.
  @spec reserve_seat(Ctx.t(), (-> {:ok, term()} | {:error, term()})) ::
          {:ok, term()} | {:error, :seat_limit_reached | term()}
  def reserve_seat(%Ctx{business_id: business_id}, write) when is_function(write, 0) do
    Repo.transaction(fn -> reserve_within_lock(business_id, write) end)
  end

  defp reserve_within_lock(business_id, write) do
    billing = lock_business_billing(business_id)

    if within_seat_limit?(business_id, billing) do
      case write.() do
        {:ok, value} -> value
        {:error, reason} -> Repo.rollback(reason)
      end
    else
      Repo.rollback(:seat_limit_reached)
    end
  end

  defp within_seat_limit?(business_id, billing) do
    used_seats(business_id) < billing.free_seats + billing.paid_seats
  end

  # Upsert-lock: INSERT ... ON CONFLICT DO UPDATE both guarantees the row exists
  # and takes a row lock held for the rest of the transaction, so a concurrent
  # reserve_seat for the same business serializes here — even on a business whose
  # billing row did not exist yet.
  defp lock_business_billing(business_id) do
    {:ok, billing} =
      business_id
      |> BusinessBilling.insert_changeset()
      |> Repo.insert(
        on_conflict: [set: [business_id: business_id]],
        conflict_target: :business_id,
        returning: true
      )

    billing
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
  @spec seat_status_for_invitation(Client.t()) :: {:ok, {:active | :inactive, nil | :awaiting_seat}}
  def seat_status_for_invitation(%Client{business_id: business_id}) do
    status =
      if over_capacity?(business_id),
        do: {:inactive, :awaiting_seat},
        else: {:active, nil}

    {:ok, status}
  end

  defp over_capacity?(business_id) do
    billing = billing_for(business_id)
    used_seats(business_id) > billing.free_seats + billing.paid_seats
  end

  defp activate_awaiting_clients_for_business(business_id) do
    billing = billing_for(business_id)
    available = billing.free_seats + billing.paid_seats - used_seats(business_id)

    if available > 0 do
      ids =
        Repo.all(
          from c in Client,
            where:
              c.business_id == ^business_id and c.status == :inactive and
                c.inactive_reason == :awaiting_seat,
            order_by: [asc: c.inserted_at, asc: c.id],
            limit: ^available,
            select: c.id
        )

      {count, _} =
        Repo.update_all(
          from(c in Client,
            where:
              c.business_id == ^business_id and c.id in ^ids and c.status == :inactive and
                c.inactive_reason == :awaiting_seat
          ),
          set: [status: :active, inactive_reason: nil, updated_at: DateTime.utc_now(:second)]
        )

      {:ok, count}
    else
      {:ok, 0}
    end
  end

  defp record_event(business_id, kind, attrs \\ %{}) do
    Repo.insert(%Event{
      business_id: business_id,
      kind: kind,
      seat_delta: attrs[:seat_delta],
      amount_paid: attrs[:amount_paid],
      currency: attrs[:currency],
      occurred_at: attrs[:occurred_at] || DateTime.utc_now(:second),
      metadata: attrs[:metadata]
    })
  end

  defp recent_events(business_id) do
    Repo.all(
      from e in Event,
        where: e.business_id == ^business_id,
        order_by: [desc: e.occurred_at, desc: e.id],
        limit: 10
    )
  end

  @spec checkout(Ctx.t(), pos_integer()) ::
          {:ok, map()} | {:error, :billing_disabled | :not_owner | :razorpay_error}
  def checkout(%Ctx{business_id: business_id} = ctx, seats_to_add)
      when is_integer(seats_to_add) and seats_to_add > 0 do
    with :ok <- ensure_billing_enabled(),
         :ok <- ensure_owner(ctx) do
      billing = billing_for(business_id)
      target_quantity = billing.paid_seats + seats_to_add

      if billing.status in [:active, :past_due, :cancel_at_period_end] do
        update_quantity(ctx, billing, billing.razorpay_subscription_id, target_quantity, seats_to_add)
      else
        # :free or :cancelled — any existing subscription id is stale (never paid, or
        # already cancelled). Start a fresh Razorpay subscription rather than reviving it.
        create_checkout(ctx, billing, target_quantity)
      end
    end
  end

  @spec cancel(Ctx.t()) ::
          {:ok, map()} | {:error, :not_owner} | {:error, :no_subscription} | {:error, :razorpay_error}
  def cancel(%Ctx{business_id: business_id} = ctx) do
    with :ok <- ensure_owner(ctx) do
      billing = billing_for(business_id)

      case billing.razorpay_subscription_id do
        nil -> {:error, :no_subscription}
        subscription_id -> do_cancel(ctx, billing, subscription_id)
      end
    end
  end

  @spec sync_billing(Ctx.t()) ::
          {:ok, map()} | {:error, :not_owner | :no_subscription | :razorpay_error | Ecto.Changeset.t()}
  def sync_billing(%Ctx{business_id: business_id} = ctx) do
    with :ok <- ensure_owner(ctx) do
      billing = billing_for(business_id)

      case billing.razorpay_subscription_id do
        nil ->
          {:error, :no_subscription}

        subscription_id ->
          sync_subscription(ctx, subscription_id)
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
    Repo.transaction(fn ->
      case lock_billing(subscription_id) do
        nil -> :ok
        billing -> apply_subscription_state(billing, subscription)
      end
    end)
  end

  @spec handle_razorpay_webhook(binary(), String.t() | nil, String.t() | nil) ::
          :ok
          | {:error, :invalid_webhook_signature | :duplicate_webhook | :invalid_webhook_payload}
  def handle_razorpay_webhook(raw_body, signature, event_id) do
    with true <- Razorpay.valid_webhook_signature?(raw_body, signature),
         {:ok, params} <- Jason.decode(raw_body) do
      claim_and_apply(event_id || fallback_event_id(raw_body), params)
    else
      false -> {:error, :invalid_webhook_signature}
      {:error, %Jason.DecodeError{}} -> {:error, :invalid_webhook_signature}
    end
  end

  # Claiming the receipt and applying the event are both DB-only, so wrap them in one
  # transaction: if apply_webhook_event fails on a malformed payload, the receipt claim
  # rolls back too so the same event id can be retried instead of being silently
  # deduped and dropped.
  defp claim_and_apply(event_id, params) do
    Repo.transaction(fn ->
      with :ok <- claim_receipt(event_id, params["event"]),
           :ok <- apply_webhook_event(params) do
        :ok
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
    |> case do
      {:ok, :ok} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  defp create_checkout(ctx, billing, target_quantity) do
    with {:ok, subscription} <- Razorpay.create_subscription(target_quantity),
         {:ok, _billing} <-
           billing
           |> BusinessBilling.update_changeset(%{
             razorpay_subscription_id: subscription["id"],
             razorpay_plan_id: subscription["plan_id"]
           })
           |> Repo.update() do
      # paid_seats stays 0 until the webhook confirms payment
      {:ok,
       %{
         action: :checkout,
         checkout: %{key_id: Razorpay.key_id(), subscription_id: subscription["id"]},
         billing: seat_summary(ctx)
       }}
    end
  end

  # The Razorpay request stays outside the transaction so no DB lock is held over
  # HTTP; every local write after provider success shares one transaction so a
  # failed event insert can't leave paid_seats committed without its event.
  defp update_quantity(ctx, billing, subscription_id, target_quantity, seats_to_add) do
    with {:ok, _} <- Razorpay.update_subscription_quantity(subscription_id, target_quantity) do
      Repo.transaction(fn -> commit_quantity_update(ctx, billing, target_quantity, seats_to_add) end)
    end
  end

  defp commit_quantity_update(ctx, billing, target_quantity, seats_to_add) do
    with {:ok, _billing} <-
           billing |> BusinessBilling.update_changeset(%{paid_seats: target_quantity}) |> Repo.update(),
         {:ok, _event} <- record_event(billing.business_id, :seats_added, %{seat_delta: seats_to_add}),
         {:ok, _count} <- activate_awaiting_clients_for_business(billing.business_id) do
      %{action: :updated, billing: seat_summary(ctx)}
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp do_cancel(ctx, billing, subscription_id) do
    with {:ok, _} <- Razorpay.cancel_subscription_at_period_end(subscription_id) do
      Repo.transaction(fn -> commit_cancellation(ctx, billing) end)
    end
  end

  defp commit_cancellation(ctx, billing) do
    with {:ok, _billing} <-
           billing |> BusinessBilling.update_changeset(%{status: :cancel_at_period_end}) |> Repo.update(),
         {:ok, _event} <- record_event(billing.business_id, :cancellation_scheduled) do
      seat_summary(ctx)
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp billing_for(business_id) do
    Repo.get_by(BusinessBilling, business_id: business_id) || create_default_billing(business_id)
  end

  defp create_default_billing(business_id) do
    business_id
    |> BusinessBilling.insert_changeset()
    |> Repo.insert(
      on_conflict: :nothing,
      conflict_target: [:business_id]
    )

    Repo.get_by(BusinessBilling, business_id: business_id)
  end

  defp used_seats(business_id) do
    Repo.one(
      from c in Client,
        where: c.business_id == ^business_id and c.status in ^@used_statuses,
        select: count(c.id)
    )
  end

  defp count_awaiting_seat(business_id) do
    Repo.one(
      from c in Client,
        where:
          c.business_id == ^business_id and c.status == :inactive and
            c.inactive_reason == :awaiting_seat,
        select: count(c.id)
    )
  end

  defp owner?(%Ctx{business_id: business_id, user_id: user_id}) do
    Repo.exists?(from b in Business, where: b.id == ^business_id and b.owner_id == ^user_id)
  end

  defp seat_price_inr do
    Application.get_env(:easy, Easy.Razorpay)[:seat_price_inr]
  end

  # --- Razorpay webhook: dedupe + event application ---

  defp claim_receipt(event_id, event_type) do
    {count, _} =
      Repo.insert_all(
        WebhookReceipt,
        [
          %{
            id: Ecto.UUID.generate(),
            razorpay_event_id: event_id,
            event_type: event_type || "unknown",
            processed_at: DateTime.utc_now(:second),
            inserted_at: DateTime.utc_now(:second)
          }
        ],
        on_conflict: :nothing,
        conflict_target: [:razorpay_event_id]
      )

    if count == 1, do: :ok, else: {:error, :duplicate_webhook}
  end

  defp fallback_event_id(raw_body), do: "sha:" <> Base.encode16(:crypto.hash(:sha256, raw_body), case: :lower)

  # --- event application; out-of-order guard: only transitions valid for local state ---

  defp apply_webhook_event(%{"event" => "subscription.charged", "payload" => payload}) do
    subscription = subscription_entity(payload)
    payment = payment_entity(payload)

    with_recognized_subscription(payload, fn billing ->
      apply_charged_transition(billing, subscription)

      record_event_or_rollback(billing.business_id, :payment_succeeded, %{
        amount_paid: payment["amount"] && div(payment["amount"], 100),
        currency: payment["currency"]
      })

      :ok
    end)
  end

  defp apply_webhook_event(%{"event" => event, "payload" => payload})
       when event in ["subscription.pending", "subscription.halted"] do
    with_recognized_subscription(payload, fn billing ->
      apply_past_due_transition(billing)
      :ok
    end)
  end

  defp apply_webhook_event(%{"event" => "subscription.cancelled", "payload" => payload}) do
    with_recognized_subscription(payload, fn billing ->
      apply_cancelled_transition(billing)
      :ok
    end)
  end

  defp apply_webhook_event(%{"event" => "subscription.updated", "payload" => payload}) do
    subscription = subscription_entity(payload)

    with_recognized_subscription(payload, fn billing ->
      if billing.status in [:active, :past_due, :cancel_at_period_end] and is_integer(subscription["quantity"]) do
        record_seat_change(billing, subscription["quantity"])

        billing
        |> BusinessBilling.update_changeset(%{paid_seats: subscription["quantity"]})
        |> persist_or_rollback()

        activate_awaiting_clients_for_business(billing.business_id)
      end

      :ok
    end)
  end

  # unrecognized events: receipt already stored, just ack
  defp apply_webhook_event(_params), do: :ok

  # tolerates a missing/malformed "subscription"/"entity" map — returns %{} so callers'
  # bracket access (e.g. subscription["id"]) safely yields nil instead of crashing
  defp subscription_entity(%{"subscription" => %{"entity" => entity}}) when is_map(entity), do: entity
  defp subscription_entity(_payload), do: %{}

  defp payment_entity(%{"payment" => %{"entity" => entity}}) when is_map(entity), do: entity
  defp payment_entity(_payload), do: %{}

  defp safe_unix(ts) when is_integer(ts) do
    case DateTime.from_unix(ts) do
      {:ok, dt} -> dt
      {:error, _} -> nil
    end
  end

  defp safe_unix(_ts), do: nil

  # --- Razorpay sync-on-demand: applies the same transitions the webhook does,
  # from the bare subscription entity ("status" at top level, not payload-wrapped).

  @spec apply_subscription_state(BusinessBilling.t(), map()) :: :ok
  defp apply_subscription_state(billing, subscription) do
    case subscription["status"] do
      status when status in ["active", "authenticated"] ->
        apply_charged_transition(billing, subscription)
        :ok

      status when status in ["halted", "pending"] ->
        apply_past_due_transition(billing)
        :ok

      status when status in ["cancelled", "completed"] ->
        apply_cancelled_transition(billing)
        :ok

      _other ->
        :ok
    end
  end

  defp apply_charged_transition(billing, subscription) do
    quantity = subscription["quantity"] || billing.paid_seats
    # preserve a cancellation already scheduled by the owner; a charge on the
    # current cycle doesn't undo it
    status = if billing.status == :cancel_at_period_end, do: :cancel_at_period_end, else: :active

    billing
    |> BusinessBilling.update_changeset(%{
      paid_seats: quantity,
      status: status,
      current_period_end: safe_unix(subscription["current_end"])
    })
    |> persist_or_rollback()

    record_seat_change(billing, quantity)
    activate_awaiting_clients_for_business(billing.business_id)
  end

  defp apply_past_due_transition(billing) do
    if billing.status in [:active, :cancel_at_period_end] do
      billing |> BusinessBilling.update_changeset(%{status: :past_due}) |> persist_or_rollback()
      record_event_or_rollback(billing.business_id, :payment_failed)
    end
  end

  defp apply_cancelled_transition(billing) do
    if billing.status != :cancelled do
      billing
      |> BusinessBilling.update_changeset(%{status: :cancelled, paid_seats: 0})
      |> persist_or_rollback()

      record_event_or_rollback(billing.business_id, :subscription_cancelled)
    end
  end

  # A recognized event must carry a subscription id. A missing or malformed entity
  # is an invalid payload, not something to acknowledge — return an error so the
  # receipt claim rolls back and the same event id can be retried. A valid id we
  # simply have no row for is still acked (fun no-ops), e.g. before checkout saved it.
  defp with_recognized_subscription(payload, fun) do
    case subscription_entity(payload)["id"] do
      nil -> {:error, :invalid_webhook_payload}
      subscription_id -> with_billing(subscription_id, fun)
    end
  end

  # Runs inside claim_and_apply's transaction, so the FOR UPDATE lock serializes
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
    record_event_or_rollback(business_id, kind, %{seat_delta: abs(new - old)})
  end

  defp record_seat_change(_billing, _new), do: :ok

  defp record_event_or_rollback(business_id, kind, attrs \\ %{}) do
    case record_event(business_id, kind, attrs) do
      {:ok, _event} -> :ok
      {:error, changeset} -> Repo.rollback(changeset)
    end
  end

  defp persist_or_rollback(changeset) do
    case Repo.update(changeset) do
      {:ok, value} -> value
      {:error, changeset} -> Repo.rollback(changeset)
    end
  end
end
