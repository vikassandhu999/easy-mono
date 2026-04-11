defmodule Easy.Repo.Migrations.RemoveDraftPlanStatus do
  use Ecto.Migration

  def up do
    execute "UPDATE training_plans SET status = 'active' WHERE status = 'draft'"
    execute "UPDATE plans SET status = 'active' WHERE status = 'draft'"
    execute "ALTER TABLE plans ALTER COLUMN status SET DEFAULT 'active'"
  end

  def down do
    execute "ALTER TABLE plans ALTER COLUMN status SET DEFAULT 'draft'"
  end
end
