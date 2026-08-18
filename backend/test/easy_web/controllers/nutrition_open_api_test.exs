defmodule EasyWeb.NutritionOpenApiTest do
  use ExUnit.Case, async: true

  @legacy_paths [
    "/v1/coach/clients/{client_id}/nutrition-meal-logs",
    "/v1/client/nutrition-meal-logs",
    "/v1/client/nutrition-food-log-entries/log-planned-item",
    "/v1/client/nutrition-food-log-entries/add-extra",
    "/v1/client/nutrition-food-log-entries/replace-item",
    "/v1/client/nutrition-food-log-entries/log-meal",
    "/v1/client/nutrition-food-log-entries/log-day",
    "/v1/client/nutrition-food-log-entries/switch-option",
    "/v1/client/nutrition-food-log-entries/{id}",
    "/v1/coach/nutrition-plans/{plan_id}/days",
    "/v1/coach/nutrition-plan-days/{id}",
    "/v1/coach/nutrition-plan-days/{day_id}/meals",
    "/v1/coach/nutrition-day-meals/{id}",
    "/v1/coach/nutrition-plans/{plan_id}/meals",
    "/v1/coach/nutrition-meals/{id}",
    "/v1/coach/nutrition-meals/{meal_id}/items",
    "/v1/coach/nutrition-meal-items/{id}"
  ]

  @legacy_schemas [
    "MealLog",
    "MealLogListResponse",
    "MealLogDiaryRow",
    "MealLogPlannedItem",
    "FoodLogEntry",
    "FoodLogEntryResponse",
    "FoodLogEntryListResponse",
    "NutritionMealLogResponse",
    "NutritionPlanDay",
    "NutritionDayMeal",
    "NutritionDayMealWithMeal",
    "NutritionPlanDayCreateRequest",
    "NutritionPlanDayUpdateRequest",
    "NutritionDayMealCreateRequest",
    "LogPlannedItemRequest",
    "AddExtraRequest",
    "ReplaceItemRequest",
    "LogMealRequest",
    "LogDayRequest",
    "UpdatePortionRequest",
    "NutritionSwitchOptionRequest"
  ]

  test "generated OpenAPI keeps Food, Recipe, and plan families with aggregate Menu writes" do
    paths = EasyWeb.ApiSpec.spec().paths

    assert Map.has_key?(paths, "/v1/coach/nutrition-foods")
    assert Map.has_key?(paths, "/v1/coach/nutrition-recipes")
    assert Map.has_key?(paths, "/v1/coach/nutrition-plans")
    assert paths["/v1/coach/nutrition-plans/{id}/menu"].put
    assert paths["/v1/client/nutrition-days"].get
    assert paths["/v1/client/nutrition-days/{date}/extras"].post
    assert paths["/v1/coach/clients/{client_id}/nutrition-days"].get
  end

  test "generated OpenAPI documents plan kind, Portion, completeness, Meal Slot, Nutrition Day, status, revision, and idempotency" do
    spec = EasyWeb.ApiSpec.spec() |> OpenApiSpex.resolve_schema_modules()
    schemas = spec.components.schemas
    plan = schemas["NutritionPlan"]
    portion = schemas["NutritionPortion"]
    totals = schemas["NutrientTotals"]
    slot = schemas["NutritionDaySlot"]
    day = schemas["NutritionDay"]
    extra = spec.paths["/v1/client/nutrition-days/{date}/extras"].post

    assert plan.properties.kind.enum == ["template", "client_plan"]
    assert :revision in plan.required
    assert portion.properties.kind.enum == ["gram", "serving"]
    assert :complete in totals.required
    assert totals.properties.calories.nullable
    assert slot.properties.meal_slot.enum == Easy.Nutrition.MealSlot.names()
    assert :summary in day.required
    assert extra.parameters |> Enum.find(&(&1.name == :"Idempotency-Key")) |> Map.fetch!(:required)
  end

  test "generated OpenAPI does not include replaced child-resource or raw-log contracts" do
    spec = EasyWeb.ApiSpec.spec() |> OpenApiSpex.resolve_schema_modules()
    paths = spec.paths
    components = Map.keys(spec.components.schemas)

    for path <- @legacy_paths do
      refute Map.has_key?(paths, path), path
    end

    for schema <- @legacy_schemas do
      refute schema in components, schema
    end
  end
end
