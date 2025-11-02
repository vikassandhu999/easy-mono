defmodule Easy.Tenant.SubscriptionChange do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "business_subscription_changes" do
    field :business_id, :binary_id
    field :plan_id, :binary_id
    field :old_plan_id, :binary_id
    field :status, :integer, default: 1
    field :phase, :integer
    field :currency_code, :string
    field :prorated_amount, :string
    field :prorated_days, :integer
    field :billing_amount, :string
    field :billing_days, :integer
    field :start_date, :utc_datetime_usec
    field :valid_until, :utc_datetime_usec
    field :payment_id, :binary_id

    timestamps(type: :utc_datetime_usec)
  end

  @doc false
  def changeset(change, attrs) do
    change
    |> cast(attrs, [
      :business_id,
      :plan_id,
      :old_plan_id,
      :status,
      :phase,
      :currency_code,
      :prorated_amount,
      :prorated_days,
      :billing_amount,
      :billing_days,
      :start_date,
      :valid_until,
      :payment_id
    ])
    |> validate_required([
      :business_id,
      :plan_id,
      :old_plan_id,
      :status,
      :phase,
      :currency_code,
      :start_date,
      :valid_until
    ])
    |> validate_length(:currency_code, is: 3)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:plan_id)
    |> foreign_key_constraint(:old_plan_id)
  end
end
