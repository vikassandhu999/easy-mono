defmodule EasyWeb.NutritionControllerBoundaryTest do
  use ExUnit.Case, async: true

  @nutrition_controllers [
    "lib/easy_web/controllers/coaches/food_controller.ex",
    "lib/easy_web/controllers/clients/food_controller.ex",
    "lib/easy_web/controllers/coaches/recipe_controller.ex",
    "lib/easy_web/controllers/clients/recipe_controller.ex",
    "lib/easy_web/controllers/coaches/meal_controller.ex",
    "lib/easy_web/controllers/coaches/meal_item_controller.ex",
    "lib/easy_web/controllers/coaches/plan_item_controller.ex",
    "lib/easy_web/controllers/coaches/nutrition_plan_controller.ex",
    "lib/easy_web/controllers/clients/nutrition_plan_controller.ex",
    "lib/easy_web/controllers/coaches/meal_log_controller.ex",
    "lib/easy_web/controllers/clients/meal_log_controller.ex",
    "lib/easy_web/controllers/coaches/food_log_entry_controller.ex",
    "lib/easy_web/controllers/clients/food_log_entry_controller.ex"
  ]

  test "nutrition controllers do not call Repo directly" do
    for path <- @nutrition_controllers do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ "alias Easy.Repo", path
      refute source =~ ~r/\bRepo\./, path
    end
  end
end
