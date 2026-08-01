unless Code.ensure_loaded?(Easy.Repo.Migrations.CreateNutritionPlanDays) do
  Code.require_file(
    "../../priv/repo/migrations/20260706120000_create_nutrition_plan_days.exs",
    __DIR__
  )
end

defmodule Easy.NutritionPlanDaysTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.DayMeal
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.PlanDay
  alias Easy.NutritionPlans
  alias Easy.Repo

  defp ctx_for(plan) do
    coach = plan.creator
    Easy.Ctx.new(plan.business_id, coach.user_id, coach.id, false)
  end

  describe "create_plan/2 seeds day structure" do
    test "new plan has one Everyday day owning all 7 weekdays" do
      plan = insert(:plan)
      ctx = ctx_for(plan)

      {:ok, created} = NutritionPlans.create_plan(ctx, params_for_plan())

      [day] = PlanDay |> PlanDay.for_plan(created.id) |> Repo.all()
      assert day.name == "Everyday"
      assert day.position == 0
      assert Enum.sort(day.weekdays) == Enum.sort(PlanDay.day_names())
    end
  end

  describe "changesets" do
    test "weekdays must be real weekday names" do
      plan = insert(:plan)

      attrs = %{"name" => "Everyday", "position" => 0, "weekdays" => ["someday"]}
      assert {:error, cs} = PlanDay.insert_changeset(plan.business_id, plan.id, attrs) |> Repo.insert()
      assert Keyword.has_key?(cs.errors, :weekdays)
    end

    test "trusted ids are not cast from attrs" do
      day = insert(:plan_day)
      other = insert(:plan_day)
      meal = insert(:meal, plan: day.plan, creator: day.plan.creator)

      attrs = %{
        "meal_slot" => "lunch",
        "position" => 0,
        "nutrition_meal_id" => meal.id,
        "business_id" => other.business_id,
        "nutrition_plan_day_id" => other.id
      }

      {:ok, dm} = DayMeal.insert_changeset(day.business_id, day.id, attrs) |> Repo.insert()
      assert dm.business_id == day.business_id
      assert dm.nutrition_plan_day_id == day.id
    end
  end

  describe "duplicate_plan/2 copies day structure" do
    test "days, options, assignments are deep-copied with remapped meal ids" do
      plan = insert(:plan)
      ctx = ctx_for(plan)
      {:ok, created} = NutritionPlans.create_plan(ctx, %{"name" => "Base"})
      meal = insert(:meal, plan: created, creator: plan.creator, business: plan.business)
      [day] = PlanDay |> PlanDay.for_plan(created.id) |> Repo.all()

      {:ok, _} =
        DayMeal.insert_changeset(created.business_id, day.id, %{
          "meal_slot" => "breakfast",
          "position" => 0,
          "nutrition_meal_id" => meal.id
        })
        |> Repo.insert()

      {:ok, copy} = NutritionPlans.duplicate_plan(ctx, created.id)

      [copied_day] = PlanDay |> PlanDay.for_plan(copy.id) |> Repo.all()
      assert copied_day.name == "Everyday"
      [copied_dm] = DayMeal |> DayMeal.for_plan_day(copied_day.id) |> Repo.all()
      refute copied_dm.nutrition_meal_id == meal.id
      assert Enum.sort(copied_day.weekdays) == Enum.sort(PlanDay.day_names())
    end

    # All meals of a copy land in the same second, and `inserted_at` is
    # second-precision — without a tie-break the copy's meal order is whatever
    # Postgres feels like, and differs between reads of the same plan.
    test "a copy reads back in a stable meal order", %{} do
      plan = insert(:plan)
      ctx = ctx_for(plan)
      {:ok, created} = NutritionPlans.create_plan(ctx, %{"name" => "Base"})

      for name <- ~w(Oats Eggs Rice Chicken Yoghurt) do
        insert(:meal, plan: created, creator: plan.creator, business: plan.business, name: name)
      end

      {:ok, copy} = NutritionPlans.duplicate_plan(ctx, created.id)

      reads =
        for _ <- 1..3 do
          {:ok, full} = NutritionPlans.get_plan_full(ctx, copy.id)
          Enum.map(full.meals, & &1.name)
        end

      assert [order, order, order] = reads
      assert Enum.sort(order) == ~w(Chicken Eggs Oats Rice Yoghurt)
    end

    test "two duplicates of one source have the same day structure", %{} do
      plan = insert(:plan)
      ctx = ctx_for(plan)
      {:ok, created} = NutritionPlans.create_plan(ctx, %{"name" => "Base"})

      [everyday] = PlanDay |> PlanDay.for_plan(created.id) |> Repo.all()
      {:ok, rest} = NutritionPlans.create_plan_day(ctx, created.id, %{name: "Rest"})
      {:ok, refeed} = NutritionPlans.create_plan_day(ctx, created.id, %{name: "Refeed"})

      for {day, slot, meal_name} <- [
            {everyday, "breakfast", "Oats"},
            {everyday, "dinner", "Steak"},
            {rest, "lunch", "Salad"},
            {refeed, "dinner", "Pasta"}
          ] do
        meal = insert(:meal, plan: created, creator: plan.creator, business: plan.business, name: meal_name)
        {:ok, _} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: slot, nutrition_meal_id: meal.id})
      end

      structures =
        for _ <- 1..2 do
          {:ok, copy} = NutritionPlans.duplicate_plan(ctx, created.id)
          {:ok, full} = NutritionPlans.get_plan_full(ctx, copy.id)

          Enum.map(full.days, fn day ->
            {day.position, day.name, Enum.map(day.day_meals, &{&1.meal_slot, &1.position, &1.meal.name})}
          end)
        end

      assert [structure, structure] = structures

      assert structure == [
               {0, "Everyday", [{:breakfast, 0, "Oats"}, {:dinner, 0, "Steak"}]},
               {1, "Rest", [{:lunch, 0, "Salad"}]},
               {2, "Refeed", [{:dinner, 0, "Pasta"}]}
             ]
    end
  end

  defp params_for_plan do
    %{"name" => "Cut plan", "status" => "active"}
  end

  describe "day CRUD + assignment" do
    setup do
      base = insert(:plan)
      ctx = ctx_for(base)
      {:ok, plan} = NutritionPlans.create_plan(ctx, %{"name" => "P"})
      [day] = PlanDay |> PlanDay.for_plan(plan.id) |> Repo.all()
      %{ctx: ctx, base: base, plan: plan, day: day}
    end

    test "create_plan_day appends at next position", %{ctx: ctx, plan: plan} do
      {:ok, d2} = NutritionPlans.create_plan_day(ctx, plan.id, %{name: "Training day"})
      assert d2.position == 1
    end

    test "create/update_plan_day return day_meals loaded", %{ctx: ctx, base: base, plan: plan} do
      {:ok, created} = NutritionPlans.create_plan_day(ctx, plan.id, %{name: "Training day"})
      assert created.day_meals == []

      meal = insert(:meal, plan: plan, creator: base.creator, business: base.business)
      {:ok, _} = NutritionPlans.add_day_meal(ctx, created.id, %{meal_slot: "lunch", nutrition_meal_id: meal.id})

      {:ok, renamed} = NutritionPlans.update_plan_day(ctx, created.id, %{"name" => "Rest day"})
      assert [%DayMeal{meal_slot: :lunch}] = renamed.day_meals
    end

    test "delete_plan_day on last day returns :last_day", %{ctx: ctx, day: day} do
      assert {:error, :last_day} = NutritionPlans.delete_plan_day(ctx, day.id)
    end

    test "delete_plan_day moves the deleted day's weekdays to the fallback day", %{
      ctx: ctx,
      plan: plan,
      day: day
    } do
      {:ok, d2} = NutritionPlans.create_plan_day(ctx, plan.id, %{name: "Training day"})
      {:ok, _} = NutritionPlans.update_plan_schedule(ctx, plan.id, schedule_all(day.id, monday: d2.id))

      {:ok, _} = NutritionPlans.delete_plan_day(ctx, d2.id)

      assert Enum.sort(Repo.get(PlanDay, day.id).weekdays) == Enum.sort(PlanDay.day_names())
    end

    test "cross-tenant day is not found", %{ctx: ctx} do
      foreign = insert(:plan_day)
      assert {:error, :not_found} = NutritionPlans.update_plan_day(ctx, foreign.id, %{"name" => "X"})
    end
  end

  describe "update_plan_schedule/3" do
    setup do
      base = insert(:plan)
      ctx = ctx_for(base)
      {:ok, plan} = NutritionPlans.create_plan(ctx, %{"name" => "P"})
      [day] = PlanDay |> PlanDay.for_plan(plan.id) |> Repo.all()
      {:ok, other_day} = NutritionPlans.create_plan_day(ctx, plan.id, %{name: "Rest"})
      %{ctx: ctx, plan: plan, day: day, other_day: other_day}
    end

    test "writes the whole map and empties days it no longer names", %{
      ctx: ctx,
      plan: plan,
      day: day,
      other_day: other_day
    } do
      {:ok, schedule} =
        NutritionPlans.update_plan_schedule(ctx, plan.id, schedule_all(other_day.id, monday: day.id))

      assert schedule["monday"] == day.id
      assert schedule["sunday"] == other_day.id

      assert Repo.get(PlanDay, day.id).weekdays == ["monday"]

      assert Repo.get(PlanDay, other_day.id).weekdays ==
               ~w(tuesday wednesday thursday friday saturday sunday)
    end

    test "a day from another plan is rejected", %{ctx: ctx, plan: plan, day: day} do
      foreign = insert(:plan_day)

      assert {:error, :not_found} =
               NutritionPlans.update_plan_schedule(ctx, plan.id, schedule_all(day.id, monday: foreign.id))

      assert Enum.sort(Repo.get(PlanDay, day.id).weekdays) == Enum.sort(PlanDay.day_names())
    end

    test "a missing weekday key is rejected", %{ctx: ctx, plan: plan, day: day} do
      attrs = day.id |> schedule_all() |> Map.delete(:sunday)

      assert {:error, :invalid_schedule} = NutritionPlans.update_plan_schedule(ctx, plan.id, attrs)
    end

    test "another business's plan is not found", %{ctx: ctx, day: day} do
      foreign_plan = insert(:plan)

      assert {:error, :not_found} =
               NutritionPlans.update_plan_schedule(ctx, foreign_plan.id, schedule_all(day.id))
    end
  end

  defp schedule_all(day_id, overrides \\ []) do
    PlanDay.days()
    |> Map.new(&{&1, day_id})
    |> Map.merge(Map.new(overrides))
  end

  describe "slot options" do
    setup do
      base = insert(:plan)
      ctx = ctx_for(base)
      {:ok, plan} = NutritionPlans.create_plan(ctx, %{"name" => "P"})
      [day] = PlanDay |> PlanDay.for_plan(plan.id) |> Repo.all()

      meals =
        for _ <- 1..4 do
          insert(:meal, plan: plan, creator: base.creator, business: base.business)
        end

      %{ctx: ctx, plan: plan, day: day, meals: meals}
    end

    test "add_day_meal appends and caps at 3", %{ctx: ctx, day: day, meals: [m1, m2, m3, m4]} do
      {:ok, o1} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "breakfast", nutrition_meal_id: m1.id})
      {:ok, o2} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "breakfast", nutrition_meal_id: m2.id})
      {:ok, _o3} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "breakfast", nutrition_meal_id: m3.id})
      assert o1.position == 0
      assert o2.position == 1

      assert {:error, :max_options} =
               NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "breakfast", nutrition_meal_id: m4.id})
    end

    test "meal from another plan is rejected", %{ctx: ctx, day: day} do
      other_plan_meal = insert(:meal)

      assert {:error, :not_found} =
               NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "lunch", nutrition_meal_id: other_plan_meal.id})
    end

    test "remove_slot_option compacts positions", %{ctx: ctx, day: day, meals: [m1, m2, _m3, _m4]} do
      {:ok, o1} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "dinner", nutrition_meal_id: m1.id})
      {:ok, o2} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "dinner", nutrition_meal_id: m2.id})
      {:ok, _} = NutritionPlans.remove_slot_option(ctx, o1.id)
      assert Repo.get(DayMeal, o2.id).position == 0
    end

    test "move_slot_option appends to the target slot and compacts the source", %{
      ctx: ctx,
      day: day,
      meals: [m1, m2, m3, _m4]
    } do
      {:ok, o1} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "lunch", nutrition_meal_id: m1.id})
      {:ok, o2} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "lunch", nutrition_meal_id: m2.id})
      {:ok, _} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "dinner", nutrition_meal_id: m3.id})

      {:ok, moved} = NutritionPlans.move_slot_option(ctx, o1.id, %{meal_slot: "dinner"})

      assert moved.meal_slot == :dinner
      assert moved.position == 1
      assert Repo.get(DayMeal, o2.id).position == 0
    end

    test "move_slot_option to a full slot returns :max_options and leaves the row put", %{
      ctx: ctx,
      day: day,
      meals: [m1, m2, m3, m4]
    } do
      for meal <- [m1, m2, m3] do
        {:ok, _} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "lunch", nutrition_meal_id: meal.id})
      end

      {:ok, o4} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "dinner", nutrition_meal_id: m4.id})

      assert {:error, :max_options} = NutritionPlans.move_slot_option(ctx, o4.id, %{meal_slot: "lunch"})
      assert Repo.get(DayMeal, o4.id).meal_slot == :dinner
    end

    test "move_slot_option with an explicit position reorders within the slot", %{
      ctx: ctx,
      day: day,
      meals: [m1, m2, _m3, _m4]
    } do
      {:ok, o1} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "lunch", nutrition_meal_id: m1.id})
      {:ok, o2} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "lunch", nutrition_meal_id: m2.id})

      {:ok, moved} = NutritionPlans.move_slot_option(ctx, o2.id, %{position: 0})

      assert moved.position == 0
      assert Repo.get(DayMeal, o1.id).position == 1
    end

    test "move_slot_option clamps an out-of-range position", %{ctx: ctx, day: day, meals: [m1, m2, _m3, _m4]} do
      {:ok, o1} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "lunch", nutrition_meal_id: m1.id})
      {:ok, _o2} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "lunch", nutrition_meal_id: m2.id})

      {:ok, moved} = NutritionPlans.move_slot_option(ctx, o1.id, %{position: 9})
      assert moved.position == 1
    end

    test "move_slot_option into another slot honours the given position", %{
      ctx: ctx,
      day: day,
      meals: [m1, m2, m3, _m4]
    } do
      {:ok, o1} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "lunch", nutrition_meal_id: m1.id})
      {:ok, o2} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "dinner", nutrition_meal_id: m2.id})
      {:ok, o3} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "dinner", nutrition_meal_id: m3.id})

      {:ok, moved} = NutritionPlans.move_slot_option(ctx, o1.id, %{meal_slot: "dinner", position: 0})

      assert moved.meal_slot == :dinner
      assert moved.position == 0
      assert Repo.get(DayMeal, o2.id).position == 1
      assert Repo.get(DayMeal, o3.id).position == 2
    end

    test "add_day_meal creates a new plan meal when given a name", %{ctx: ctx, plan: plan, day: day} do
      assert {:ok, day_meal} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "lunch", name: "New meal"})

      assert day_meal.meal.name == "New meal"
      assert day_meal.meal.nutrition_plan_id == plan.id
      assert day_meal.meal.meal_items == []
      assert day_meal.nutrition_meal_id == day_meal.meal.id
    end

    test "add_day_meal preloads the placed meal with its items", %{ctx: ctx, day: day, meals: [m1 | _]} do
      food = insert(:food, business: m1.business, creator: m1.creator)
      insert(:meal_item, meal: m1, business: m1.business, food: food)

      assert {:ok, day_meal} =
               NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "lunch", nutrition_meal_id: m1.id})

      assert [item] = day_meal.meal.meal_items
      assert item.food_id == food.id
    end

    test "add_day_meal needs exactly one of name / nutrition_meal_id", %{ctx: ctx, day: day, meals: [m1 | _]} do
      assert {:error, %Ecto.Changeset{}} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "lunch"})

      assert {:error, %Ecto.Changeset{}} =
               NutritionPlans.add_day_meal(ctx, day.id, %{
                 meal_slot: "lunch",
                 name: "New meal",
                 nutrition_meal_id: m1.id
               })
    end

    test "add_day_meal rolls the new meal back when the slot is full", %{ctx: ctx, plan: plan, day: day, meals: meals} do
      for meal <- Enum.take(meals, 3) do
        {:ok, _} = NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "lunch", nutrition_meal_id: meal.id})
      end

      before = Repo.aggregate(Meal.for_plan(Meal, plan.id), :count, :id)

      assert {:error, :max_options} =
               NutritionPlans.add_day_meal(ctx, day.id, %{meal_slot: "lunch", name: "Overflow"})

      assert Repo.aggregate(Meal.for_plan(Meal, plan.id), :count, :id) == before
    end
  end

  describe "get_client_active_plan_day/2 via new day model" do
    test "resolves the assigned weekday's day and returns options in position order" do
      plan = insert(:plan)
      ctx = ctx_for(plan)
      {:ok, template} = NutritionPlans.create_plan(ctx, %{"name" => "P"})

      m1 = insert(:meal, plan: template, creator: plan.creator, business: plan.business, name: "Oats")
      m2 = insert(:meal, plan: template, creator: plan.creator, business: plan.business, name: "Eggs")

      [template_day] = PlanDay |> PlanDay.for_plan(template.id) |> Repo.all()

      {:ok, _} =
        NutritionPlans.add_day_meal(ctx, template_day.id, %{
          meal_slot: "breakfast",
          nutrition_meal_id: m1.id
        })

      {:ok, _} =
        NutritionPlans.add_day_meal(ctx, template_day.id, %{
          meal_slot: "breakfast",
          nutrition_meal_id: m2.id
        })

      client = insert(:client, business: plan.business, assigned_coach: plan.creator)
      client_ctx = %Easy.Ctx{business_id: plan.business_id, user_id: client.user_id, client_id: client.id}

      {:ok, assigned_plan} =
        NutritionPlans.assign_plan_to_client(ctx, client.id, template.id, %{})

      date = ~D[2026-07-06]
      assert Easy.Utils.weekday_name(date) == "monday"

      {:ok, result} = NutritionPlans.get_client_active_plan_day(client_ctx, date)

      assert result.plan.id == assigned_plan.id
      assert result.day == "monday"
      assert result.chosen == %{}
      assert [%{meal_slot: :breakfast, options: [opt1, opt2]}] = result.slots
      assert opt1.position == 0
      assert opt2.position == 1
      assert opt1.meal.name == "Oats"
    end
  end

  describe "group_weekdays/1" do
    alias Easy.Repo.Migrations.CreateNutritionPlanDays, as: Migration

    test "uniform 7-day schedule groups into one Everyday day" do
      entries =
        Enum.map(
          ~w(monday tuesday wednesday thursday friday saturday sunday),
          &[&1, "breakfast", "meal-1"]
        )

      assert [{"Everyday", 0, sig, days}] = Migration.group_weekdays(entries)
      assert sig == [{"breakfast", "meal-1"}]
      assert Enum.sort(days) == Enum.sort(~w(monday tuesday wednesday thursday friday saturday sunday))
    end

    test "5 weekdays with one schedule plus 2 empty weekdays merge into one Everyday day" do
      entries =
        Enum.map(
          ~w(monday tuesday wednesday thursday friday),
          &[&1, "breakfast", "meal-1"]
        )

      assert [{"Everyday", 0, sig, days}] = Migration.group_weekdays(entries)
      assert sig == [{"breakfast", "meal-1"}]
      assert Enum.sort(days) == Enum.sort(~w(monday tuesday wednesday thursday friday saturday sunday))
    end

    test "two distinct signatures split into Day 1 and Day 2 covering all weekdays" do
      group_a = ~w(monday tuesday wednesday thursday)
      group_b = ~w(friday saturday sunday)

      entries =
        Enum.map(group_a, &[&1, "breakfast", "meal-1"]) ++
          Enum.map(group_b, &[&1, "breakfast", "meal-2"])

      assert [{"Day 1", 0, sig_a, days_a}, {"Day 2", 1, sig_b, days_b}] =
               Migration.group_weekdays(entries)

      assert sig_a == [{"breakfast", "meal-1"}]
      assert sig_b == [{"breakfast", "meal-2"}]
      assert Enum.sort(days_a) == Enum.sort(group_a)
      assert Enum.sort(days_b) == Enum.sort(group_b)
    end

    test "no entries at all yields one Everyday day with all 7 weekdays and no meals" do
      assert [{"Everyday", 0, [], days}] = Migration.group_weekdays([])
      assert Enum.sort(days) == Enum.sort(~w(monday tuesday wednesday thursday friday saturday sunday))
    end
  end
end
