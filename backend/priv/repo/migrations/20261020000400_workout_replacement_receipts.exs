defmodule Easy.Repo.Migrations.WorkoutReplacementReceipts do
  use Ecto.Migration

  def up do
    create unique_index(:exercise_logs, [:id, :workout_log_id, :business_id],
             name: :exercise_logs_session_identity
           )

    create table(:workout_replacement_receipts, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :workout_log_id,
          references(:workout_logs,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :workout_replacement_receipts_session_fkey,
            on_delete: :delete_all
          ),
          null: false

      add :source_activity_id,
          references(:exercise_logs,
            type: :binary_id,
            with: [workout_log_id: :workout_log_id, business_id: :business_id],
            name: :workout_replacement_receipts_source_fkey
          ),
          null: false

      add :exercise_id, :binary_id, null: false

      add :result_activity_id,
          references(:exercise_logs,
            type: :binary_id,
            with: [workout_log_id: :workout_log_id, business_id: :business_id],
            name: :workout_replacement_receipts_result_fkey
          ),
          null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:workout_replacement_receipts, [:business_id, :workout_log_id])
  end

  def down, do: raise("Replacement receipts retain recording retry history")
end
