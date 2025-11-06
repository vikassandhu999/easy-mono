defmodule Easy.Repo.Migrations.CreateSessions do
  use Ecto.Migration

  def change do
    create table(:sessions) do
      add :token, :string, null: false
      add :refresh_token, :string, null: false
      add :expires_at, :utc_datetime, null: false
      add :last_activity_at, :utc_datetime, null: false
      add :revoked_at, :utc_datetime
      add :user_id, references(:users, on_delete: :delete_all), null: false

      timestamps()
    end

    create unique_index(:sessions, [:token])
    create unique_index(:sessions, [:refresh_token])
    create index(:sessions, [:user_id])
  end
end
