defmodule Easy.Repo.Migrations.CreateWorkoutElements do
  use Ecto.Migration

  def change do
    create table(:workout_elements, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :position, :integer, null: false
      add :superset_group_id, :string
      add :notes, :text

      add :planned_workout_id,
          references(:planned_workouts, type: :binary_id, on_delete: :delete_all),
          null: false

      add :exercise_id, references(:exercises, type: :binary_id, on_delete: :restrict),
        null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:workout_elements, [:position, :planned_workout_id],
             name: :workout_elements_position_planned_workout_id_index
           )

    create index(:workout_elements, [:planned_workout_id])
    create index(:workout_elements, [:exercise_id])
    create index(:workout_elements, [:superset_group_id])
  end
end
