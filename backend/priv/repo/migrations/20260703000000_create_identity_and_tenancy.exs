defmodule Easy.Repo.Migrations.CreateIdentityAndTenancy do
  use Ecto.Migration

  def change do
    execute("CREATE EXTENSION IF NOT EXISTS btree_gist", "DROP EXTENSION IF EXISTS btree_gist")

    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true, autogenerate: true
      add :email, :string, null: false
      add :first_name, :string, null: false, default: ""
      add :last_name, :string, null: false, default: ""
      add :email_confirmed_at, :utc_datetime, default: nil
      add :phone, :string, default: nil
      add :phone_confirmed_at, :utc_datetime, default: nil
      add :confirmation_sent_at, :utc_datetime, default: nil
      add :last_sign_in_at, :utc_datetime, default: nil

      timestamps()
    end

    create unique_index(:users, [:email], where: "email IS NOT NULL")
    create unique_index(:users, [:phone], where: "phone IS NOT NULL")

    create table(:one_time_tokens, primary_key: false) do
      add :id, :binary_id, primary_key: true, autogenerate: true
      add :token_hash, :string, null: false
      add :token_type, :string, null: false
      add :relates_to, :string, null: false
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all)

      timestamps()
    end

    create index(:one_time_tokens, [:user_id, :token_type])
    create unique_index(:one_time_tokens, [:token_hash])

    create table(:user_sessions, primary_key: false) do
      add :id, :binary_id, primary_key: true, autogenerate: true

      add :ip, :string
      add :user_agent, :string
      add :refresh_token, :string, null: false
      add :expires_at, :utc_datetime, null: false
      add :revoked_at, :utc_datetime
      add :refreshed_at, :utc_datetime
      add :role, :string, null: false
      add :business_id, :binary_id
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false

      timestamps()
    end

    create unique_index(:user_sessions, [:refresh_token])
    create index(:user_sessions, [:user_id])

    create table(:businesses, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string
      add :about, :string, default: ""
      add :handle, :string
      add :whatsapp_number, :string

      add :owner_id, references(:users, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create unique_index(:businesses, [:handle])
    create index(:businesses, [:owner_id])

    create table(:coaches, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :first_name, :string
      add :last_name, :string
      add :phone, :string

      add :user_id, references(:users, type: :binary_id, on_delete: :nothing)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create unique_index(:coaches, [:user_id, :business_id])
    create index(:coaches, [:business_id])

    create table(:clients, primary_key: false) do
      add :id, :binary_id, primary_key: true
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

      add :user_id, references(:users, type: :binary_id, on_delete: :nothing)

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing),
        null: false

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create unique_index(:clients, [:user_id, :business_id])
    create unique_index(:clients, [:business_id, :email], where: "email IS NOT NULL")

    create unique_index(:clients, [:invitation_token],
             where: "invitation_token IS NOT NULL",
             name: :clients_invitation_token_index
           )

    create unique_index(:clients, [:id, :business_id], name: :clients_id_business_id_index)
    create index(:clients, [:business_id])
    create index(:clients, [:business_id, :status])
  end
end
