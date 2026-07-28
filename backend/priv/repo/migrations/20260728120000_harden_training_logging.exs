defmodule Easy.Repo.Migrations.HardenTrainingLogging do
  use Ecto.Migration

  def up do
    # Position is a display order, not an identity. The unique index turned a
    # concurrent double-log into a 422; ties are the correct outcome, and
    # `(position, id)` already breaks them deterministically.
    drop unique_index(:training_performed_sets, [:training_session_id, :position])
    create_if_not_exists index(:training_performed_sets, [:training_session_id])

    alter table(:training_performed_sets) do
      add :planned_exercise_index, :integer
    end

    # The column was a bare uuid, so it may point at a deleted exercise. Null those
    # before the FK can reject them.
    execute("""
    UPDATE training_performed_sets
    SET swapped_from_exercise_id = NULL
    WHERE swapped_from_exercise_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM training_exercises e WHERE e.id = training_performed_sets.swapped_from_exercise_id
      )
    """)

    alter table(:training_performed_sets) do
      modify :swapped_from_exercise_id,
             references(:training_exercises, type: :binary_id, on_delete: :nilify_all),
             from: :binary_id

      modify :business_id,
             references(:businesses, type: :binary_id, on_delete: :delete_all),
             from: references(:businesses, type: :binary_id, on_delete: :nothing)
    end

    create constraint(:training_performed_sets, :training_performed_sets_rpe_check,
             check: "rpe is null or (rpe >= 1 and rpe <= 10)"
           )

    execute("""
    UPDATE training_sessions
    SET date = coalesce(date, started_at::date, inserted_at::date),
        started_at = coalesce(started_at, inserted_at)
    """)

    alter table(:training_sessions) do
      modify :date, :date, null: false
      modify :started_at, :utc_datetime, null: false

      modify :business_id,
             references(:businesses, type: :binary_id, on_delete: :delete_all),
             from: references(:businesses, type: :binary_id, on_delete: :nothing)
    end

    create constraint(:training_sessions, :training_sessions_soreness_rating_check,
             check: "soreness_rating is null or (soreness_rating >= 1 and soreness_rating <= 5)"
           )
  end

  def down do
    drop constraint(:training_sessions, :training_sessions_soreness_rating_check)

    alter table(:training_sessions) do
      modify :date, :date, null: true
      modify :started_at, :utc_datetime, null: true

      modify :business_id,
             references(:businesses, type: :binary_id, on_delete: :nothing),
             from: references(:businesses, type: :binary_id, on_delete: :delete_all)
    end

    drop constraint(:training_performed_sets, :training_performed_sets_rpe_check)

    alter table(:training_performed_sets) do
      modify :business_id,
             references(:businesses, type: :binary_id, on_delete: :nothing),
             from: references(:businesses, type: :binary_id, on_delete: :delete_all)

      modify :swapped_from_exercise_id, :binary_id,
        from: references(:training_exercises, type: :binary_id, on_delete: :nilify_all)

      remove :planned_exercise_index
    end

    create unique_index(:training_performed_sets, [:training_session_id, :position])
  end
end
