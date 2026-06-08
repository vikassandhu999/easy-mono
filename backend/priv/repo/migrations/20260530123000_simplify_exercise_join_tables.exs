defmodule Easy.Repo.Migrations.SimplifyExerciseJoinTables do
  use Ecto.Migration

  def up do
    execute "ALTER TABLE exercise_muscles DROP COLUMN IF EXISTS role"
    execute "ALTER TABLE exercise_muscles DROP COLUMN IF EXISTS id"
    execute "ALTER TABLE exercise_muscles DROP COLUMN IF EXISTS inserted_at"
    execute "ALTER TABLE exercise_muscles DROP COLUMN IF EXISTS updated_at"

    execute "ALTER TABLE exercise_equipment DROP COLUMN IF EXISTS id"
    execute "ALTER TABLE exercise_equipment DROP COLUMN IF EXISTS inserted_at"
    execute "ALTER TABLE exercise_equipment DROP COLUMN IF EXISTS updated_at"
  end

  def down do
    raise Ecto.MigrationError, message: "exercise join table simplification is not reversible"
  end
end
