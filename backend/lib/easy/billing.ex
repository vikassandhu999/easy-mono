defmodule Easy.Billing do
  import Ecto.Query

  alias Easy.Billing.{BusinessBilling, Event}
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

      case billing.razorpay_subscription_id do
        nil -> create_checkout(ctx, billing, target_quantity)
        subscription_id -> update_quantity(ctx, billing, subscription_id, target_quantity, seats_to_add)
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
end
