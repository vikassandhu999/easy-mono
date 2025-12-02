defmodule Easy.Repo.Migrations.TrainingSchemaUpdates do
  @moduledoc """
  Consolidated migration for training domain schema updates.

  Changes:
  1. Muscles: Make muscle_group_id nullable (muscles can exist without a group)
  2. Exercises: Make mechanics/force nullable, remove unused slug column
  3. Planned Sets: Redesign for flexible rep/intensity targets
  4. Performed Sets: Redesign for actual performance tracking
  5. Add unique constraints for set/workout positions
  """
  use Ecto.Migration

  def up do
    # ============================================================================
    # MUSCLES: Make muscle_group_id optional
    # ============================================================================
    execute "DROP INDEX IF EXISTS muscles_muscle_group_id_index"
    execute "ALTER TABLE muscles ALTER COLUMN muscle_group_id DROP NOT NULL"

    execute "CREATE INDEX IF NOT EXISTS muscles_muscle_group_id_index ON muscles (muscle_group_id)"

    # ============================================================================
    # EXERCISES: Make mechanics/force nullable, remove slug, add images
    # ============================================================================
    execute "ALTER TABLE exercises ALTER COLUMN mechanics DROP NOT NULL"
    execute "ALTER TABLE exercises ALTER COLUMN force DROP NOT NULL"
    execute "DROP INDEX IF EXISTS exercises_slug_index"
    execute "ALTER TABLE exercises DROP COLUMN IF EXISTS slug"
    execute "ALTER TABLE exercises ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb"

    # ============================================================================
    # UNIQUE CONSTRAINTS FOR POSITIONS
    # ============================================================================
    execute """
    CREATE UNIQUE INDEX IF NOT EXISTS planned_workouts_training_plan_id_day_number_index
    ON planned_workouts (training_plan_id, day_number)
    """

    execute """
    CREATE UNIQUE INDEX IF NOT EXISTS planned_sets_workout_element_id_position_index
    ON planned_sets (workout_element_id, position)
    """

    execute """
    CREATE UNIQUE INDEX IF NOT EXISTS performed_sets_workout_session_id_position_index
    ON performed_sets (workout_session_id, position)
    """

    # ============================================================================
    # PLANNED_SETS: Redesign for flexible rep/intensity tracking
    # ============================================================================

    # Remove old columns
    execute "ALTER TABLE planned_sets DROP COLUMN IF EXISTS reps_min"
    execute "ALTER TABLE planned_sets DROP COLUMN IF EXISTS reps_max"
    execute "ALTER TABLE planned_sets DROP COLUMN IF EXISTS target_min"
    execute "ALTER TABLE planned_sets DROP COLUMN IF EXISTS target_max"
    execute "ALTER TABLE planned_sets DROP COLUMN IF EXISTS target_text"
    execute "ALTER TABLE planned_sets DROP COLUMN IF EXISTS target_unit"
    execute "ALTER TABLE planned_sets DROP COLUMN IF EXISTS rpe_target"

    # Add new flexible columns
    execute "ALTER TABLE planned_sets ADD COLUMN IF NOT EXISTS target_reps VARCHAR(255)"
    execute "ALTER TABLE planned_sets ADD COLUMN IF NOT EXISTS intensity_target VARCHAR(255)"
    execute "ALTER TABLE planned_sets ADD COLUMN IF NOT EXISTS tempo VARCHAR(255)"

    execute "ALTER TABLE planned_sets ADD COLUMN IF NOT EXISTS set_type VARCHAR(255) DEFAULT 'working'"

    execute "ALTER TABLE planned_sets ADD COLUMN IF NOT EXISTS duration_seconds INTEGER"
    execute "ALTER TABLE planned_sets ADD COLUMN IF NOT EXISTS distance_value DECIMAL"

    execute "ALTER TABLE planned_sets ADD COLUMN IF NOT EXISTS distance_unit VARCHAR(255) DEFAULT 'none'"

    execute "ALTER TABLE planned_sets ADD COLUMN IF NOT EXISTS notes TEXT"

    # ============================================================================
    # PERFORMED_SETS: Redesign for actual performance tracking
    # ============================================================================

    # Remove old columns
    execute "ALTER TABLE performed_sets DROP COLUMN IF EXISTS reps"
    execute "ALTER TABLE performed_sets DROP COLUMN IF EXISTS weight_kg"

    # Add new columns
    execute "ALTER TABLE performed_sets ADD COLUMN IF NOT EXISTS actual_reps VARCHAR(255)"
    execute "ALTER TABLE performed_sets ADD COLUMN IF NOT EXISTS load_value DECIMAL"

    execute "ALTER TABLE performed_sets ADD COLUMN IF NOT EXISTS load_unit VARCHAR(255) DEFAULT 'none'"

    execute "ALTER TABLE performed_sets ADD COLUMN IF NOT EXISTS intensity_felt VARCHAR(255)"
    execute "ALTER TABLE performed_sets ADD COLUMN IF NOT EXISTS duration_seconds INTEGER"
    execute "ALTER TABLE performed_sets ADD COLUMN IF NOT EXISTS distance_value DECIMAL"

    execute "ALTER TABLE performed_sets ADD COLUMN IF NOT EXISTS distance_unit VARCHAR(255) DEFAULT 'none'"

    execute "ALTER TABLE performed_sets ADD COLUMN IF NOT EXISTS tempo_actual VARCHAR(255)"
  end

  def down do
    # ============================================================================
    # PERFORMED_SETS: Restore old columns
    # ============================================================================
    execute "ALTER TABLE performed_sets DROP COLUMN IF EXISTS tempo_actual"
    execute "ALTER TABLE performed_sets DROP COLUMN IF EXISTS distance_unit"
    execute "ALTER TABLE performed_sets DROP COLUMN IF EXISTS distance_value"
    execute "ALTER TABLE performed_sets DROP COLUMN IF EXISTS duration_seconds"
    execute "ALTER TABLE performed_sets DROP COLUMN IF EXISTS intensity_felt"
    execute "ALTER TABLE performed_sets DROP COLUMN IF EXISTS load_unit"
    execute "ALTER TABLE performed_sets DROP COLUMN IF EXISTS load_value"
    execute "ALTER TABLE performed_sets DROP COLUMN IF EXISTS actual_reps"

    execute "ALTER TABLE performed_sets ADD COLUMN IF NOT EXISTS reps INTEGER NOT NULL DEFAULT 0"

    execute "ALTER TABLE performed_sets ADD COLUMN IF NOT EXISTS weight_kg DECIMAL NOT NULL DEFAULT 0"

    # ============================================================================
    # PLANNED_SETS: Restore old columns
    # ============================================================================
    execute "ALTER TABLE planned_sets DROP COLUMN IF EXISTS notes"
    execute "ALTER TABLE planned_sets DROP COLUMN IF EXISTS distance_unit"
    execute "ALTER TABLE planned_sets DROP COLUMN IF EXISTS distance_value"
    execute "ALTER TABLE planned_sets DROP COLUMN IF EXISTS duration_seconds"
    execute "ALTER TABLE planned_sets DROP COLUMN IF EXISTS set_type"
    execute "ALTER TABLE planned_sets DROP COLUMN IF EXISTS tempo"
    execute "ALTER TABLE planned_sets DROP COLUMN IF EXISTS intensity_target"
    execute "ALTER TABLE planned_sets DROP COLUMN IF EXISTS target_reps"

    execute "ALTER TABLE planned_sets ADD COLUMN IF NOT EXISTS reps_min INTEGER"
    execute "ALTER TABLE planned_sets ADD COLUMN IF NOT EXISTS reps_max INTEGER"

    # ============================================================================
    # DROP UNIQUE CONSTRAINTS
    # ============================================================================
    execute "DROP INDEX IF EXISTS performed_sets_workout_session_id_position_index"
    execute "DROP INDEX IF EXISTS planned_sets_workout_element_id_position_index"
    execute "DROP INDEX IF EXISTS planned_workouts_training_plan_id_day_number_index"

    # ============================================================================
    # EXERCISES: Restore slug, make columns not null, remove images
    # ============================================================================
    execute "ALTER TABLE exercises DROP COLUMN IF EXISTS images"
    execute "ALTER TABLE exercises ADD COLUMN IF NOT EXISTS slug VARCHAR(255)"
    execute "CREATE INDEX IF NOT EXISTS exercises_slug_index ON exercises (slug)"
    # Note: Can't easily restore NOT NULL without defaults, leaving as nullable in down

    # ============================================================================
    # MUSCLES: Restore NOT NULL constraint
    # ============================================================================
    # Note: Can't easily restore NOT NULL without clearing nulls, leaving as nullable in down
  end
end
