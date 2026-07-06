defmodule Easy.Repo.Migrations.CreateBilling do
  use Ecto.Migration

  def change do
    create table(:business_billing, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :free_seats, :integer, null: false, default: 2
      add :paid_seats, :integer, null: false, default: 0
      add :status, :string, null: false, default: "free"
      add :razorpay_subscription_id, :string
      add :razorpay_plan_id, :string
      add :current_period_end, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create unique_index(:business_billing, [:business_id])
    create index(:business_billing, [:razorpay_subscription_id])

    create table(:billing_events, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :kind, :string, null: false
      add :seat_delta, :integer
      add :amount_paid, :integer
      add :currency, :string
      add :occurred_at, :utc_datetime, null: false
      add :metadata, :map

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:billing_events, [:business_id, :occurred_at])

    create table(:billing_webhook_receipts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :razorpay_event_id, :string, null: false
      add :event_type, :string, null: false
      add :processed_at, :utc_datetime

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create unique_index(:billing_webhook_receipts, [:razorpay_event_id])
  end
end
