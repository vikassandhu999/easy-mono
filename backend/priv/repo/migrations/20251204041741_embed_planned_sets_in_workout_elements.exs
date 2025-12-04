defmodule Easy.Repo.Migrations.EmbedPlannedSetsInWorkoutElements do
  use Ecto.Migration

  def up do
    # 1. Add business_id to planned_workouts for tenant isolation
    alter table(:planned_workouts) do
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all)
    end

    # Backfill business_id from training_plans
    execute """
    UPDATE planned_workouts pw
    SET business_id = tp.business_id
    FROM training_plans tp
    WHERE pw.training_plan_id = tp.id
    """

    # Make business_id NOT NULL after backfill
    execute "ALTER TABLE planned_workouts ALTER COLUMN business_id SET NOT NULL"

    create index(:planned_workouts, [:business_id])

    # 2. Add business_id to workout_elements for tenant isolation
    alter table(:workout_elements) do
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all)
    end

    # Backfill business_id from planned_workouts -> training_plans
    execute """
    UPDATE workout_elements we
    SET business_id = tp.business_id
    FROM planned_workouts pw
    JOIN training_plans tp ON pw.training_plan_id = tp.id
    WHERE we.planned_workout_id = pw.id
    """

    # Make business_id NOT NULL after backfill
    execute "ALTER TABLE workout_elements ALTER COLUMN business_id SET NOT NULL"

    create index(:workout_elements, [:business_id])

    # 3. Add business_id to performed_sets for tenant isolation
    alter table(:performed_sets) do
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all)
    end

    # Backfill business_id from workout_sessions
    execute """
    UPDATE performed_sets ps
    SET business_id = ws.business_id
    FROM workout_sessions ws
    WHERE ps.workout_session_id = ws.id
    """

    # Make business_id NOT NULL after backfill
    execute "ALTER TABLE performed_sets ALTER COLUMN business_id SET NOT NULL"

    create index(:performed_sets, [:business_id])

    # 4. Add the JSONB column for embedded planned_sets
    alter table(:workout_elements) do
      add :planned_sets, :jsonb, default: "[]"
    end

    # 5. Migrate existing data from planned_sets table to embedded JSONB
    # Array order provides position, so we ORDER BY position but don't store it
    execute """
    UPDATE workout_elements we
    SET planned_sets = COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'target_reps', ps.target_reps,
            'load_value', ps.load_value,
            'load_type', ps.load_type,
            'intensity_target', ps.intensity_target,
            'tempo', ps.tempo,
            'rest_seconds', ps.rest_seconds,
            'duration_seconds', ps.duration_seconds,
            'distance_value', ps.distance_value,
            'distance_unit', ps.distance_unit,
            'set_type', ps.set_type,
            'notes', ps.notes
          ) ORDER BY ps.position
        )
        FROM planned_sets ps
        WHERE ps.workout_element_id = we.id
      ),
      '[]'::jsonb
    )
    """

    # 6. Drop the planned_sets table
    drop table(:planned_sets)
  end

  def down do
    # 1. Recreate the planned_sets table
    create table(:planned_sets, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :position, :integer, null: false
      add :target_reps, :string
      add :load_value, :decimal
      add :load_type, :string, default: "none"
      add :intensity_target, :string
      add :tempo, :string
      add :rest_seconds, :integer
      add :duration_seconds, :integer
      add :distance_value, :decimal
      add :distance_unit, :string, default: "none"
      add :set_type, :string, default: "working"
      add :notes, :text

      add :workout_element_id,
          references(:workout_elements, type: :binary_id, on_delete: :delete_all),
          null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:planned_sets, [:workout_element_id])
    create unique_index(:planned_sets, [:workout_element_id, :position])

    # 2. Migrate data back from JSONB to the table
    # Use array index (ordinality - 1) as position since we no longer store it
    execute """
    INSERT INTO planned_sets (id, position, target_reps, load_value, load_type, intensity_target, tempo, rest_seconds, duration_seconds, distance_value, distance_unit, set_type, notes, workout_element_id, inserted_at, updated_at)
    SELECT
      gen_random_uuid(),
      (ordinality - 1)::integer,
      set_data->>'target_reps',
      (set_data->>'load_value')::decimal,
      COALESCE(set_data->>'load_type', 'none'),
      set_data->>'intensity_target',
      set_data->>'tempo',
      (set_data->>'rest_seconds')::integer,
      (set_data->>'duration_seconds')::integer,
      (set_data->>'distance_value')::decimal,
      COALESCE(set_data->>'distance_unit', 'none'),
      COALESCE(set_data->>'set_type', 'working'),
      set_data->>'notes',
      we.id,
      NOW(),
      NOW()
    FROM workout_elements we,
    LATERAL jsonb_array_elements(we.planned_sets) WITH ORDINALITY AS t(set_data, ordinality)
    WHERE jsonb_array_length(we.planned_sets) > 0
    """

    # 3. Remove the JSONB column and business_id columns
    alter table(:workout_elements) do
      remove :planned_sets
      remove :business_id
    end

    alter table(:planned_workouts) do
      remove :business_id
    end

    alter table(:performed_sets) do
      remove :business_id
    end
  end
end
