defmodule Easy.Nutrition.MealLogTest do
  use Easy.SchemaCase, async: false

  alias Easy.Ctx
  alias Easy.MealLogs
  alias Easy.Nutrition.DayMeal
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.FoodLogEntry
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.MealLog
  alias Easy.Nutrition.PlanDay
  alias Easy.Repo

  @date ~D[2026-07-06]

  describe "client activity stamping" do
    test "successful entry create and edit stamp, while failure and delete do not" do
      %{client_ctx: client_ctx, client: client, snack_food: snack_food} = build_scenario()

      invalid_attrs = %{
        date: @date,
        meal_slot: "afternoon_snack",
        food_id: snack_food.id,
        amount: 1.0,
        unit: "unit"
      }

      assert {:error, %Ecto.Changeset{}} =
               MealLogs.add_client_extra(client_ctx, invalid_attrs)

      assert is_nil(Repo.reload(client).last_active_at)

      assert {:ok, entry} =
               MealLogs.add_client_extra(
                 client_ctx,
                 Map.put(invalid_attrs, :weight_g, 120.0)
               )

      assert %DateTime{} = Repo.reload(client).last_active_at

      old_stamp = ~U[2026-07-01 10:30:00Z]
      client |> Ecto.Changeset.change(last_active_at: old_stamp) |> Repo.update!()

      assert {:ok, _updated} =
               MealLogs.update_client_food_log_entry(client_ctx, entry.id, %{weight_g: 100.0})

      updated_stamp = Repo.reload(client).last_active_at
      assert DateTime.after?(updated_stamp, old_stamp)

      assert {:ok, _deleted} = MealLogs.delete_client_food_log_entry(client_ctx, entry.id)
      assert Repo.reload(client).last_active_at == updated_stamp
    end

    test "meal logging stamps only when it creates entries" do
      %{client_ctx: client_ctx, client: client, oats: oats} = build_scenario()

      assert {:ok, [_entry]} =
               MealLogs.log_client_meal(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 meal_id: oats.id
               })

      stamp = Repo.reload(client).last_active_at
      assert %DateTime{} = stamp

      {replay, queries} =
        capture_queries(fn ->
          MealLogs.log_client_meal(client_ctx, %{
            date: @date,
            meal_slot: "breakfast",
            meal_id: oats.id
          })
        end)

      assert {:ok, []} = replay
      assert Repo.reload(client).last_active_at == stamp
      refute Enum.any?(queries, &String.contains?(&1, ~s(UPDATE "clients")))
    end

    test "day logging stamps new entries, while replay and option switching do not" do
      %{client_ctx: client_ctx, client: client, plan: plan, eggs: eggs} = build_scenario()

      {switch_result, switch_queries} =
        capture_queries(fn ->
          MealLogs.switch_client_meal_option(client_ctx, %{
            date: @date,
            meal_slot: "breakfast",
            meal_id: eggs.id
          })
        end)

      assert {:ok, _meal_log} = switch_result
      assert is_nil(Repo.reload(client).last_active_at)
      refute Enum.any?(switch_queries, &String.contains?(&1, ~s(UPDATE "clients")))

      assert {:ok, entries} =
               MealLogs.log_client_day(client_ctx, %{date: @date, plan_id: plan.id})

      assert entries != []
      stamp = Repo.reload(client).last_active_at
      assert %DateTime{} = stamp

      {replay, replay_queries} =
        capture_queries(fn ->
          MealLogs.log_client_day(client_ctx, %{date: @date, plan_id: plan.id})
        end)

      assert {:ok, []} = replay
      assert Repo.reload(client).last_active_at == stamp
      refute Enum.any?(replay_queries, &String.contains?(&1, ~s(UPDATE "clients")))
    end
  end

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

    test "add_client_extra pins on first write; falls back to default option without a meal_id or pin" do
      %{client_ctx: client_ctx, client: client, eggs: eggs, rice: rice, snack_food: snack_food} =
        build_scenario()

      assert {:ok, _entry} =
               MealLogs.add_client_extra(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 meal_id: eggs.id,
                 food_name: "Toast",
                 food_id: snack_food.id,
                 amount: 1.0,
                 unit: "slice",
                 weight_g: 30.0
               })

      breakfast_log = get_meal_log(client.id, @date, "breakfast")
      assert breakfast_log.nutrition_meal_id == eggs.id
      assert breakfast_log.planned_snapshot["meal_name"] == "Eggs"

      # no meal_id and no existing pin for lunch -> falls back to the slot's default option (Rice, position 0)
      assert {:ok, _entry} =
               MealLogs.add_client_extra(client_ctx, %{
                 date: @date,
                 meal_slot: "lunch",
                 food_name: "Extra rice",
                 food_id: snack_food.id,
                 amount: 1.0,
                 unit: "g",
                 weight_g: 20.0
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
        MealLogs.add_client_extra(client_ctx, %{
          date: @date,
          meal_slot: "breakfast",
          food_name: "Extra banana",
          food_id: snack_food.id,
          amount: 1.0,
          unit: "unit",
          weight_g: 120.0
        })

      assert {:ok, switched} =
               MealLogs.switch_client_meal_option(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 meal_id: eggs.id
               })

      assert switched.nutrition_meal_id == eggs.id
      assert switched.planned_snapshot["meal_name"] == "Eggs"

      # Fulfilments are dropped; extras (no planned_item_id) stay.
      assert length(switched.food_log_entries) == 1
      assert hd(switched.food_log_entries).planned_item_id == nil
      assert hd(switched.food_log_entries).food_name == "Extra banana"

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
      assert hd(switched.food_log_entries).planned_item_id
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

    test "add_client_extra with an explicit meal_id returns not_found for another client's meal" do
      %{client_ctx: client_ctx, client: client, business: business, creator: creator} = build_scenario()

      other_client = insert(:client, business: business, creator: creator, assigned_coach: creator)

      other_assigned_plan =
        insert(:plan,
          business: business,
          creator: creator.user,
          client: other_client,
          kind: :client_plan,
          start_date: @date,
          end_date: Date.add(@date, 30)
        )

      other_meal =
        insert(:meal, plan: other_assigned_plan, creator: creator, business: business, name: "Other Client's Meal")

      assert {:error, :not_found} =
               MealLogs.add_client_extra(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 meal_id: other_meal.id,
                 food_name: "Toast",
                 amount: 1.0,
                 unit: "slice",
                 weight_g: 30.0
               })

      refute Repo.get_by(MealLog, client_id: client.id, date: @date, meal_slot: "breakfast")
    end

    test "log_client_day logs the pinned option for a slot, falling back to the default for others" do
      %{client_ctx: client_ctx, client: client, plan: plan, eggs: eggs} = build_scenario()

      # pin breakfast to the non-default option (eggs) without pre-logging any items
      {:ok, _switched} =
        MealLogs.switch_client_meal_option(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: eggs.id})

      assert {:ok, entries} = MealLogs.log_client_day(client_ctx, %{date: @date, plan_id: plan.id})

      food_names = Enum.map(entries, & &1.food_name)
      assert "Egg" in food_names
      refute "Oat Flakes" in food_names
      assert "Rice" in food_names

      assert {:ok, []} = MealLogs.log_client_day(client_ctx, %{date: @date, plan_id: plan.id})

      assert FoodLogEntry
             |> FoodLogEntry.for_client(client_ctx.business_id, client.id)
             |> Repo.aggregate(:count) == 2
    end

    test "log_client_day query count stays flat as slot count grows" do
      %{client_ctx: client_ctx, plan: plan, rice: rice, business: business} = build_scenario()
      day = PlanDay |> PlanDay.for_plan(plan.id) |> Repo.one!()

      DayMeal
      |> DayMeal.for_business(business.id)
      |> DayMeal.for_plan_day(day.id)
      |> DayMeal.for_meal_slot(:lunch)
      |> Repo.delete_all()

      {{:ok, [_breakfast]}, one_slot_queries} =
        count_queries(fn -> MealLogs.log_client_day(client_ctx, %{date: @date, plan_id: plan.id}) end)

      insert(:day_meal,
        plan_day: day,
        meal: rice,
        business: business,
        meal_slot: :lunch,
        position: 0
      )

      next_week = Date.add(@date, 7)

      {{:ok, entries}, two_slot_queries} =
        count_queries(fn -> MealLogs.log_client_day(client_ctx, %{date: next_week, plan_id: plan.id}) end)

      assert length(entries) == 2
      assert two_slot_queries == one_slot_queries
      assert two_slot_queries in 8..9
    end

    test "log_client_day computes servings-sized recipe entries from one loaded batch" do
      %{client_ctx: client_ctx, plan: plan, dal: dal, business: business} = build_scenario()
      day = PlanDay |> PlanDay.for_plan(plan.id) |> Repo.one!()

      insert(:day_meal,
        plan_day: day,
        meal: dal,
        business: business,
        meal_slot: :dinner,
        position: 0
      )

      {{:ok, entries}, recipe_queries} =
        count_queries(fn -> MealLogs.log_client_day(client_ctx, %{date: @date, plan_id: plan.id}) end)

      entry = Enum.find(entries, &(&1.food_name == "Dal Tadka"))

      assert recipe_queries in 9..10
      assert entry.amount == 1.0
      assert entry.weight_g == nil
      assert entry.calories == 400.0
    end
  end

  describe "servings-sized recipe items" do
    test "log_client_meal logs a recipe item sized by servings only (no weight_g)" do
      %{client_ctx: client_ctx, client: client, dal: dal} = build_scenario()

      assert {:ok, [entry]} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "dinner", meal_id: dal.id})

      assert entry.food_name == "Dal Tadka"
      assert is_nil(entry.weight_g)
      assert entry.amount == 1.0
      # recipe totals 800 kcal across 2 servings -> 1 serving = 400 kcal
      assert entry.calories == 400.0

      meal_log = get_meal_log(client.id, @date, "dinner")
      assert get_in(meal_log.planned_snapshot, ["items", Access.at(0), "weight_g"]) == nil
    end

    test "write verbs reject future dates" do
      %{client_ctx: client_ctx, snack_food: snack_food} = build_scenario()

      assert {:error, :future_date} =
               MealLogs.add_client_extra(client_ctx, %{
                 date: Date.add(Date.utc_today(), 1),
                 meal_slot: "breakfast",
                 food_id: snack_food.id,
                 weight_g: 100.0
               })
    end

    test "add_client_extra accepts a recipe with amount and no weight_g" do
      %{client_ctx: client_ctx, dal_recipe: dal_recipe} = build_scenario()

      assert {:ok, entry} =
               MealLogs.add_client_extra(client_ctx, %{
                 date: @date,
                 meal_slot: "dinner",
                 recipe_id: dal_recipe.id,
                 amount: 0.5,
                 unit: "serving"
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

    test "add_client_extra rejects a food without weight_g" do
      %{client_ctx: client_ctx, snack_food: snack_food} = build_scenario()

      assert {:error, %Ecto.Changeset{} = changeset} =
               MealLogs.add_client_extra(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 food_id: snack_food.id,
                 amount: 1.0,
                 unit: "unit"
               })

      assert "is required for food items" in errors_on(changeset).weight_g
    end

    test "add_client_extra rejects a recipe without weight_g or amount" do
      %{client_ctx: client_ctx, dal_recipe: dal_recipe} = build_scenario()

      assert {:error, %Ecto.Changeset{} = changeset} =
               MealLogs.add_client_extra(client_ctx, %{
                 date: @date,
                 meal_slot: "dinner",
                 recipe_id: dal_recipe.id,
                 unit: "serving"
               })

      assert "either weight_g or amount is required for recipe items" in errors_on(changeset).weight_g
    end

    test "add_client_extra rejects grams for a recipe with no cooked_weight_g" do
      %{client_ctx: client_ctx, dal_recipe: dal_recipe} = build_scenario()

      assert {:error, %Ecto.Changeset{} = changeset} =
               MealLogs.add_client_extra(client_ctx, %{
                 date: @date,
                 meal_slot: "dinner",
                 recipe_id: dal_recipe.id,
                 weight_g: 150.0
               })

      assert [message] = errors_on(changeset).weight_g
      assert message =~ "no cooked weight"
    end
  end

  defp coach_ctx(coach) do
    Ctx.new(coach.business_id, coach.user_id, coach.id, false)
  end

  describe "planned-item reconciliation" do
    test "a same-position twin still logs after one item was logged individually" do
      %{client_ctx: client_ctx, business: business, creator: creator, oats: oats} = build_scenario()

      # The builder renounced position uniqueness, so a second item can land on
      # position 0 beside the first.
      oat_flakes = Repo.get_by!(MealItem, nutrition_meal_id: oats.id, position: 0)

      raisins = insert(:food, business: business, creator: creator, name: "Raisins", calories_per_100g: 300.0)

      twin =
        insert(:meal_item,
          meal: oats,
          business: business,
          food: raisins,
          amount: 30.0,
          unit: "g",
          weight_g: 30.0,
          position: 0
        )

      # The client logs one planned item on its own, naming it by id.
      assert {:ok, logged} =
               MealLogs.log_client_planned_item(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 meal_id: oats.id,
                 planned_item_id: oat_flakes.id,
                 amount: 100.0,
                 unit: "g",
                 weight_g: 100.0
               })

      assert logged.planned_item_id == oat_flakes.id

      # Tapping "log meal" must still log the other twin, not skip it as already logged.
      assert {:ok, entries} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})

      assert [%{food_name: "Raisins"}] = entries

      pinned =
        FoodLogEntry
        |> FoodLogEntry.for_meal_log(logged.nutrition_meal_log_id)
        |> Repo.all()
        |> MapSet.new(& &1.planned_item_id)

      # The invariant: both items logged exactly once, neither silently dropped.
      assert pinned == MapSet.new([oat_flakes.id, twin.id])
    end

    test "re-logging the same meal adds nothing" do
      %{client_ctx: client_ctx, oats: oats} = build_scenario()

      assert {:ok, [entry]} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})

      assert entry.planned_item_id

      assert {:ok, []} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})
    end
  end

  # The builder and the diary were designed against each other, and every bug found
  # in this domain has lived in the gap between them. These pin the contract.
  describe "builder <-> logging seam" do
    test "reordering meal items does not re-point logged history" do
      %{client_ctx: client_ctx, business: business, creator: creator, oats: oats} = build_scenario()

      milk = insert(:food, business: business, creator: creator, name: "Milk", calories_per_100g: 60.0)
      first = Repo.get_by!(MealItem, nutrition_meal_id: oats.id, position: 0)

      second =
        insert(:meal_item, meal: oats, business: business, food: milk, weight_g: 200.0, position: 1)

      assert {:ok, entries} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})

      assert length(entries) == 2

      # The coach drags the items into a new order — positions are renumbered.
      Repo.update!(Ecto.Changeset.change(first, position: 1))
      Repo.update!(Ecto.Changeset.change(second, position: 0))

      pinned =
        FoodLogEntry
        |> FoodLogEntry.for_meal_log(hd(entries).nutrition_meal_log_id)
        |> Repo.all()
        |> MapSet.new(& &1.planned_item_id)

      # Reconciliation keys on ids, so yesterday's log still means what it meant.
      assert pinned == MapSet.new([first.id, second.id])

      # And nothing looks un-logged now that the numbering moved.
      assert {:ok, []} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})
    end

    test "editing a food leaves already-logged macros frozen" do
      %{client_ctx: client_ctx, oats: oats} = build_scenario()

      assert {:ok, [entry]} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})

      # Oat Flakes is 300 kcal/100g, logged at 100g.
      assert entry.calories == 300.0

      food = Repo.get!(Food, entry.food_id)
      Repo.update!(Ecto.Changeset.change(food, calories_per_100g: 999.0))

      # The plan would recompute; the diary must not. History is a fact, not a view.
      assert Repo.get!(FoodLogEntry, entry.id).calories == 300.0
    end

    test "deleting a meal item leaves its logged entry readable" do
      %{client_ctx: client_ctx, business: business, oats: oats} = build_scenario()

      assert {:ok, [entry]} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})

      frozen_id = entry.planned_item_id
      Repo.delete!(Repo.get!(MealItem, frozen_id))

      kept = Repo.get!(FoodLogEntry, entry.id)
      assert kept.planned_item_id == frozen_id
      assert kept.food_name == "Oat Flakes"
      assert kept.calories == 300.0

      meal_log =
        MealLog
        |> MealLog.include_entries(business.id)
        |> Repo.get!(kept.nutrition_meal_log_id)

      assert [%{status: :as_planned, planned: %{id: ^frozen_id}}] = MealLogs.diary_rows(meal_log)
    end
  end

  describe "diary rows" do
    test "logging a planned meal yields every item as_planned with no added or skipped" do
      %{client_ctx: client_ctx, client: client, business: business, creator: creator, plan: plan} =
        build_scenario()

      dinner = insert(:meal, plan: plan, creator: creator, business: business, name: "Dinner")

      foods =
        for {name, position} <- [
              {"Chicken", 0},
              {"Rice", 1},
              {"Broccoli", 2},
              {"Sauce", 3},
              {"Yogurt", 4}
            ] do
          food = insert(:food, business: business, creator: creator, name: name, calories_per_100g: 100.0)

          insert(:meal_item,
            meal: dinner,
            business: business,
            food: food,
            amount: 100.0,
            unit: "g",
            weight_g: 100.0,
            position: position
          )

          food
        end

      assert {:ok, entries} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "dinner", meal_id: dinner.id})

      assert length(entries) == 5

      meal_log =
        MealLog
        |> MealLog.for_client(business.id, client.id)
        |> MealLog.for_date(@date)
        |> MealLog.for_meal_slot("dinner")
        |> MealLog.include_entries(business.id)
        |> Repo.one!()

      rows = MealLogs.diary_rows(meal_log)
      assert length(rows) == 5
      assert Enum.all?(rows, &(&1.status == :as_planned))
      refute Enum.any?(rows, &(&1.status in [:added, :skipped]))

      [first | _] = meal_log.planned_snapshot["items"]
      assert first["id"]
      assert first["food_id"] == hd(foods).id
    end

    test "logging one planned item leaves the rest skipped" do
      %{client_ctx: client_ctx, client: client, business: business, creator: creator, oats: oats} =
        build_scenario()

      milk = insert(:food, business: business, creator: creator, name: "Milk", calories_per_100g: 60.0)
      first = Repo.get_by!(MealItem, nutrition_meal_id: oats.id, position: 0)

      insert(:meal_item, meal: oats, business: business, food: milk, weight_g: 200.0, position: 1)

      assert {:ok, _logged} =
               MealLogs.log_client_planned_item(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 meal_id: oats.id,
                 planned_item_id: first.id,
                 amount: 100.0,
                 unit: "g",
                 weight_g: 100.0
               })

      meal_log =
        MealLog
        |> MealLog.for_client(business.id, client.id)
        |> MealLog.for_date(@date)
        |> MealLog.for_meal_slot("breakfast")
        |> MealLog.include_entries(business.id)
        |> Repo.one!()

      statuses = meal_log |> MealLogs.diary_rows() |> Enum.map(& &1.status) |> Enum.sort()
      assert statuses == [:as_planned, :skipped]
    end

    test "replacing a planned item yields swapped; extras yield added" do
      %{client_ctx: client_ctx, client: client, business: business, oats: oats, snack_food: snack} =
        build_scenario()

      oat_item = Repo.get_by!(MealItem, nutrition_meal_id: oats.id, position: 0)

      assert {:ok, _swapped} =
               MealLogs.replace_client_item(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 meal_id: oats.id,
                 planned_item_id: oat_item.id,
                 food_id: snack.id,
                 amount: 120.0,
                 unit: "g",
                 weight_g: 120.0
               })

      assert {:ok, _extra} =
               MealLogs.add_client_extra(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 meal_id: oats.id,
                 food_id: snack.id,
                 amount: 50.0,
                 unit: "g",
                 weight_g: 50.0
               })

      meal_log =
        MealLog
        |> MealLog.for_client(business.id, client.id)
        |> MealLog.for_date(@date)
        |> MealLog.for_meal_slot("breakfast")
        |> MealLog.include_entries(business.id)
        |> Repo.one!()

      statuses = meal_log |> MealLogs.diary_rows() |> Enum.map(& &1.status) |> Enum.sort()
      assert statuses == [:added, :swapped]
    end

    test "changing portion on a matching food stays as_planned" do
      %{client_ctx: client_ctx, client: client, business: business, oats: oats} = build_scenario()

      assert {:ok, [entry]} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})

      assert {:ok, _updated} =
               MealLogs.update_client_food_log_entry(client_ctx, entry.id, %{weight_g: 150.0})

      meal_log =
        MealLog
        |> MealLog.for_client(business.id, client.id)
        |> MealLog.for_date(@date)
        |> MealLog.for_meal_slot("breakfast")
        |> MealLog.include_entries(business.id)
        |> Repo.one!()

      assert [%{status: :as_planned}] = MealLogs.diary_rows(meal_log)
    end

    test "after a fulfilment exists, editing the live meal does not change the freeze" do
      %{client_ctx: client_ctx, client: client, business: business, creator: creator, oats: oats} =
        build_scenario()

      assert {:ok, [_entry]} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})

      before =
        MealLog
        |> MealLog.for_client(business.id, client.id)
        |> MealLog.for_date(@date)
        |> MealLog.for_meal_slot("breakfast")
        |> Repo.one!()

      frozen_items = before.planned_snapshot["items"]

      milk = insert(:food, business: business, creator: creator, name: "Milk", calories_per_100g: 60.0)

      insert(:meal_item, meal: oats, business: business, food: milk, weight_g: 200.0, position: 1)

      # Another write against the same option must not rewrite the freeze.
      assert {:ok, []} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})

      after_log =
        MealLog
        |> MealLog.for_client(business.id, client.id)
        |> MealLog.for_date(@date)
        |> MealLog.for_meal_slot("breakfast")
        |> MealLog.include_entries(business.id)
        |> Repo.one!()

      assert after_log.planned_snapshot["items"] == frozen_items
      assert [%{status: :as_planned}] = MealLogs.diary_rows(after_log)
    end

    test "before any fulfilment, the freeze refreshes from the live meal" do
      %{client_ctx: client_ctx, client: client, business: business, creator: creator, oats: oats, snack_food: snack} =
        build_scenario()

      # Pin the slot with an extra only — no planned fulfilment yet.
      assert {:ok, _extra} =
               MealLogs.add_client_extra(client_ctx, %{
                 date: @date,
                 meal_slot: "breakfast",
                 meal_id: oats.id,
                 food_id: snack.id,
                 amount: 50.0,
                 unit: "g",
                 weight_g: 50.0
               })

      # A corrupt cross-tenant child must neither freeze this tenant's plan nor
      # leak back through the tenant-scoped preload.
      foreign_coach = insert_coach()
      foreign_food = insert(:food, business: foreign_coach.business, creator: foreign_coach)
      breakfast_log = get_meal_log(client.id, @date, "breakfast")

      insert(:food_log_entry,
        meal_log: breakfast_log,
        business: foreign_coach.business,
        food: foreign_food,
        planned_item_id: Ecto.UUID.generate(),
        weight_g: 100.0
      )

      milk = insert(:food, business: business, creator: creator, name: "Milk", calories_per_100g: 60.0)

      insert(:meal_item, meal: oats, business: business, food: milk, weight_g: 200.0, position: 1)

      assert {:ok, entries} =
               MealLogs.log_client_meal(client_ctx, %{date: @date, meal_slot: "breakfast", meal_id: oats.id})

      assert length(entries) == 2

      meal_log =
        MealLog
        |> MealLog.for_client(business.id, client.id)
        |> MealLog.for_date(@date)
        |> MealLog.for_meal_slot("breakfast")
        |> MealLog.include_entries(business.id)
        |> Repo.one!()

      assert length(meal_log.planned_snapshot["items"]) == 2

      statuses = meal_log |> MealLogs.diary_rows() |> Enum.map(& &1.status) |> Enum.sort()
      assert statuses == [:added, :as_planned, :as_planned]
    end
  end

  describe "nutrition day ranges" do
    test "schedule query count stays flat as the date range grows" do
      %{client_ctx: client_ctx} = build_scenario()

      {{:ok, [_day]}, one_day_queries} =
        count_queries(fn -> MealLogs.list_client_nutrition_days(client_ctx, date: @date) end)

      {{:ok, days}, fourteen_day_queries} =
        count_queries(fn ->
          MealLogs.list_client_nutrition_days(client_ctx,
            from: @date,
            to: Date.add(@date, 13)
          )
        end)

      assert length(days) == 14
      assert fourteen_day_queries == one_day_queries
    end
  end

  defp build_scenario do
    coach = insert(:coach)
    business = coach.business
    ctx = coach_ctx(coach)
    client = insert(:client, business: business, creator: coach, assigned_coach: coach)
    client_ctx = %Ctx{business_id: business.id, user_id: client.user_id, client_id: client.id}

    assigned_plan =
      insert(:plan,
        business: business,
        creator: coach.user,
        client: client,
        kind: :client_plan,
        start_date: @date,
        end_date: Date.add(@date, 30)
      )

    day =
      insert(:plan_day,
        plan: assigned_plan,
        business: business,
        name: "Everyday",
        position: 0,
        weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      )

    oats_food =
      insert(:food, creator: coach, business: business, name: "Oat Flakes", calories_per_100g: 300.0)

    oats = insert(:meal, plan: assigned_plan, creator: coach, business: business, name: "Oats")

    insert(:meal_item,
      meal: oats,
      business: business,
      food: oats_food,
      amount: 100.0,
      unit: "g",
      weight_g: 100.0,
      position: 0
    )

    eggs_food = insert(:food, creator: coach, business: business, name: "Egg", calories_per_100g: 150.0)
    eggs = insert(:meal, plan: assigned_plan, creator: coach, business: business, name: "Eggs")

    insert(:meal_item,
      meal: eggs,
      business: business,
      food: eggs_food,
      amount: 2.0,
      unit: "unit",
      weight_g: 100.0,
      position: 0
    )

    rice_food = insert(:food, creator: coach, business: business, name: "Rice", calories_per_100g: 130.0)
    rice = insert(:meal, plan: assigned_plan, creator: coach, business: business, name: "Rice")

    insert(:meal_item,
      meal: rice,
      business: business,
      food: rice_food,
      amount: 150.0,
      unit: "g",
      weight_g: 150.0,
      position: 0
    )

    snack_food =
      insert(:food, creator: coach, business: business, name: "Banana", calories_per_100g: 90.0)

    # A recipe with no cooked weight can only be sized in servings.
    dal_food =
      insert(:food, creator: coach, business: business, name: "Dal", calories_per_100g: 800.0)

    dal_recipe =
      insert(:recipe,
        creator: coach,
        business: business,
        name: "Dal Tadka",
        servings_count: 2,
        cooked_weight_g: nil
      )

    insert(:recipe_ingredient, business: business, recipe: dal_recipe, food: dal_food, weight_g: 100.0)

    dal = insert(:meal, plan: assigned_plan, creator: coach, business: business, name: "Dal Dinner")

    insert(:meal_item,
      meal: dal,
      business: business,
      food: nil,
      recipe: dal_recipe,
      amount: 1.0,
      unit: "serving",
      weight_g: nil,
      position: 0
    )

    insert(:day_meal,
      plan_day: day,
      meal: oats,
      business: business,
      meal_slot: "breakfast",
      position: 0
    )

    insert(:day_meal,
      plan_day: day,
      meal: eggs,
      business: business,
      meal_slot: "breakfast",
      position: 1
    )

    insert(:day_meal,
      plan_day: day,
      meal: rice,
      business: business,
      meal_slot: "lunch",
      position: 0
    )

    %{
      ctx: ctx,
      client: client,
      client_ctx: client_ctx,
      plan: assigned_plan,
      business: business,
      creator: coach,
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

  defp count_queries(fun) do
    {result, queries} = capture_queries(fun)
    {result, length(queries)}
  end

  defp capture_queries(fun) do
    parent = self()
    handler_id = {__MODULE__, make_ref()}

    :telemetry.attach(
      handler_id,
      [:easy, :repo, :query],
      fn _event, _measurements, metadata, _config -> send(parent, {:query, metadata.query}) end,
      nil
    )

    result =
      try do
        fun.()
      after
        :telemetry.detach(handler_id)
      end

    {result, received_queries()}
  end

  defp received_queries(queries \\ []) do
    receive do
      {:query, query} -> received_queries([query | queries])
    after
      0 -> Enum.reverse(queries)
    end
  end
end
