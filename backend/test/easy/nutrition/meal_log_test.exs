defmodule Easy.Nutrition.MealLogTest do
  use Easy.SchemaCase, async: false

  alias Easy.Ctx
  alias Easy.MealLogs
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.MealLog
  alias Easy.Nutrition.PlanDay
  alias Easy.NutritionPlans
  alias Easy.Repo

  @date ~D[2026-07-06]

  describe "recalculate_logged_calories/1" do
    test "returns not found when the meal log no longer exists" do
      coach = insert_coach()

      client =
        insert(:client,
          business: coach.business,
          creator: coach,
          user: build(:user, email: unique_email()),
          email: unique_email()
        )

      meal_log = insert(:meal_log, business: coach.business, client: client)
      Repo.delete!(meal_log)

      assert {:error, :not_found} = MealLogs.recalculate_logged_calories(meal_log)
    end
  end

  describe "chosen-option pinning" do
    test "log_client_meal pins nutrition_meal_id and snapshots the chosen meal" do
      %{client_ctx: client_ctx, client: client, oats: oats} = build_scenario()

      assert {:ok, entries} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})

      assert length(entries) == 1

      meal_log = get_meal_log(client.id, @date, "breakfast")
      assert meal_log.nutrition_meal_id == oats.id
      assert meal_log.planned_snapshot["meal_name"] == "Oats"
    end

    test "create_client_food_log_entry pins on first write; falls back to default option without a meal_id or pin" do
      %{client_ctx: client_ctx, client: client, eggs: eggs, rice: rice, snack_food: snack_food} =
        build_scenario()

      assert {:ok, _entry} =
               MealLogs.create_client_food_log_entry(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 meal_id: eggs.id,
                 food_name: "Toast",
                 food_id: snack_food.id,
                 amount: 1.0,
                 unit: "slice",
                 weight_g: 30.0,
                 source: :unplanned
               })

      breakfast_log = get_meal_log(client.id, @date, "breakfast")
      assert breakfast_log.nutrition_meal_id == eggs.id
      assert breakfast_log.planned_snapshot["meal_name"] == "Eggs"

      # no meal_id and no existing pin for lunch -> falls back to the slot's default option (Rice, position 0)
      assert {:ok, _entry} =
               MealLogs.create_client_food_log_entry(client_ctx, %{
                 date: @date,
                 meal_slot: "lunch",
                 food_name: "Extra rice",
                 food_id: snack_food.id,
                 amount: 1.0,
                 unit: "g",
                 weight_g: 20.0,
                 source: :unplanned
               })

      lunch_log = get_meal_log(client.id, @date, "lunch")
      assert lunch_log.nutrition_meal_id == rice.id
      assert lunch_log.planned_snapshot["meal_name"] == "Rice"
    end

    test "switch_client_meal_option replaces planned/replacement entries, keeps unplanned extras, and recalculates" do
      %{client_ctx: client_ctx, oats: oats, eggs: eggs, snack_food: snack_food} = build_scenario()

      {:ok, _entries} =
        MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})

      {:ok, _extra} =
        MealLogs.create_client_food_log_entry(client_ctx, %{
          date: @date,
          meal_slot: "breakfast",
          food_name: "Extra banana",
          food_id: snack_food.id,
          amount: 1.0,
          unit: "unit",
          weight_g: 120.0,
          source: :unplanned
        })

      assert {:ok, switched} =
               MealLogs.switch_client_meal_option(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 meal_id: eggs.id
               })

      assert switched.nutrition_meal_id == eggs.id
      assert switched.planned_snapshot["meal_name"] == "Eggs"

      sources = Enum.map(switched.food_log_entries, & &1.source)
      assert sources == [:unplanned]

      # snack_food is 90 kcal/100g; the surviving unplanned entry is 120g -> 108.0 kcal
      assert switched.logged_calories == 108.0
    end

    test "switch_client_meal_option to the already-pinned option leaves entries intact" do
      %{client_ctx: client_ctx, oats: oats} = build_scenario()

      {:ok, _entries} =
        MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})

      assert {:ok, switched} =
               MealLogs.switch_client_meal_option(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 meal_id: oats.id
               })

      assert switched.nutrition_meal_id == oats.id
      assert length(switched.food_log_entries) == 1
      assert Enum.map(switched.food_log_entries, & &1.source) == [:planned]
    end

    test "switch_client_meal_option returns not_found for a meal outside the client's plan" do
      %{client_ctx: client_ctx, oats: oats, business: business, creator: creator} = build_scenario()

      {:ok, _} = MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})

      other_plan = insert(:plan, business: business, creator: creator)
      other_meal = insert(:meal, plan: other_plan, creator: creator, business: business)

      assert {:error, :not_found} =
               MealLogs.switch_client_meal_option(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 meal_id: other_meal.id
               })
    end

    test "create_client_food_log_entry with an explicit meal_id returns not_found for another client's meal" do
      %{client_ctx: client_ctx, client: client, business: business, creator: creator} = build_scenario()

      coach_ctx = Ctx.new(business.id, creator.user_id, creator.id, false)
      {:ok, other_template} = NutritionPlans.create_plan(coach_ctx, %{"name" => "Other Template"})
      other_client = insert(:client, business: business, creator: creator)

      {:ok, other_assigned_plan} =
        NutritionPlans.assign_plan_to_client(coach_ctx, other_client.id, other_template.id, %{})

      other_meal =
        insert(:meal, plan: other_assigned_plan, creator: creator, business: business, name: "Other Client's Meal")

      assert {:error, :not_found} =
               MealLogs.create_client_food_log_entry(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 meal_id: other_meal.id,
                 food_name: "Toast",
                 amount: 1.0,
                 unit: "slice",
                 weight_g: 30.0,
                 source: :unplanned
               })

      refute Repo.get_by(MealLog, client_id: client.id, date: @date, meal_slot: "breakfast")
    end

    test "log_client_day logs the pinned option for a slot, falling back to the default for others" do
      %{client_ctx: client_ctx, plan: plan, eggs: eggs} = build_scenario()

      # pin breakfast to the non-default option (eggs) without pre-logging any items
      {:ok, _switched} =
        MealLogs.switch_client_meal_option(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: eggs.id})

      assert {:ok, entries} = MealLogs.log_client_day(client_ctx, %{date: @date, plan_id: plan.id})

      food_names = Enum.map(entries, & &1.food_name)
      assert "Egg" in food_names
      refute "Oat Flakes" in food_names
      assert "Rice" in food_names
    end
  end

  describe "servings-sized recipe items" do
    test "log_client_meal logs a recipe item sized by servings only (no weight_g)" do
      %{client_ctx: client_ctx, dal: dal} = build_scenario()

      assert {:ok, [entry]} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "dinner", meal_id: dal.id})

      assert entry.food_name == "Dal Tadka"
      assert is_nil(entry.weight_g)
      assert entry.amount == 1.0
      # recipe totals 800 kcal across 2 servings -> 1 serving = 400 kcal
      assert entry.calories == 400.0
    end

    test "create_client_food_log_entry accepts a recipe with amount and no weight_g" do
      %{client_ctx: client_ctx, dal_recipe: dal_recipe} = build_scenario()

      assert {:ok, entry} =
               MealLogs.create_client_food_log_entry(client_ctx, %{
                 date: @date,
                 meal_slot: "dinner",
                 recipe_id: dal_recipe.id,
                 amount: 0.5,
                 unit: "serving",
                 source: :unplanned
               })

      assert is_nil(entry.weight_g)
      assert entry.food_name == "Dal Tadka"
      # 800 kcal / 2 servings * 0.5 = 200
      assert entry.calories == 200.0
    end

    test "update recomputes macros when only amount changes on a servings-sized recipe entry" do
      %{client_ctx: client_ctx, dal: dal} = build_scenario()

      {:ok, [entry]} =
        MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "dinner", meal_id: dal.id})

      assert {:ok, updated} =
               MealLogs.update_client_food_log_entry(client_ctx, entry.id, %{amount: 2.0})

      assert updated.amount == 2.0
      assert is_nil(updated.weight_g)
      # 800 kcal / 2 servings * 2 = 800
      assert updated.calories == 800.0
    end

    test "create_client_food_log_entry rejects a food without weight_g" do
      %{client_ctx: client_ctx, snack_food: snack_food} = build_scenario()

      assert {:error, %Ecto.Changeset{} = changeset} =
               MealLogs.create_client_food_log_entry(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 food_id: snack_food.id,
                 amount: 1.0,
                 unit: "unit",
                 source: :unplanned
               })

      assert "is required for food items" in errors_on(changeset).weight_g
    end

    test "create_client_food_log_entry rejects a recipe without weight_g or amount" do
      %{client_ctx: client_ctx, dal_recipe: dal_recipe} = build_scenario()

      assert {:error, %Ecto.Changeset{} = changeset} =
               MealLogs.create_client_food_log_entry(client_ctx, %{
                 date: @date,
                 meal_slot: "dinner",
                 recipe_id: dal_recipe.id,
                 unit: "serving",
                 source: :unplanned
               })

      assert "either weight_g or amount is required for recipe items" in errors_on(changeset).weight_g
    end
  end

  defp ctx_for(plan) do
    Ctx.new(plan.business_id, plan.creator.user_id, plan.creator.id, false)
  end

  describe "planned-item reconciliation" do
    test "a same-position twin still logs after one item was logged individually" do
      %{client_ctx: client_ctx, business: business, creator: creator, oats: oats} = build_scenario()

      # The builder renounced position uniqueness, so a second item can land on
      # position 0 beside the first.
      oat_flakes = Repo.get_by!(MealItem, nutrition_meal_id: oats.id, position: 0)

      raisins = insert(:food, business: business, creator: creator, name: "Raisins", calories_per_100g: 300.0)

      insert(:meal_item,
        meal: oats,
        business: business,
        food: raisins,
        amount: 30.0,
        unit: "g",
        weight_g: 30.0,
        position: 0
      )

      # The client logs one planned item on its own — the app identifies it by position.
      assert {:ok, logged} =
               MealLogs.create_client_food_log_entry(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 meal_id: oats.id,
                 food_id: oat_flakes.food_id,
                 amount: 100.0,
                 unit: "g",
                 weight_g: 100.0,
                 source: :planned,
                 planned_item_index: 0
               })

      assert logged.nutrition_meal_item_id == oat_flakes.id

      # Tapping "log meal" must still log the twin, not skip it as already logged.
      assert {:ok, entries} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})

      assert [%{food_name: "Raisins"}] = entries
    end

    test "re-logging the same meal adds nothing" do
      %{client_ctx: client_ctx, oats: oats} = build_scenario()

      assert {:ok, [entry]} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})

      assert entry.nutrition_meal_item_id

      assert {:ok, []} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})
    end
  end

  defp build_scenario do
    plan = insert(:plan)
    ctx = ctx_for(plan)

    {:ok, template} = NutritionPlans.create_plan(ctx, %{"name" => "Template"})
    client = insert(:client, business: plan.business, assigned_coach: plan.creator)
    client_ctx = %Ctx{business_id: plan.business_id, user_id: client.user_id}
    {:ok, assigned_plan} = NutritionPlans.assign_plan_to_client(ctx, client.id, template.id, %{})

    [day] = PlanDay |> PlanDay.for_plan(assigned_plan.id) |> Repo.all()

    oats_food =
      insert(:food, creator: plan.creator, business: plan.business, name: "Oat Flakes", calories_per_100g: 300.0)

    oats = insert(:meal, plan: assigned_plan, creator: plan.creator, business: plan.business, name: "Oats")

    insert(:meal_item,
      meal: oats,
      business: plan.business,
      food: oats_food,
      amount: 100.0,
      unit: "g",
      weight_g: 100.0,
      position: 0
    )

    eggs_food = insert(:food, creator: plan.creator, business: plan.business, name: "Egg", calories_per_100g: 150.0)
    eggs = insert(:meal, plan: assigned_plan, creator: plan.creator, business: plan.business, name: "Eggs")

    insert(:meal_item,
      meal: eggs,
      business: plan.business,
      food: eggs_food,
      amount: 2.0,
      unit: "unit",
      weight_g: 100.0,
      position: 0
    )

    rice_food = insert(:food, creator: plan.creator, business: plan.business, name: "Rice", calories_per_100g: 130.0)
    rice = insert(:meal, plan: assigned_plan, creator: plan.creator, business: plan.business, name: "Rice")

    insert(:meal_item,
      meal: rice,
      business: plan.business,
      food: rice_food,
      amount: 150.0,
      unit: "g",
      weight_g: 150.0,
      position: 0
    )

    snack_food =
      insert(:food, creator: plan.creator, business: plan.business, name: "Banana", calories_per_100g: 90.0)

    # A recipe with no cooked weight can only be sized in servings.
    dal_food =
      insert(:food, creator: plan.creator, business: plan.business, name: "Dal", calories_per_100g: 800.0)

    dal_recipe =
      insert(:recipe,
        creator: plan.creator,
        business: plan.business,
        name: "Dal Tadka",
        servings_count: 2,
        cooked_weight_g: nil
      )

    insert(:recipe_ingredient, business: plan.business, recipe: dal_recipe, food: dal_food, weight_g: 100.0)

    dal = insert(:meal, plan: assigned_plan, creator: plan.creator, business: plan.business, name: "Dal Dinner")

    insert(:meal_item,
      meal: dal,
      business: plan.business,
      food: nil,
      recipe: dal_recipe,
      amount: 1.0,
      unit: "serving",
      weight_g: nil,
      position: 0
    )

    {:ok, _} =
      NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "breakfast", nutrition_meal_id: oats.id})

    {:ok, _} =
      NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "breakfast", nutrition_meal_id: eggs.id})

    {:ok, _} =
      NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "lunch", nutrition_meal_id: rice.id})

    %{
      ctx: ctx,
      client: client,
      client_ctx: client_ctx,
      plan: assigned_plan,
      business: plan.business,
      creator: plan.creator,
      oats: oats,
      eggs: eggs,
      rice: rice,
      dal: dal,
      dal_recipe: dal_recipe,
      snack_food: snack_food
    }
  end

  defp get_meal_log(client_id, date, meal_slot) do
    MealLog
    |> MealLog.for_date(date)
    |> MealLog.for_meal_slot(meal_slot)
    |> Repo.get_by!(client_id: client_id)
  end

  defp insert_coach do
    business = insert(:business, owner: build(:user, email: unique_email()))
    insert(:coach, business: business, user: build(:user, email: unique_email()))
  end

  defp unique_email do
    "user-#{System.unique_integer([:positive])}@test.com"
  end
end
