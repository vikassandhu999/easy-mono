defmodule Easy.Repo.Migrations.AddExerciseCursorIndex do
  use Ecto.Migration

  @disable_ddl_transaction true
  @disable_migration_lock true

  def change do
    create index(:training_exercises, [:business_id, :inserted_at, :id], concurrently: true)
  end
end
