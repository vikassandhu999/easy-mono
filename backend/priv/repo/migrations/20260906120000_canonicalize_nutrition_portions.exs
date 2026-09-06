defmodule Easy.Repo.Migrations.CanonicalizeNutritionPortions do
  use Ecto.Migration

  @tables [:nutrition_meal_items, :nutrition_diary_frozen_planned_items, :nutrition_diary_entries]

  def up do
    for table <- @tables do
      recipe =
        if table == :nutrition_meal_items, do: "recipe_id IS NOT NULL", else: "kind = 'recipe'"

      execute """
      UPDATE #{table} SET unit = 'serving', serving_label = NULL
      WHERE portion_kind = 'serving' AND #{recipe}
      """

      create constraint(table, "#{table}_canonical_portion_check",
               check: """
               (portion_kind = 'gram' AND weight_g IS NOT NULL AND weight_g > 0)
               OR (portion_kind = 'serving' AND amount IS NOT NULL AND amount > 0
                   AND unit IS NOT NULL AND unit <> '')
               """
             )
    end
  end

  def down do
    for table <- @tables do
      drop constraint(table, "#{table}_canonical_portion_check")
    end
  end
end
