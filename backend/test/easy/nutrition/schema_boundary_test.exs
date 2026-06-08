defmodule Easy.Nutrition.SchemaBoundaryTest do
  use ExUnit.Case, async: true

  @schema_paths [
    "lib/easy/nutrition/food.ex",
    "lib/easy/nutrition/food_log_entry.ex",
    "lib/easy/nutrition/meal.ex",
    "lib/easy/nutrition/meal_item.ex",
    "lib/easy/nutrition/meal_log.ex",
    "lib/easy/nutrition/plan.ex",
    "lib/easy/nutrition/plan_item.ex",
    "lib/easy/nutrition/recipe.ex",
    "lib/easy/nutrition/recipe_ingredient.ex",
    "lib/easy/nutrition/serving_size.ex"
  ]

  @context_verbs [
    "assign_to_client",
    "copy_day",
    "create",
    "delete",
    "delete_entry",
    "duplicate",
    "find_or_create",
    "log_day",
    "log_entry",
    "log_meal",
    "macros",
    "recalculate_logged_calories",
    "shopping_list",
    "update",
    "update_entry"
  ]

  test "nutrition schemas do not call Repo" do
    for path <- @schema_paths do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ "alias Easy.Repo", path
      refute source =~ ~r/\bRepo\./, path
    end
  end

  test "nutrition schemas do not expose context workflow functions" do
    verb_pattern = Enum.join(@context_verbs, "|")

    for path <- @schema_paths do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ ~r/^\s+def (#{verb_pattern})\b/m, path
    end
  end
end
