defmodule Easy.Repo.Migrations.RemoveTimestampsFromExerciseJoinTables do
  use Ecto.Migration

  def up do
    execute "ALTER TABLE exercise_muscles DROP COLUMN IF EXISTS inserted_at"
    execute "ALTER TABLE exercise_muscles DROP COLUMN IF EXISTS updated_at"
    execute "ALTER TABLE exercise_equipment DROP COLUMN IF EXISTS inserted_at"
    execute "ALTER TABLE exercise_equipment DROP COLUMN IF EXISTS updated_at"
  end

  def down do
    raise Ecto.MigrationError, message: "exercise join table timestamp removal is not reversible"
  end
end
