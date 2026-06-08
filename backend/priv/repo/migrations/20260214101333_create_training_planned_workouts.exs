defmodule Easy.Repo.Migrations.CreateTrainingPlannedWorkouts do
  use Ecto.Migration

  def change do
    create table(:planned_workouts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :notes, :text
      add :day_number, :integer, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing),
        null: false

      add :training_plan_id,
          references(:training_plans, type: :binary_id, on_delete: :delete_all),
          null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:planned_workouts, [:business_id])
    create index(:planned_workouts, [:training_plan_id])

    create constraint(:planned_workouts, :day_number_valid_weekday,
             check: "day_number >= 1 AND day_number <= 7"
           )
  end
end
