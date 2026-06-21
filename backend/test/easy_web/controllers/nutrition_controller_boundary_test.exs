defmodule EasyWeb.NutritionControllerBoundaryTest do
  use ExUnit.Case, async: true

  @nutrition_controllers [
    "lib/easy_web/controllers/coaches/food_controller.ex",
    "lib/easy_web/controllers/clients/food_controller.ex",
    "lib/easy_web/controllers/coaches/recipe_controller.ex",
    "lib/easy_web/controllers/clients/recipe_controller.ex",
    "lib/easy_web/controllers/coaches/meal_controller.ex",
    "lib/easy_web/controllers/coaches/meal_item_controller.ex",
    "lib/easy_web/controllers/coaches/schedule_controller.ex",
    "lib/easy_web/controllers/coaches/nutrition_plan_controller.ex",
    "lib/easy_web/controllers/clients/nutrition_plan_controller.ex",
    "lib/easy_web/controllers/coaches/meal_log_controller.ex",
    "lib/easy_web/controllers/clients/meal_log_controller.ex",
    "lib/easy_web/controllers/coaches/food_log_entry_controller.ex",
    "lib/easy_web/controllers/clients/food_log_entry_controller.ex"
  ]

  @pure_nutrition_controllers @nutrition_controllers ++
                                [
                                  "lib/easy_web/controllers/coaches/client_plan_controller.ex"
                                ]

  test "nutrition controllers do not call Repo directly" do
    for path <- @nutrition_controllers do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ "alias Easy.Repo", path
      refute source =~ ~r/\bRepo\./, path
    end
  end

  test "nutrition controllers do not perform client or coach lookups" do
    for path <- @pure_nutrition_controllers do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ "alias Easy.Clients", path
      refute source =~ "alias Easy.Coaches", path
      refute source =~ ~r/\bClient(Read|s)?\.\w+\(/, path
      refute source =~ ~r/\bCoaches\.\w+\(/, path
    end
  end

  test "nutrition controllers do not call schema actions or the old read boundary" do
    for path <- @pure_nutrition_controllers do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ "alias Easy.Nutrition.Reads", path
      refute source =~ "alias Easy.Nutrition.MealLogging", path

      refute source =~
               ~r/\b(Food|Recipe|Meal|MealItem|ScheduleEntry)\.(create|update|delete)\(/,
             path
    end
  end
end
