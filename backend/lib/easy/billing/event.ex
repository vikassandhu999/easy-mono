defmodule Easy.Billing.Event do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @kinds [:seats_added, :seats_removed, :payment_succeeded, :payment_failed, :cancellation_scheduled, :subscription_cancelled]

  schema "billing_events" do
    field :kind, Ecto.Enum, values: @kinds
    field :seat_delta, :integer
    field :amount_paid, :integer
    field :currency, :string
    field :occurred_at, :utc_datetime
    field :metadata, :map

    belongs_to :business, Easy.Orgs.Business

    timestamps(type: :utc_datetime, updated_at: false)
  end

  def kinds, do: @kinds
end
