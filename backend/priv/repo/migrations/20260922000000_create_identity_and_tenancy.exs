defmodule Easy.Repo.Migrations.CreateIdentityAndTenancy do
  use Ecto.Migration

  def change do
    execute("CREATE EXTENSION IF NOT EXISTS btree_gist", "DROP EXTENSION IF EXISTS btree_gist")

    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :email, :string, null: false
      add :first_name, :string, null: false, default: ""
      add :last_name, :string, null: false, default: ""
      add :email_confirmed_at, :utc_datetime, default: nil
      add :phone, :string, default: nil
      add :phone_confirmed_at, :utc_datetime, default: nil
      add :confirmation_sent_at, :utc_datetime, default: nil
      add :last_sign_in_at, :utc_datetime, default: nil

      timestamps(type: :utc_datetime)
    end

    create unique_index(:users, [:email], where: "email IS NOT NULL")
    create unique_index(:users, [:phone], where: "phone IS NOT NULL")

    create table(:one_time_tokens, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :token_hash, :string, null: false
      add :token_type, :string, null: false
      add :relates_to, :string, null: false
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all)

      timestamps(type: :utc_datetime)
    end

    create unique_index(:one_time_tokens, [:token_hash])
    create index(:one_time_tokens, [:user_id, :token_type])

    create table(:user_sessions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :business_id, :binary_id
      add :ip, :string
      add :user_agent, :string
      add :refresh_token, :string, null: false
      add :expires_at, :utc_datetime, null: false
      add :revoked_at, :utc_datetime
      add :refreshed_at, :utc_datetime
      add :role, :string, null: false
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :coach_id, :binary_id
      add :is_owner, :boolean, null: false, default: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:user_sessions, [:refresh_token])
    create index(:user_sessions, [:user_id])

    create table(:businesses, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string
      add :about, :string, default: ""
      add :handle, :string
      add :whatsapp_number, :string
      add :owner_id, references(:users, type: :binary_id)
      add :dashboard_setup_hidden_at, :utc_datetime
      add :dashboard_setup_hidden_reason, :string
      add :default_weight_unit, :string, null: false, default: "kg"
      add :timezone, :string, null: false, default: "Asia/Kolkata"

      timestamps(type: :utc_datetime)
    end

    create unique_index(:businesses, [:handle])
    create index(:businesses, [:owner_id])

    create constraint(:businesses, :businesses_dashboard_setup_hidden_reason_check,
             check:
               "dashboard_setup_hidden_reason IS NULL OR dashboard_setup_hidden_reason IN ('dismissed', 'completed')"
           )

    create constraint(:businesses, :businesses_dashboard_setup_hidden_state_consistent,
             check:
               "(dashboard_setup_hidden_at IS NULL) = (dashboard_setup_hidden_reason IS NULL)"
           )

    create constraint(:businesses, :businesses_default_weight_unit_check,
             check: "default_weight_unit in ('kg','lbs')"
           )

    create table(:coaches, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :business_id, references(:businesses, type: :binary_id)
      add :first_name, :string
      add :last_name, :string
      add :phone, :string
      add :user_id, references(:users, type: :binary_id)
      add :email, :string
      add :status, :string, null: false, default: "active"
      add :invitation_token, :string
      add :invitation_sent_at, :utc_datetime
      add :invited_by_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime)
    end

    create index(:coaches, [:business_id])
    create index(:coaches, [:business_id, :inserted_at, :id])

    create unique_index(:coaches, [:business_id, "lower(email)"],
             name: :coaches_business_id_lower_email_index,
             where: "email IS NOT NULL"
           )

    create unique_index(:coaches, [:invitation_token], where: "invitation_token IS NOT NULL")
    create unique_index(:coaches, [:user_id, :business_id])
    create unique_index(:coaches, [:user_id], where: "user_id IS NOT NULL")

    create table(:clients, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :business_id, references(:businesses, type: :binary_id), null: false
      add :email, :string
      add :first_name, :string, default: ""
      add :last_name, :string, default: ""
      add :phone, :string
      add :notes, :string
      add :status, :string, null: false
      add :invitation_token, :string
      add :invitation_sent_at, :utc_datetime
      add :goal_weight_value, :decimal, precision: 5, scale: 2
      add :goal_weight_unit, :string
      add :user_id, references(:users, type: :binary_id)
      add :creator_id, references(:coaches, type: :binary_id)
      add :assigned_coach_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
      add :stage, :string, null: false, default: "onboarding"
      add :inactive_reason, :string
      add :subscription_started_on, :date
      add :subscription_ends_on, :date
      add :last_active_at, :utc_datetime
      add :joined_at, :utc_datetime_usec
      add :required_services, {:array, :string}, null: false, default: []
      add :timezone, :string, null: false, default: "Asia/Kolkata"

      timestamps(type: :utc_datetime)
    end

    create index(:clients, [:business_id, :subscription_ends_on, :id],
             name: :clients_active_subscription_ends_on_index,
             where: "status = 'active' AND subscription_ends_on IS NOT NULL"
           )

    create index(:clients, [:business_id, :assigned_coach_id])
    create unique_index(:clients, [:business_id, :email], where: "email IS NOT NULL")
    create index(:clients, [:business_id])
    create index(:clients, [:business_id, :inserted_at, :id])
    create index(:clients, [:business_id, :status])
    create unique_index(:clients, [:id, :business_id])
    create unique_index(:clients, [:invitation_token], where: "invitation_token IS NOT NULL")

    create index(
             :clients,
             [:business_id, "last_active_at DESC NULLS LAST", "inserted_at DESC", "id DESC"],
             name: :clients_last_active_at_index
           )

    create unique_index(:clients, [:user_id, :business_id])

    create constraint(:clients, :clients_required_services_check,
             check: """
             required_services = ARRAY[]::varchar[] OR
             required_services = ARRAY['training']::varchar[] OR
             required_services = ARRAY['nutrition']::varchar[] OR
             required_services = ARRAY['training', 'nutrition']::varchar[]
             """
           )
  end
end
