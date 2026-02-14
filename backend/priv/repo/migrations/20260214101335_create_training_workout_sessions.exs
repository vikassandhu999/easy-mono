defmodule Easy.Repo.Migrations.CreateTrainingWorkoutSessions do
  use Ecto.Migration

  def change do
    create table(:workout_sessions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :started_at, :utc_datetime_usec, null: false
      add :ended_at, :utc_datetime_usec
      add :state, :string, default: "active", null: false
      add :soreness_rating, :integer
      add :notes, :text

      add :client_id, references(:clients, type: :binary_id, on_delete: :nothing), null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing),
        null: false

      add :planned_workout_id,
          references(:planned_workouts, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime_usec)
    end

    create index(:workout_sessions, [:business_id])
    create index(:workout_sessions, [:client_id])
    create index(:workout_sessions, [:planned_workout_id])
    create index(:workout_sessions, [:business_id, :state])

    create constraint(:workout_sessions, :workout_sessions_soreness_rating_check,
             check: "soreness_rating IS NULL OR (soreness_rating >= 1 AND soreness_rating <= 5)"
           )

    create constraint(:workout_sessions, :workout_sessions_ended_after_started_check,
             check: "ended_at IS NULL OR ended_at >= started_at"
           )
  end
end
