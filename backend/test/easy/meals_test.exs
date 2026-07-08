defmodule Easy.MealsTest do
  use Easy.DataCase, async: true

  alias Easy.Meals

  describe "client visibility (trainer-team access control)" do
    setup do
      business = insert(:business)
      insert(:coach, business: business, user: business.owner)
      trainer_a = insert(:coach, business: business)
      trainer_b = insert(:coach, business: business)
      client_b = insert(:client, business: business, creator: trainer_b, assigned_coach: trainer_b)

      template = insert(:plan, business: business, creator: trainer_a)
      client_plan = insert(:plan, business: business, creator: trainer_b, client: client_b)

      template_meal = insert(:meal, plan: template, business: business, creator: trainer_a)
      client_meal = insert(:meal, plan: client_plan, business: business, creator: trainer_b)
      client_meal_item = insert(:meal_item, meal: client_meal, business: business)

      %{
        business: business,
        trainer_a: trainer_a,
        trainer_b: trainer_b,
        client_b: client_b,
        template: template,
        client_plan: client_plan,
        template_meal: template_meal,
        client_meal: client_meal,
        client_meal_item: client_meal_item
      }
    end

    test "get_meal_with_items returns :not_found for a meal on another trainer's client's plan", %{
      trainer_a: trainer_a,
      client_meal: client_meal
    } do
      assert {:error, :not_found} = Meals.get_meal_with_items(trainer_ctx(trainer_a), client_meal.id)
    end

    test "update_meal returns :not_found for a meal on another trainer's client's plan", %{
      trainer_a: trainer_a,
      client_meal: client_meal
    } do
      assert {:error, :not_found} =
               Meals.update_meal(trainer_ctx(trainer_a), client_meal.id, %{"name" => "Hacked"})
    end

    test "delete_meal returns :not_found for a meal on another trainer's client's plan", %{
      trainer_a: trainer_a,
      client_meal: client_meal
    } do
      assert {:error, :not_found} = Meals.delete_meal(trainer_ctx(trainer_a), client_meal.id)
    end

    test "list_meals returns :not_found for a plan belonging to another trainer's client", %{
      trainer_a: trainer_a,
      client_plan: client_plan
    } do
      assert {:error, :not_found} = Meals.list_meals(trainer_ctx(trainer_a), client_plan.id)
    end

    test "create_meal returns :not_found for a plan belonging to another trainer's client", %{
      trainer_a: trainer_a,
      client_plan: client_plan
    } do
      assert {:error, :not_found} =
               Meals.create_meal(trainer_ctx(trainer_a), client_plan.id, %{"name" => "New Meal"})
    end

    test "create_meal_item returns :not_found for a meal on another trainer's client's plan", %{
      trainer_a: trainer_a,
      client_meal: client_meal
    } do
      assert {:error, :not_found} =
               Meals.create_meal_item(trainer_ctx(trainer_a), client_meal.id, %{
                 "weight_g" => 100.0,
                 "food_id" => nil
               })
    end

    test "update_meal_item returns :not_found for an item on another trainer's client's meal", %{
      trainer_a: trainer_a,
      client_meal_item: client_meal_item
    } do
      assert {:error, :not_found} =
               Meals.update_meal_item(trainer_ctx(trainer_a), client_meal_item.id, %{"amount" => 2.0})
    end

    test "delete_meal_item returns :not_found for an item on another trainer's client's meal", %{
      trainer_a: trainer_a,
      client_meal_item: client_meal_item
    } do
      assert {:error, :not_found} = Meals.delete_meal_item(trainer_ctx(trainer_a), client_meal_item.id)
    end

    test "owner ctx can read/update/delete the client-assigned meal and its items", %{
      business: business,
      client_meal: client_meal,
      client_meal_item: client_meal_item
    } do
      ctx = owner_ctx(business)

      assert {:ok, %{id: id}} = Meals.get_meal_with_items(ctx, client_meal.id)
      assert id == client_meal.id

      assert {:ok, _} = Meals.update_meal(ctx, client_meal.id, %{"name" => "Renamed"})
      assert {:ok, _} = Meals.update_meal_item(ctx, client_meal_item.id, %{"amount" => 3.0})
      assert {:ok, _} = Meals.delete_meal_item(ctx, client_meal_item.id)
      assert {:ok, _} = Meals.delete_meal(ctx, client_meal.id)
    end

    test "a template plan's meals (client_id nil) are visible to every trainer — shared library", %{
      trainer_a: trainer_a,
      template_meal: template_meal
    } do
      assert {:ok, %{id: id}} = Meals.get_meal_with_items(trainer_ctx(trainer_a), template_meal.id)
      assert id == template_meal.id
    end
  end
end
