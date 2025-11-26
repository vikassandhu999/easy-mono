defmodule Easy.Repo.Migrations.CreatePerformedSets do
  use Ecto.Migration

  def change do
    create table(:performed_sets, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :position, :integer, null: false
      add :reps, :integer, null: false
      add :weight_kg, :decimal, null: false
      add :rpe, :decimal
      add :rir, :integer
      add :completed, :boolean, default: true, null: false
      add :notes, :text

      add :workout_session_id,
          references(:workout_sessions, type: :binary_id, on_delete: :delete_all),
          null: false

      add :exercise_id, references(:exercises, type: :binary_id, on_delete: :restrict),
        null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:performed_sets, [:workout_session_id])
    create index(:performed_sets, [:exercise_id])
    create index(:performed_sets, [:position])
  end
end
