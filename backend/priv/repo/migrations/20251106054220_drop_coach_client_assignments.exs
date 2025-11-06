defmodule Easy.Repo.Migrations.DropCoachClientAssignments do
  use Ecto.Migration

  def change do
    drop table(:coach_client_assignments)
  end
end
