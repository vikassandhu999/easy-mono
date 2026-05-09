defmodule Easy.Repo.Migrations.AddUniqueActiveWorkoutSessionIndex do
  use Ecto.Migration

  def up do
    execute("""
    WITH ranked_sessions AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY business_id, client_id
          ORDER BY started_at DESC, inserted_at DESC, id DESC
        ) AS active_rank
      FROM workout_sessions
      WHERE state = 'active'
    )
    UPDATE workout_sessions session
    SET state = 'discarded',
        ended_at = COALESCE(session.ended_at, NOW()),
        updated_at = NOW()
    FROM ranked_sessions ranked
    WHERE session.id = ranked.id
      AND ranked.active_rank > 1
    """)

    create unique_index(:workout_sessions, [:business_id, :client_id],
             where: "state = 'active'",
             name: :workout_sessions_one_active_per_client_index
           )
  end

  def down do
    drop unique_index(:workout_sessions, [:business_id, :client_id],
           name: :workout_sessions_one_active_per_client_index
         )
  end
end
