defmodule Easy.Repo.Migrations.CreateWorkoutSessions do
  use Ecto.Migration

  def change do
    create table(:workout_sessions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :started_at, :utc_datetime_usec
      add :ended_at, :utc_datetime_usec
      add :state, :string, null: false, default: "active"
      add :soreness_rating, :integer
      add :notes, :text

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :planned_workout_id,
          references(:planned_workouts, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime_usec)
    end

    create index(:workout_sessions, [:client_id])
    create index(:workout_sessions, [:business_id])
    create index(:workout_sessions, [:planned_workout_id])
    create index(:workout_sessions, [:state])
    create index(:workout_sessions, [:started_at])
  end
end
