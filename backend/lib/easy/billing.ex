defmodule Easy.Billing do
  import Ecto.Query

  alias Easy.Billing.{BusinessBilling, Event}
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs.Business
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
