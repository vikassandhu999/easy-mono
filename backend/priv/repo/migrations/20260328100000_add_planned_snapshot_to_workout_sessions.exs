defmodule Easy.Repo.Migrations.AddPlannedSnapshotToWorkoutSessions do
  use Ecto.Migration

  def change do
    alter table(:workout_sessions) do
      add :planned_snapshot, :map
    end
  end
end
