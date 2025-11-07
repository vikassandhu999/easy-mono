defmodule Easy.Repo.Migrations.CreateOneTimeTokens do
  use Ecto.Migration

  def change do
    create table(:one_time_tokens, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :token, :uuid, null: false, default: fragment("gen_random_uuid()")
      add :code, :string, null: false
      add :type, :string, null: false
      add :email, :string, null: false
      add :expires_at, :utc_datetime, null: false
      add :used_at, :utc_datetime
      add :attempts, :integer, default: 0, null: false
      add :metadata, :map
      add :user_id, references(:users, type: :uuid, on_delete: :nothing)

      timestamps()
    end

    create unique_index(:one_time_tokens, [:token])
    create index(:one_time_tokens, [:email, :type])
    create index(:one_time_tokens, [:expires_at])
    create index(:one_time_tokens, [:user_id])
  end
end
