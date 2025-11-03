defmodule Easy.Tenant.Plan do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, Ecto.UUID, autogenerate: true}
  @foreign_key_type Ecto.UUID

  schema "business_plans" do
    field :name, :string
    field :is_default, :boolean, default: false
    field :max_active_clients, :integer, default: 0

    has_many :prices, Easy.Tenant.Price, foreign_key: :plan_id

    timestamps(type: :utc_datetime_usec)
  end

  @doc false
  def changeset(plan, attrs) do
    plan
    |> cast(attrs, [:name, :is_default, :max_active_clients])
    |> validate_required([:name, :max_active_clients])
    |> validate_number(:max_active_clients, greater_than_or_equal_to: 0)
  end
end
