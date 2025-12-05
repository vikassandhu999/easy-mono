defmodule Easy.Repo.Migrations.AddExercisesInsertedAtIndex do
  use Ecto.Migration

  @disable_ddl_transaction true
  @disable_migration_lock true

  def change do
    # Add index on inserted_at for efficient ordering in list_exercises
    # Using DESC for optimal performance with ORDER BY inserted_at DESC
    create index(:exercises, [:inserted_at], concurrently: true)
  end
end
