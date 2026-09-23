defmodule Easy.Repo.Migrations.RemoveDashboardSetup do
  use Ecto.Migration

  def up do
    alter table(:businesses) do
      remove :dashboard_setup_hidden_at
      remove :dashboard_setup_hidden_reason
    end
  end

  def down do
    raise "Retired dashboard state cannot be restored; restore the database backup to roll back."
  end
end
