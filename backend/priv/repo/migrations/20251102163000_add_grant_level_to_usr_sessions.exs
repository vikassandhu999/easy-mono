defmodule Easy.Repo.Migrations.AddGrantLevelToUsrSessions do
  use Ecto.Migration

  def up do
    alter table(:usr_sessions) do
      add :grant_level, :integer, default: 1, null: false
    end
  end

  def down do
    alter table(:usr_sessions) do
      remove :grant_level
    end
  end
end
