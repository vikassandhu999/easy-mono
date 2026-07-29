defmodule Easy.Repo.Migrations.DropRecipeServingSizes do
  use Ecto.Migration

  # A recipe has a yield: `cooked_weight_g` (mass produced) and `servings_count`
  # (portions it divides into). One serving is therefore cooked_weight_g /
  # servings_count — derivable, so storing serving sizes on a recipe restated an
  # answer the recipe already held. Nothing in MacroCalc ever read it; only the
  # frontend did, and only to find any one count->gram mapping.
  #
  # Foods keep theirs: a food has no yield, so a dictionary is the only bridge from
  # "2 slices" to grams.
  def up do
    alter table(:nutrition_recipes) do
      remove :serving_sizes
    end
  end

  # Restores the column, not its contents.
  def down do
    alter table(:nutrition_recipes) do
      add :serving_sizes, :jsonb, default: "[]"
    end
  end
end
