defmodule Easy.Repo.Migrations.CreateOneTimeTokens do
  use Ecto.Migration

  def change do
    create table(:one_time_codes, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :code, :string, null: false
      add :type, :string, null: false
      add :expires_at, :utc_datetime, null: false
      add :user_id, references(:users, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:one_time_codes, [:user_id, :type])
  end
end
