defmodule Easy.Tenant.Subscription do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:business_id, :binary_id, autogenerate: false}
  @foreign_key_type :binary_id

  schema "business_subscriptions" do
    field :max_active_clients, :integer, default: 0
    field :status, :integer, default: 1
    field :trial_start_date, :utc_datetime_usec
    field :trial_end_date, :utc_datetime_usec
    field :start_date, :utc_datetime_usec
    field :renewal_open_date, :utc_datetime_usec
    field :end_date, :utc_datetime_usec
    field :ended_at, :utc_datetime_usec
    field :ended_with_reason, :string, default: ""
    field :active_clients, :integer, default: 0

    belongs_to :plan, Easy.Tenant.Plan, foreign_key: :plan_id
    field :latest_change_id, :binary_id
    field :pending_change_id, :binary_id

    timestamps(type: :utc_datetime_usec)
  end

  @statuses %{
    incomplete: 1,
    incomplete_expired: 2,
    trialing: 3,
    active: 4,
    canceled: 5
  }

  def status_values, do: @statuses

  def status_name(status_int) when is_integer(status_int) do
    Enum.find_value(@statuses, fn {name, value} ->
      if value == status_int, do: name
    end)
  end

  @doc false
  def changeset(subscription, attrs) do
    subscription
    |> cast(attrs, [
      :business_id,
      :plan_id,
      :max_active_clients,
      :status,
      :trial_start_date,
      :trial_end_date,
      :start_date,
      :renewal_open_date,
      :end_date,
      :ended_at,
      :ended_with_reason,
      :latest_change_id,
      :pending_change_id,
      :active_clients
    ])
    |> validate_required([:business_id, :plan_id, :max_active_clients, :status])
    |> validate_number(:max_active_clients, greater_than_or_equal_to: 0)
    |> validate_number(:active_clients, greater_than_or_equal_to: 0)
    |> validate_inclusion(:status, Map.values(@statuses))
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:plan_id)
  end
end
