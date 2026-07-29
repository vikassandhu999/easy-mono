defmodule Easy.Repo.Migrations.RequireRecipeServingsCount do
  use Ecto.Migration

  # A recipe's macros are the sum of its ingredients; portioning needs a denominator.
  # `servings_count` divides the dish into portions, `cooked_weight_g` converts grams
  # of dish to a fraction of it. A missing denominator used to fall back to "the whole
  # recipe", silently pricing one portion as the entire pot.
  #
  # `servings_count` is always answerable — the coach decides how many portions a
  # recipe makes, no scale required — so it is required. `cooked_weight_g` needs a
  # measurement, so it stays optional and instead gates gram-sizing at write time.
  def up do
    execute("UPDATE nutrition_recipes SET servings_count = 1 WHERE servings_count IS NULL")

    alter table(:nutrition_recipes) do
      modify :servings_count, :integer, null: false
    end

    create constraint(:nutrition_recipes, :nutrition_recipes_servings_count_positive,
             check: "servings_count > 0"
           )
  end

  def down do
    drop constraint(:nutrition_recipes, :nutrition_recipes_servings_count_positive)

    alter table(:nutrition_recipes) do
      modify :servings_count, :integer, null: true
    end
  end
end
