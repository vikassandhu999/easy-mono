defmodule Easy.Tenant.Price do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "business_plan_prices" do
    field :currency_code, :string
    field :amount, :string

    belongs_to :plan, Easy.Tenant.Plan, foreign_key: :plan_id

    timestamps(type: :utc_datetime_usec)
  end

  @doc false
  def changeset(price, attrs) do
    price
    |> cast(attrs, [:currency_code, :amount, :plan_id])
    |> validate_required([:currency_code, :amount, :plan_id])
    |> validate_length(:currency_code, is: 3)
    |> unique_constraint([:plan_id, :currency_code],
      name: :idx_business_plan_prices_plan_currency
    )
  end
end
