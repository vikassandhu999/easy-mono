defmodule Easy.Repo.Migrations.DropLegacyWorkoutData do
  use Ecto.Migration

  # Approved by the user on 2026-10-20 after activity logging replaced these fields.
  def up do
    execute(
      "ALTER TABLE exercises DROP COLUMN count_label, DROP COLUMN grade_scale, DROP COLUMN unilateral, DROP COLUMN media"
    )

    execute("ALTER TABLE workouts DROP COLUMN video")

    execute(
      "ALTER TABLE workout_logs DROP COLUMN difficulty, DROP COLUMN pain_note, DROP COLUMN swaps"
    )

    execute("ALTER TABLE exercise_sets DROP COLUMN exercise_snapshot")
    execute("DROP TABLE legacy_workout_entries, legacy_exercise_groups")
  end

  def down, do: raise("Legacy workout data removal is irreversible")
end
