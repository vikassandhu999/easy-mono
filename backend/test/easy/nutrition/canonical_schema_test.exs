defmodule Easy.Nutrition.CanonicalSchemaTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.Programming

  describe "canonical Nutrition Programming constraints" do
    test "the database rejects client-plan fields on a template" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_plans", [
          plan_row(coach,
            kind: "template",
            client_id: dump_uuid(client.id),
            start_date: ~D[2026-08-15]
          )
        ])
      end
    end

    test "the database rejects an unknown plan kind" do
      coach = insert(:coach)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_plans", [plan_row(coach, kind: "program")])
      end
    end

    test "Day Pattern positions are nonnegative and unique within a plan" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_day_patterns", [
          timestamps(%{
            id: dump_uuid(),
            name: "Invalid",
            position: -1,
            business_id: dump_uuid(coach.business_id),
            nutrition_plan_id: dump_uuid(plan.id)
          })
        ])
      end

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_day_patterns", [pattern_row(coach, plan, position: 0)])
      end
    end

    test "a schedule row cannot point at a Day Pattern from another plan" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, first} = Programming.create_template(ctx, %{"name" => "First"})
      assert {:ok, second} = Programming.create_template(ctx, %{"name" => "Second"})
      pattern = hd(first.day_patterns)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_week_schedule", [
          timestamps(%{
            id: dump_uuid(),
            weekday: "monday",
            business_id: dump_uuid(coach.business_id),
            nutrition_plan_id: dump_uuid(second.id),
            nutrition_day_pattern_id: dump_uuid(pattern.id)
          })
        ])
      end
    end

    test "a plan has at most one Day Pattern per weekday" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})
      pattern = hd(plan.day_patterns)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_week_schedule", [
          schedule_row(coach, plan, pattern, weekday: "monday")
        ])
      end
    end

    test "Meal positions are nonnegative and unique within a plan" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meals", [meal_row(coach, plan, position: -1)])
      end

      Repo.insert_all("nutrition_meals", [meal_row(coach, plan, position: 0)])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meals", [meal_row(coach, plan, position: 0)])
      end
    end

    test "a Menu Item cannot belong to a Meal from another plan" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, first} = Programming.create_template(ctx, %{"name" => "First"})
      assert {:ok, second} = Programming.create_template(ctx, %{"name" => "Second"})
      food = insert(:food, business: coach.business, creator: coach)
      {1, [%{id: meal_id}]} = Repo.insert_all("nutrition_meals", [meal_row(coach, first)], returning: [:id])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_items", [
          meal_item_row(coach, second, meal_id, food, nutrition_plan_id: dump_uuid(second.id))
        ])
      end
    end

    test "a Menu Item requires exactly one of food_id or recipe_id" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})
      food = insert(:food, business: coach.business, creator: coach)
      recipe = insert(:recipe, business: coach.business, creator: coach)
      {1, [%{id: meal_id}]} = Repo.insert_all("nutrition_meals", [meal_row(coach, plan)], returning: [:id])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_items", [
          meal_item_row(coach, plan, meal_id, food, food_id: nil, recipe_id: nil)
        ])
      end

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_items", [
          meal_item_row(coach, plan, meal_id, food,
            food_id: dump_uuid(food.id),
            recipe_id: dump_uuid(recipe.id)
          )
        ])
      end
    end

    test "gram Portions require positive grams and null serving fields" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})
      food = insert(:food, business: coach.business, creator: coach)
      {1, [%{id: meal_id}]} = Repo.insert_all("nutrition_meals", [meal_row(coach, plan)], returning: [:id])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_items", [
          meal_item_row(coach, plan, meal_id, food, weight_g: 0)
        ])
      end

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_items", [
          meal_item_row(coach, plan, meal_id, food, amount: 1.0, unit: "cup")
        ])
      end
    end

    test "Menu Item positions are unique within a Meal" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})
      food = insert(:food, business: coach.business, creator: coach)
      {1, [%{id: meal_id}]} = Repo.insert_all("nutrition_meals", [meal_row(coach, plan)], returning: [:id])

      Repo.insert_all("nutrition_meal_items", [meal_item_row(coach, plan, meal_id, food)])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_items", [meal_item_row(coach, plan, meal_id, food)])
      end
    end

    test "nutrient columns reject negative values" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})
      food = insert(:food, business: coach.business, creator: coach)
      {1, [%{id: meal_id}]} = Repo.insert_all("nutrition_meals", [meal_row(coach, plan)], returning: [:id])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_items", [
          meal_item_row(coach, plan, meal_id, food, calories: -1.0)
        ])
      end
    end

    test "retained Library rows survive the Programming reset" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach, name: "Kept Food")
      recipe = insert(:recipe, business: coach.business, creator: coach, name: "Kept Recipe")
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      assert Repo.get!(Easy.Nutrition.Food, food.id).name == "Kept Food"
      assert Repo.get!(Easy.Nutrition.Recipe, recipe.id).name == "Kept Recipe"
      assert Repo.get!(Easy.Clients.Client, client.id)
      assert Repo.get!(Easy.Orgs.Business, coach.business_id)
    end
  end

  defp plan_row(coach, overrides) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          kind: "template",
          name: "Row",
          revision: 1,
          business_id: dump_uuid(coach.business_id),
          creator_id: dump_uuid(coach.user_id)
        },
        Map.new(overrides)
      )
    )
  end

  defp pattern_row(coach, plan, overrides) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          name: "Extra",
          position: 0,
          business_id: dump_uuid(coach.business_id),
          nutrition_plan_id: dump_uuid(plan.id)
        },
        Map.new(overrides)
      )
    )
  end

  defp schedule_row(coach, plan, pattern, overrides) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          weekday: "monday",
          business_id: dump_uuid(coach.business_id),
          nutrition_plan_id: dump_uuid(plan.id),
          nutrition_day_pattern_id: dump_uuid(pattern.id)
        },
        Map.new(overrides)
      )
    )
  end

  defp meal_row(coach, plan, overrides \\ []) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          name: "Breakfast",
          position: 0,
          business_id: dump_uuid(coach.business_id),
          nutrition_plan_id: dump_uuid(plan.id)
        },
        Map.new(overrides)
      )
    )
  end

  defp meal_item_row(coach, plan, meal_id, food, overrides \\ []) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          portion_kind: "gram",
          weight_g: 50.0,
          amount: nil,
          unit: nil,
          serving_label: nil,
          position: 0,
          complete: false,
          food_id: dump_uuid(food.id),
          recipe_id: nil,
          business_id: dump_uuid(coach.business_id),
          nutrition_plan_id: dump_uuid(plan.id),
          nutrition_meal_id: meal_id
        },
        Map.new(overrides)
      )
    )
  end

  defp timestamps(attrs) do
    now = DateTime.utc_now(:second)
    Map.merge(%{inserted_at: now, updated_at: now}, attrs)
  end

  defp dump_uuid(uuid \\ Ecto.UUID.generate()), do: Ecto.UUID.dump!(uuid)
end
