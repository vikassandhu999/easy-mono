defmodule Easy.Repo.Migrations.CreateUserSessions do
  use Ecto.Migration

  def change do
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
  end
end
