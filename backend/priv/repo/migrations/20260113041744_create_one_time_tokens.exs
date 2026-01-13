defmodule Easy.Repo.Migrations.CreateOneTimeTokens do
  use Ecto.Migration

  def change do
    create table(:one_time_tokens, primary_key: false) do
      add :id, :binary_id, primary_key: true, autogenerate: true
      add :token_hash, :string, null: false
      add :token_type, :string, null: false
      add :expires_at, :utc_datetime, null: false
      add :relates_to, :string, null: false
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all)

      timestamps()
    end

    create index(:one_time_tokens, [:user_id, :token_type])
    create unique_index(:one_time_tokens, [:token_hash])
  end
end
