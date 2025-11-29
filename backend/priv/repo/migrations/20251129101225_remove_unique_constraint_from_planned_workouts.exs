defmodule Easy.Repo.Migrations.RemoveUniqueConstraintFromPlannedWorkouts do
  use Ecto.Migration

  def change do
    drop_if_exists index(:planned_workouts, [:training_plan_id, :day_number],
                     name: :planned_workouts_training_plan_id_day_number_index
                   )
  end
end
