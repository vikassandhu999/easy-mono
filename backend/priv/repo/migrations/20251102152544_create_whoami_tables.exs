defmodule Easy.Repo.Migrations.CreateWhoamiTables do
  use Ecto.Migration

  def up do
    # Create users table
    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :email, :string
      add :email_confirmed_at, :utc_datetime_usec
      add :phone, :string
      add :phone_confirmed_at, :utc_datetime_usec
      add :encrypted_password, :text
      add :raw_app_meta_data, :jsonb, null: false, default: "{}"
      add :raw_user_meta_data, :jsonb, null: false, default: "{}"
      add :banned_until, :utc_datetime_usec
      add :deleted_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    # Create indexes for users table
    create index(:users, [:email], name: :idx_users_email)
    create index(:users, [:inserted_at], name: :idx_users_created_at)

    create index(:users, [:deleted_at],
             name: :idx_users_deleted_at,
             where: "deleted_at IS NOT NULL"
           )

    create unique_index(:users, [:email],
             name: :idx_users_email_unique,
             where: "email IS NOT NULL"
           )

    create unique_index(:users, [:phone],
             name: :idx_users_phone_unique,
             where: "phone IS NOT NULL"
           )

    # Create usr_sessions table
    create table(:usr_sessions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :not_after, :utc_datetime_usec
      add :refresh_token, :text, null: false
      add :refreshed_at, :utc_datetime_usec
      add :revoked_at, :utc_datetime_usec
      add :user_agent, :text
      add :ip, :text
      add :tag, :text

      timestamps(type: :utc_datetime_usec)
    end

    # Create indexes for usr_sessions table
    create index(:usr_sessions, [:user_id], name: :idx_usr_sessions_user_id)
    create unique_index(:usr_sessions, [:refresh_token], name: :idx_usr_sessions_refresh_token)
    create index(:usr_sessions, [:inserted_at], name: :idx_usr_sessions_created_at)

    create index(:usr_sessions, [:not_after],
             name: :idx_usr_sessions_not_after,
             where: "not_after IS NOT NULL"
           )

    create index(:usr_sessions, [:revoked_at],
             name: :idx_usr_sessions_revoked_at,
             where: "revoked_at IS NOT NULL"
           )

    # Create otts (one time tokens) table
    create table(:otts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :token_type, :integer, null: false
      add :secret, :text, null: false
      add :relates_to_phone, :text
      add :relates_to_email, :text

      timestamps(type: :utc_datetime_usec)
    end

    # Create indexes for otts table
    create index(:otts, [:user_id], name: :idx_otts_user_id)
    create index(:otts, [:token_type], name: :idx_otts_token_type)
    create index(:otts, [:user_id, :token_type], name: :idx_otts_user_id_token_type)
    create index(:otts, [:inserted_at], name: :idx_otts_created_at)
    create unique_index(:otts, [:id, :token_type], name: :idx_otts_id_token_type)
  end

  def down do
    # Drop tables in reverse order (due to foreign key constraints)
    drop table(:otts)
    drop table(:usr_sessions)
    drop table(:users)
  end
end
