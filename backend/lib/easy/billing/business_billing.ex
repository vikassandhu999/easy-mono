defmodule Easy.Billing.BusinessBilling do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses [:free, :active, :past_due, :cancel_at_period_end, :cancelled]

  schema "business_billing" do
    field :free_seats, :integer, default: 2
    field :paid_seats, :integer, default: 0
    field :status, Ecto.Enum, values: @statuses, default: :free
    field :razorpay_subscription_id, :string
    field :razorpay_plan_id, :string
    field :current_period_end, :utc_datetime

    belongs_to :business, Easy.Orgs.Business

    timestamps(type: :utc_datetime)
  end

  def statuses, do: @statuses

  def changeset(billing, attrs) do
    billing
    |> cast(attrs, [:free_seats, :paid_seats, :status, :razorpay_subscription_id, :razorpay_plan_id, :current_period_end])
    |> validate_number(:free_seats, greater_than_or_equal_to: 0)
    |> validate_number(:paid_seats, greater_than_or_equal_to: 0)
  end
end
