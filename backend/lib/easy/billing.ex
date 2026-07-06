defmodule Easy.Billing do
  import Ecto.Query

  alias Easy.Billing.{BusinessBilling, Event, WebhookReceipt}
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs.Business
  alias Easy.Razorpay
  alias Easy.Repo

  @used_statuses [:active, :pending]

  @spec billing_for(Ecto.UUID.t()) :: BusinessBilling.t()
  def billing_for(business_id) do
    Repo.get_by(BusinessBilling, business_id: business_id) ||
      create_default_billing(business_id)
  end

  @spec seat_summary(Ctx.t()) :: map()
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

  @spec ensure_seat_available(Ctx.t()) :: :ok | {:error, :seat_limit_reached}
  def ensure_seat_available(%Ctx{business_id: business_id}) do
    billing = billing_for(business_id)

    if used_seats(business_id) < billing.free_seats + billing.paid_seats do
      :ok
    else
      {:error, :seat_limit_reached}
    end
  end

  @spec ensure_owner(Ctx.t()) :: :ok | {:error, :not_owner}
  def ensure_owner(%Ctx{} = ctx) do
    if owner?(ctx), do: :ok, else: {:error, :not_owner}
  end

  # pending -> active does not change used_seats (pending already counts),
  # so "no capacity at accept" means usage already exceeds the limit
  # (seats were reduced since the invite).
  @spec over_capacity?(Ecto.UUID.t()) :: boolean()
  def over_capacity?(business_id) do
    billing = billing_for(business_id)
    used_seats(business_id) > billing.free_seats + billing.paid_seats
  end

  @spec activate_awaiting_clients(Ecto.UUID.t()) :: {:ok, non_neg_integer()}
  def activate_awaiting_clients(business_id) do
    billing = billing_for(business_id)
    available = billing.free_seats + billing.paid_seats - used_seats(business_id)

    if available > 0 do
      ids =
        Repo.all(
          from c in Client,
            where: c.business_id == ^business_id and c.status == ^:awaiting_seat,
            order_by: [asc: c.inserted_at, asc: c.id],
            limit: ^available,
            select: c.id
        )

      {count, _} =
        Repo.update_all(
          from(c in Client, where: c.id in ^ids and c.status == ^:awaiting_seat),
          set: [status: :active, updated_at: DateTime.utc_now(:second)]
        )

      {:ok, count}
    else
      {:ok, 0}
    end
  end

  @spec record_event(Ecto.UUID.t(), atom(), map()) :: Event.t()
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

  @spec recent_events(Ctx.t()) :: [Event.t()]
  def recent_events(%Ctx{business_id: business_id}) do
    Repo.all(
      from e in Event,
        where: e.business_id == ^business_id,
        order_by: [desc: e.occurred_at, desc: e.id],
        limit: 10
    )
  end

  @spec checkout(Ctx.t(), pos_integer()) ::
          {:ok, map()} | {:error, :not_owner} | {:error, :razorpay_error}
  def checkout(%Ctx{business_id: business_id} = ctx, seats_to_add)
      when is_integer(seats_to_add) and seats_to_add > 0 do
    with :ok <- ensure_owner(ctx) do
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

  @spec handle_razorpay_webhook(binary(), String.t() | nil, String.t() | nil) ::
          :ok | {:error, :invalid_webhook_signature} | {:error, :duplicate_webhook}
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
  # transaction: if apply_webhook_event crashes on a malformed payload, the receipt claim
  # rolls back too and the (unmodified) retry is not silently deduped and dropped.
  defp claim_and_apply(event_id, params) do
    Repo.transaction(fn ->
      case claim_receipt(event_id, params["event"]) do
        :ok -> apply_webhook_event(params)
        {:error, :duplicate_webhook} -> Repo.rollback(:duplicate_webhook)
      end
    end)
    |> case do
      {:ok, :ok} -> :ok
      {:error, :duplicate_webhook} -> {:error, :duplicate_webhook}
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

  defp do_cancel(ctx, billing, subscription_id) do
    with {:ok, _} <- Razorpay.cancel_subscription_at_period_end(subscription_id) do
      billing
      |> BusinessBilling.changeset(%{status: :cancel_at_period_end})
      |> Repo.update!()

      record_event(billing.business_id, :cancellation_scheduled)
      {:ok, seat_summary(ctx)}
    end
  end

  defp create_default_billing(business_id) do
    Repo.insert!(%BusinessBilling{business_id: business_id},
      on_conflict: :nothing,
      conflict_target: [:business_id]
    )

    Repo.get_by!(BusinessBilling, business_id: business_id)
  end

  defp used_seats(business_id) do
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

    with_billing(subscription["id"], fn billing ->
      quantity = subscription["quantity"] || billing.paid_seats
      # preserve a cancellation already scheduled by the owner; a charge on the
      # current cycle doesn't undo it
      status = if billing.status == :cancel_at_period_end, do: :cancel_at_period_end, else: :active

      billing
      |> BusinessBilling.changeset(%{
        paid_seats: quantity,
        status: status,
        current_period_end: safe_unix(subscription["current_end"])
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
    with_billing(subscription_entity(payload)["id"], fn billing ->
      if billing.status in [:active, :cancel_at_period_end] do
        billing |> BusinessBilling.changeset(%{status: :past_due}) |> Repo.update!()
        record_event(billing.business_id, :payment_failed)
      end

      :ok
    end)
  end

  defp apply_webhook_event(%{"event" => "subscription.cancelled", "payload" => payload}) do
    with_billing(subscription_entity(payload)["id"], fn billing ->
      if billing.status != :cancelled do
        billing |> BusinessBilling.changeset(%{status: :cancelled, paid_seats: 0}) |> Repo.update!()
        record_event(billing.business_id, :subscription_cancelled)
      end

      :ok
    end)
  end

  defp apply_webhook_event(%{"event" => "subscription.updated", "payload" => payload}) do
    subscription = subscription_entity(payload)

    with_billing(subscription["id"], fn billing ->
      if billing.status in [:active, :past_due, :cancel_at_period_end] and is_integer(subscription["quantity"]) do
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

  defp with_billing(nil, _fun), do: :ok

  defp with_billing(subscription_id, fun) do
    case Repo.get_by(BusinessBilling, razorpay_subscription_id: subscription_id) do
      nil -> :ok
      billing -> fun.(billing)
    end
  end

  defp record_seat_change(%BusinessBilling{paid_seats: old, business_id: business_id}, new) when new != old do
    kind = if new > old, do: :seats_added, else: :seats_removed
    record_event(business_id, kind, %{seat_delta: abs(new - old)})
  end

  defp record_seat_change(_billing, _new), do: :ok
end
