defmodule Easy.Organizations.Subscription do
  @moduledoc """
  Subscription schema linking businesses to plans.

  Tracks subscription status, billing periods, and cancellation.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "subscriptions" do
    field :status, :string
    field :started_at, :utc_datetime
    field :current_period_start, :utc_datetime
    field :current_period_end, :utc_datetime
    field :cancelled_at, :utc_datetime

    belongs_to :business, Easy.Organizations.Business
    belongs_to :plan, Easy.Organizations.Plan

    timestamps()
  end

  @doc """
  Changeset for creating or updating a subscription.
  """
  def changeset(subscription, attrs) do
    subscription
    |> cast(attrs, [
      :status,
      :started_at,
      :current_period_start,
      :current_period_end,
      :cancelled_at,
      :business_id,
      :plan_id
    ])
    |> validate_required([
      :status,
      :started_at,
      :current_period_start,
      :current_period_end,
      :business_id,
      :plan_id
    ])
    |> validate_inclusion(:status, ["active", "cancelled", "expired"])
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:plan_id)
  end

  @doc """
  Changeset for creating a new subscription.
  Sets default values for a new subscription.
  """
  def create_changeset(subscription, business_id, plan_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)
    period_end = DateTime.add(now, 30 * 24 * 60 * 60, :second)

    attrs = %{
      status: "active",
      started_at: now,
      current_period_start: now,
      current_period_end: period_end,
      business_id: business_id,
      plan_id: plan_id
    }

    changeset(subscription, attrs)
  end
end
