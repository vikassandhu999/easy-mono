defmodule Easy.Repo.Migrations.CreatePlannedWorkouts do
  use Ecto.Migration

  def change do
    create table(:planned_workouts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :notes, :text
      add :day_of_week, :integer, null: false

      add :phase_id, references(:phases, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:planned_workouts, [:phase_id, :day_of_week],
             name: :planned_workouts_phase_id_day_of_week_index
           )

    create index(:planned_workouts, [:phase_id])
  end
end
