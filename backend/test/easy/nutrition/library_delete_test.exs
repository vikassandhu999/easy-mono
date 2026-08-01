defmodule Easy.Nutrition.LibraryDeleteTest do
  use Easy.SchemaCase, async: false

  alias Easy.Ctx
  alias Easy.Foods
  alias Easy.MealLogs
  alias Easy.Nutrition.FoodLogEntry
  alias Easy.Recipes
  alias Easy.Repo

  # Deleting library rows used to raise Ecto.ConstraintError (a 500): `food_id` and
  # `recipe_id` are ON DELETE SET NULL, and nulling one on a meal item violates the
  # food-xor-recipe check. Blocked up front instead, as a conflict.

  describe "delete_food/2" do
    test "is blocked while a meal item still uses the food" do
      %{ctx: ctx, business: business, coach: coach, meal: meal} = scenario()
      food = insert(:food, business: business, creator: coach)
      insert(:meal_item, meal: meal, business: business, food: food, weight_g: 100.0, position: 0)

      assert {:error, :in_use} = Foods.delete_food(ctx, food.id)
      assert Repo.get(Easy.Nutrition.Food, food.id)
    end

    test "is blocked while a recipe ingredient still uses the food" do
      %{ctx: ctx, business: business, coach: coach} = scenario()
      food = insert(:food, business: business, creator: coach)
      recipe = insert(:recipe, business: business, creator: coach)
      insert(:recipe_ingredient, business: business, recipe: recipe, food: food, weight_g: 100.0)

      # Nulling this would silently drop the food's macros from the recipe total.
      assert {:error, :in_use} = Foods.delete_food(ctx, food.id)
    end

    test "succeeds when only a logged entry references the food, and the log survives" do
      %{ctx: ctx, business: business, coach: coach, client_ctx: client_ctx} = scenario()
      food = insert(:food, business: business, creator: coach, name: "Banana", calories_per_100g: 90.0)

      assert {:ok, entry} =
               MealLogs.create_client_food_log_entry(client_ctx, %{
                 date: ~D[2026-07-06],
                 meal_slot: "breakfast",
                 food_id: food.id,
                 weight_g: 100.0,
                 source: :unplanned
               })

      assert {:ok, _deleted} = Foods.delete_food(ctx, food.id)

      # History is denormalised: name and frozen macros outlive the food row.
      kept = Repo.get(FoodLogEntry, entry.id)
      assert kept.food_id == nil
      assert kept.food_name == "Banana"
      assert kept.calories == 90.0
    end
  end

  describe "delete_recipe/2" do
    test "is blocked while a meal item still uses the recipe" do
      %{ctx: ctx, business: business, coach: coach, meal: meal} = scenario()
      recipe = insert(:recipe, business: business, creator: coach, cooked_weight_g: 400.0)
      insert(:meal_item, meal: meal, business: business, food: nil, recipe: recipe, weight_g: 100.0, position: 0)

      assert {:error, :in_use} = Recipes.delete_recipe(ctx, recipe.id)
    end

    test "succeeds when nothing references the recipe" do
      %{ctx: ctx, business: business, coach: coach} = scenario()
      recipe = insert(:recipe, business: business, creator: coach)

      assert {:ok, _deleted} = Recipes.delete_recipe(ctx, recipe.id)
    end
  end

  defp scenario do
    business = insert(:business, owner: build(:user, email: unique_email()))
    coach = insert(:coach, business: business, user: build(:user, email: unique_email()))
    plan = insert(:plan, business: business, creator: coach)
    meal = insert(:meal, plan: plan, business: business, creator: coach)
    client = insert(:client, business: business, creator: coach, assigned_coach: coach)

    %{
      ctx: Ctx.new(business.id, coach.user_id, coach.id, true),
      client_ctx: %Ctx{business_id: business.id, user_id: client.user_id, client_id: client.id},
      business: business,
      coach: coach,
      meal: meal
    }
  end

  defp unique_email, do: "user-#{System.unique_integer([:positive])}@test.com"
end
