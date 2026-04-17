defmodule Easy.Repo.Migrations.AddMoodToWorkoutSessions do
  use Ecto.Migration

  def change do
    alter table(:workout_sessions) do
      add :mood, :string
    end
  end
end
