defmodule Easy.Repo.Migrations.CreateIdentityAndTenancy do
  use Ecto.Migration

  def change do
    execute("CREATE EXTENSION IF NOT EXISTS btree_gist", "DROP EXTENSION IF EXISTS btree_gist")

    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :email, :string, null: false
      add :full_name, :string, null: false, default: ""
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
      add :name, :string, null: false
      add :handle, :string, null: false
      add :owner_user_id, references(:users, type: :binary_id), null: false
      add :timezone, :string, null: false, default: "Asia/Kolkata"
      timestamps(type: :utc_datetime)
    end

    create unique_index(:businesses, ["lower(handle)"], name: :businesses_handle_index)
    create index(:businesses, [:owner_user_id])

    create constraint(:businesses, :businesses_handle_check,
             check:
               "char_length(handle) BETWEEN 3 AND 40 AND handle ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND handle NOT IN ('admin', 'api', 'app', 'www', 'auth', 'login', 'signup', 'support', 'help', 'billing', 'settings', 'assets', 'static', 'coach', 'client', 'coaches', 'clients')"
           )

    create table(:coaches, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :business_id, references(:businesses, type: :binary_id), null: false
      add :full_name, :string, null: false
      add :preferred_name, :string
      add :phone, :string
      add :user_id, references(:users, type: :binary_id)
      add :email, :string
      add :invite_token, :string
      add :invited_at, :utc_datetime
      add :removed_on, :date
      timestamps(type: :utc_datetime)
    end

    create index(:coaches, [:business_id, :inserted_at, :id])
    create unique_index(:coaches, [:id, :business_id])

    create unique_index(:coaches, [:business_id, "lower(email)"],
             name: :coaches_business_id_lower_email_index,
             where: "email IS NOT NULL"
           )

    create unique_index(:coaches, [:invite_token], where: "invite_token IS NOT NULL")
    create unique_index(:coaches, [:user_id, :business_id])
    create unique_index(:coaches, [:user_id], where: "user_id IS NOT NULL AND removed_on IS NULL")

    create table(:clients, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :business_id, references(:businesses, type: :binary_id), null: false
      add :email, :string
      add :full_name, :string, null: false
      add :preferred_name, :string
      add :phone, :string
      add :notes, :text
      add :invite_token, :string
      add :invited_at, :utc_datetime
      add :user_id, references(:users, type: :binary_id)

      add :coach_id, references(:coaches, type: :binary_id, with: [business_id: :business_id]),
        null: false

      add :last_active_at, :utc_datetime
      add :joined_at, :utc_datetime_usec
      add :timezone, :string
      add :unit_system, :string, null: false, default: "metric"
      timestamps(type: :utc_datetime)
    end

    create index(:clients, [:business_id, :coach_id])
    create unique_index(:clients, [:business_id, :email], where: "email IS NOT NULL")
    create index(:clients, [:business_id, :inserted_at, :id])
    create unique_index(:clients, [:id, :business_id])
    create unique_index(:clients, [:invite_token], where: "invite_token IS NOT NULL")

    create index(
             :clients,
             [:business_id, "last_active_at DESC NULLS LAST", "inserted_at DESC", "id DESC"],
             name: :clients_last_active_at_index
           )

    create unique_index(:clients, [:user_id, :business_id])

    create constraint(:clients, :clients_unit_system_check,
             check: "unit_system IN ('metric', 'imperial')"
           )

    create table(:coaching_terms, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :client_id, references(:clients, type: :binary_id), null: false
      add :starts_on, :date, null: false
      add :ends_on, :date
      timestamps(type: :utc_datetime)
    end

    create index(:coaching_terms, [:client_id, :starts_on])

    create constraint(:coaching_terms, :coaching_terms_dates_check,
             check: "ends_on IS NULL OR ends_on >= starts_on"
           )

    execute(
      "ALTER TABLE coaching_terms ADD CONSTRAINT coaching_terms_no_overlap EXCLUDE USING gist (client_id WITH =, daterange(starts_on, ends_on, '[]') WITH &&)",
      "ALTER TABLE coaching_terms DROP CONSTRAINT coaching_terms_no_overlap"
    )
  end
end
