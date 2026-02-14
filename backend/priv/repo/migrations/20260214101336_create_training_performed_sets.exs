defmodule Easy.Repo.Migrations.CreateTrainingPerformedSets do
  use Ecto.Migration

  def change do
    create table(:performed_sets, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :position, :integer, null: false
      add :actual_reps, :string
      add :load_value, :decimal
      add :load_unit, :string, default: "none", null: false
      add :intensity_felt, :string
      add :rpe, :decimal
      add :rir, :integer
      add :duration_seconds, :integer
      add :distance_value, :decimal
      add :distance_unit, :string, default: "none", null: false
      add :tempo_actual, :string
      add :completed, :boolean, default: true, null: false
      add :notes, :text

      add :workout_session_id,
          references(:workout_sessions, type: :binary_id, on_delete: :delete_all),
          null: false

      add :exercise_id, references(:exercises, type: :binary_id, on_delete: :nothing), null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing),
        null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:performed_sets, [:business_id])
    create index(:performed_sets, [:workout_session_id])
    create index(:performed_sets, [:exercise_id])
    create unique_index(:performed_sets, [:workout_session_id, :position])

    create constraint(:performed_sets, :performed_sets_position_check, check: "position >= 0")

    create constraint(:performed_sets, :performed_sets_rpe_check,
             check: "rpe IS NULL OR (rpe >= 1 AND rpe <= 10)"
           )

    create constraint(:performed_sets, :performed_sets_rir_check,
             check: "rir IS NULL OR rir >= 0"
           )

    create constraint(:performed_sets, :performed_sets_duration_seconds_check,
             check: "duration_seconds IS NULL OR duration_seconds >= 0"
           )

    create constraint(:performed_sets, :performed_sets_has_metric_check,
             check:
               "actual_reps IS NOT NULL OR duration_seconds IS NOT NULL OR distance_value IS NOT NULL"
           )
  end
end
