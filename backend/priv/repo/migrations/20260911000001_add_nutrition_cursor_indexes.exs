defmodule Easy.Repo.Migrations.AddNutritionCursorIndexes do
  use Ecto.Migration

  @disable_ddl_transaction true
  @disable_migration_lock true

  def change do
    create index(:nutrition_plans, [:business_id, :kind, :inserted_at, :id], concurrently: true)
    create index(:nutrition_foods, [:business_id, :inserted_at, :id], concurrently: true)
    create index(:nutrition_recipes, [:business_id, :inserted_at, :id], concurrently: true)
  end
end
