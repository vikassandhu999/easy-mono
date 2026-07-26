defmodule Easy.Repo.Migrations.AddFoodSugarAndBackfillSource do
  use Ecto.Migration

  def up do
    alter table(:nutrition_foods) do
      add :sugar_g_per_100g, :float
    end

    execute """
    UPDATE nutrition_foods SET source = 'custom' WHERE source IS NULL AND business_id IS NOT NULL
    """
  end

  def down do
    alter table(:nutrition_foods) do
      remove :sugar_g_per_100g
    end
  end
end
