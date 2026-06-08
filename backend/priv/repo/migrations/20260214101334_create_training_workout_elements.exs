defmodule Easy.Repo.Migrations.CreateTrainingWorkoutElements do
  use Ecto.Migration

  def change do
    create table(:workout_elements, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :position, :integer, null: false
      add :superset_group_id, :string
      add :notes, :text
      add :planned_sets, {:array, :jsonb}, default: []

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing),
        null: false

      add :planned_workout_id,
          references(:planned_workouts, type: :binary_id, on_delete: :delete_all),
          null: false

      add :exercise_id, references(:exercises, type: :binary_id, on_delete: :nothing), null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:workout_elements, [:business_id])
    create index(:workout_elements, [:planned_workout_id])
    create index(:workout_elements, [:exercise_id])

    create unique_index(:workout_elements, [:position, :planned_workout_id],
             name: :workout_elements_position_planned_workout_id_index
           )
  end
end
