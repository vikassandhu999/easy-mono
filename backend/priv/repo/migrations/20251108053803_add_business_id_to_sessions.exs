defmodule Easy.Repo.Migrations.AddBusinessIdToSessions do
  use Ecto.Migration

  def change do
    alter table(:sessions) do
      add :business_id, :binary_id
    end

    create index(:sessions, [:business_id])
  end
end
