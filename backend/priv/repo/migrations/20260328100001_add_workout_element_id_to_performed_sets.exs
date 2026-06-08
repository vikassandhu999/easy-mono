defmodule Easy.Repo.Migrations.AddWorkoutElementIdToPerformedSets do
  use Ecto.Migration

  def change do
    alter table(:performed_sets) do
      add :workout_element_id,
          references(:workout_elements, type: :binary_id, on_delete: :nilify_all)
    end

    create index(:performed_sets, [:workout_element_id])
    create index(:performed_sets, [:workout_session_id, :exercise_id])
  end
end
