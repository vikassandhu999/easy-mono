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

    test "create_meal_items returns :not_found for a meal on another trainer's client's plan", %{
      trainer_a: trainer_a,
      client_meal: client_meal
    } do
      assert {:error, :not_found} =
               Meals.create_meal_items(trainer_ctx(trainer_a), client_meal.id, [
                 %{weight_g: 100.0, food_id: nil}
               ])
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

  describe "create_meal_items/3" do
    setup do
      business = insert(:business)
      coach = insert(:coach, business: business, user: business.owner)
      plan = insert(:plan, business: business, creator: coach)
      meal = insert(:meal, plan: plan, business: business, creator: coach)
      food = insert(:food, business: business, creator: coach)
      other_food = insert(:food, business: business, creator: coach)

      %{ctx: owner_ctx(business), business: business, meal: meal, food: food, other_food: other_food}
    end

    test "inserts in the given order, appending after existing items", %{
      ctx: ctx,
      meal: meal,
      food: food,
      other_food: other_food
    } do
      {:ok, [first]} = Meals.create_meal_items(ctx, meal.id, [%{weight_g: 100.0, food_id: food.id}])
      assert first.position == 0

      {:ok, items} =
        Meals.create_meal_items(ctx, meal.id, [
          %{weight_g: 50.0, food_id: other_food.id},
          %{weight_g: 75.0, food_id: food.id}
        ])

      assert Enum.map(items, & &1.position) == [1, 2]
      assert Enum.map(items, & &1.food_id) == [other_food.id, food.id]
    end

    test "a request-supplied position is ignored — the server appends", %{ctx: ctx, meal: meal, food: food} do
      assert {:ok, [item]} =
               Meals.create_meal_items(ctx, meal.id, [%{weight_g: 100.0, food_id: food.id, position: 7}])

      assert item.position == 0
    end

    test "one bad item fails the whole batch", %{ctx: ctx, meal: meal, food: food} do
      assert {:error, %Ecto.Changeset{}} =
               Meals.create_meal_items(ctx, meal.id, [
                 %{weight_g: 100.0, food_id: food.id},
                 %{weight_g: 100.0}
               ])

      assert {:ok, %{meal_items: []}} = Meals.get_meal_with_items(ctx, meal.id)
    end

    test "a food from another business fails the whole batch", %{ctx: ctx, meal: meal, food: food} do
      foreign_food = insert(:food)

      assert {:error, :not_found} =
               Meals.create_meal_items(ctx, meal.id, [
                 %{weight_g: 100.0, food_id: food.id},
                 %{weight_g: 100.0, food_id: foreign_food.id}
               ])

      assert {:ok, %{meal_items: []}} = Meals.get_meal_with_items(ctx, meal.id)
    end

    test "a recipe from another business is rejected", %{ctx: ctx, meal: meal} do
      foreign_recipe = insert(:recipe)

      assert {:error, :not_found} =
               Meals.create_meal_items(ctx, meal.id, [
                 %{amount: 1.0, unit: "serving", recipe_id: foreign_recipe.id}
               ])
    end

    test "a system food is accepted", %{ctx: ctx, meal: meal} do
      system_food = insert(:food, business: nil, creator: nil)

      assert {:ok, [item]} = Meals.create_meal_items(ctx, meal.id, [%{weight_g: 100.0, food_id: system_food.id}])
      assert item.food_id == system_food.id
    end
  end
end
