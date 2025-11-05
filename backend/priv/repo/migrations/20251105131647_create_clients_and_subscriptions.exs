defmodule Easy.Repo.Migrations.CreateClientsAndSubscriptions do
  use Ecto.Migration

  def up do
    # ============================================
    # 1. CLIENTS TABLE
    # ============================================
    create table(:clients, primary_key: false) do
      add :id, :binary_id, primary_key: true

      # Identity
      add :name, :string, null: false

      # Contact info
      add :email, :string
      add :phone, :string

      # Invitation fields (for clients not yet registered)
      add :invitation_token, :string
      add :invitation_email, :string
      add :invitation_phone, :string

      # Notes from coach
      add :notes, :text

      # Membership details
      add :membership_status, :string, default: "active", null: false
      add :membership_start_date, :date
      add :membership_end_date, :date

      # Audit
      add :created_by, :binary_id

      # Relationships
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :user_id, references(:users, type: :binary_id, on_delete: :nilify_all)
      add :coach_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime)
    end

    # Indexes for clients
    create index(:clients, [:business_id])
    create index(:clients, [:user_id])
    create index(:clients, [:coach_id])
    create index(:clients, [:membership_status])

    # Unique constraint: email per business (partial index for non-null)
    create unique_index(:clients, [:business_id, :email],
             name: :clients_business_id_email_index,
             where: "email IS NOT NULL"
           )

    # Unique constraint: phone per business (partial index for non-null)
    create unique_index(:clients, [:business_id, :phone],
             name: :clients_business_id_phone_index,
             where: "phone IS NOT NULL"
           )

    # Unique constraint: invitation token (partial index for non-null)
    create unique_index(:clients, [:invitation_token], where: "invitation_token IS NOT NULL")

    # Check constraint: valid membership status
    create constraint(:clients, :valid_membership_status,
             check: "membership_status IN ('active', 'inactive', 'paused', 'pending')"
           )

    # Check constraint: must have at least one contact method
    create constraint(:clients, :must_have_contact,
             check:
               "email IS NOT NULL OR phone IS NOT NULL OR invitation_email IS NOT NULL OR invitation_phone IS NOT NULL"
           )

    # ============================================
    # 2. CLIENT_SUBSCRIPTIONS TABLE
    # ============================================
    create table(:client_subscriptions, primary_key: false) do
      add :id, :binary_id, primary_key: true

      # Subscription details
      add :plan_name, :string, null: false
      add :amount, :decimal, precision: 10, scale: 2, null: false
      add :currency, :string, size: 3, default: "INR", null: false
      add :billing_cycle, :string, null: false

      # Payment tracking
      add :payment_method, :string, default: "cash", null: false
      add :payment_status, :string, default: "pending", null: false
      add :transaction_id, :string
      add :payment_reference, :string
      add :payment_date, :date
      add :payment_notes, :text

      # Subscription period
      add :starts_at, :date, null: false
      add :ends_at, :date

      # Status
      add :status, :string, default: "active", null: false

      # Notes and audit
      add :notes, :text
      add :recorded_by, :binary_id

      # Relationships
      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      timestamps(type: :utc_datetime)
    end

    # Indexes for client_subscriptions
    create index(:client_subscriptions, [:client_id])
    create index(:client_subscriptions, [:business_id])
    create index(:client_subscriptions, [:status])
    create index(:client_subscriptions, [:payment_status])
    create index(:client_subscriptions, [:transaction_id])
    create index(:client_subscriptions, [:starts_at])
    create index(:client_subscriptions, [:ends_at])
    create index(:client_subscriptions, [:client_id, :status])
    create index(:client_subscriptions, [:business_id, :status])

    # Check constraint: valid billing cycle
    create constraint(:client_subscriptions, :valid_billing_cycle,
             check: "billing_cycle IN ('monthly', 'quarterly', 'yearly', 'one_time')"
           )

    # Check constraint: valid payment method
    create constraint(:client_subscriptions, :valid_payment_method,
             check:
               "payment_method IN ('cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other')"
           )

    # Check constraint: valid payment status
    create constraint(:client_subscriptions, :valid_payment_status,
             check: "payment_status IN ('pending', 'paid', 'failed', 'refunded')"
           )

    # Check constraint: valid status
    create constraint(:client_subscriptions, :valid_status,
             check: "status IN ('active', 'expired', 'cancelled', 'paused')"
           )

    # Check constraint: amount must be positive
    create constraint(:client_subscriptions, :amount_must_be_positive, check: "amount > 0")

    # Check constraint: ends_at must be after starts_at
    create constraint(:client_subscriptions, :ends_at_after_starts_at,
             check: "ends_at IS NULL OR ends_at > starts_at"
           )
  end

  def down do
    drop table(:client_subscriptions)
    drop table(:clients)
  end
end
