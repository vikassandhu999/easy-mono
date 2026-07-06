defmodule Easy.Billing.WebhookReceipt do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "billing_webhook_receipts" do
    field :razorpay_event_id, :string
    field :event_type, :string
    field :processed_at, :utc_datetime

    timestamps(type: :utc_datetime, updated_at: false)
  end
end
