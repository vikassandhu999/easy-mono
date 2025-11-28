defmodule Easy.Repo.Migrations.RemovePhasesSimplifyWorkouts do
  use Ecto.Migration

  def change do
    # First, drop the unique constraint on planned_workouts
    drop_if_exists unique_index(:planned_workouts, [:phase_id, :day_of_week],
                     name: :planned_workouts_phase_id_day_of_week_index
                   )

    drop_if_exists index(:planned_workouts, [:phase_id])

    # Add training_plan_id to planned_workouts
    alter table(:planned_workouts) do
      add :training_plan_id,
          references(:training_plans, type: :binary_id, on_delete: :delete_all)

      add :day_number, :integer
    end

    # Create indexes for the new structure
    create index(:planned_workouts, [:training_plan_id])

    create unique_index(:planned_workouts, [:training_plan_id, :day_number],
             name: :planned_workouts_training_plan_id_day_number_index
           )

    # Remove old phase_id column and day_of_week
    alter table(:planned_workouts) do
      remove :phase_id, references(:phases, type: :binary_id, on_delete: :delete_all)
      remove :day_of_week, :integer
    end

    # Drop phase_assignments table
    drop table(:phase_assignments)

    # Drop phases table
    drop table(:phases)
  end
end
