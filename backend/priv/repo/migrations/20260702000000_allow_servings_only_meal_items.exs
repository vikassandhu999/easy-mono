defmodule Easy.Repo.Migrations.AllowServingsOnlyMealItems do
  use Ecto.Migration

  # Recipe meal items may be sized by servings (amount/unit) instead of grams —
  # e.g. a recipe with no cooked weight recorded. The weight_positive CHECK
  # already passes NULLs, so only the NOT NULL needs to go.
  def change do
    execute(
      "ALTER TABLE nutrition_meal_items ALTER COLUMN weight_g DROP NOT NULL",
      "ALTER TABLE nutrition_meal_items ALTER COLUMN weight_g SET NOT NULL"
    )
  end
end
