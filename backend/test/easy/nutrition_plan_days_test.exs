unless Code.ensure_loaded?(Easy.Repo.Migrations.CreateNutritionPlanDays) do
  Code.require_file(
    "../../priv/repo/migrations/20260706120000_create_nutrition_plan_days.exs",
    __DIR__
  )
end

defmodule Easy.NutritionPlanDaysTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.DayMeal
  alias Easy.Nutrition.PlanDay
  alias Easy.Nutrition.WeekdayAssignment
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

      assignments = WeekdayAssignment |> WeekdayAssignment.for_plan(created.id) |> Repo.all()
      assert length(assignments) == 7
      assert Enum.all?(assignments, &(&1.nutrition_plan_day_id == day.id))
    end
  end

  describe "changesets" do
    test "day_meal position unique per (day, slot)" do
      day = insert(:plan_day)
      meal = insert(:meal, plan: day.plan, creator: day.plan.creator)
      attrs = %{"meal_slot" => "breakfast", "position" => 0, "nutrition_meal_id" => meal.id}

      assert {:ok, _} = DayMeal.insert_changeset(day.business_id, day.id, attrs) |> Repo.insert()
      assert {:error, cs} = DayMeal.insert_changeset(day.business_id, day.id, attrs) |> Repo.insert()
      refute cs.valid?
    end

    test "weekday unique per plan" do
      day = insert(:plan_day)
      attrs = %{"day_of_week" => "monday"}
      base = WeekdayAssignment.insert_changeset(day.business_id, day.nutrition_plan_id, day.id, attrs)

      assert {:ok, _} = Repo.insert(base)

      assert {:error, _} =
               WeekdayAssignment.insert_changeset(day.business_id, day.nutrition_plan_id, day.id, attrs)
               |> Repo.insert()
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
      assert length(WeekdayAssignment |> WeekdayAssignment.for_plan(copy.id) |> Repo.all()) == 7
    end
  end

  defp params_for_plan do
    %{"name" => "Cut plan", "status" => "active"}
  end

  describe "day CRUD + assignment" do
    setup do
      plan = insert(:plan)
      ctx = ctx_for(plan)
      {:ok, plan} = NutritionPlans.create_plan(ctx, %{"name" => "P"})
      [day] = PlanDay |> PlanDay.for_plan(plan.id) |> Repo.all()
      %{ctx: ctx, plan: plan, day: day}
    end

    test "create_plan_day appends at next position", %{ctx: ctx, plan: plan} do
      {:ok, d2} = NutritionPlans.create_plan_day(ctx, plan.id, %{name: "Training day"})
      assert d2.position == 1
    end

    test "delete_plan_day on last day returns :last_day", %{ctx: ctx, day: day} do
      assert {:error, :last_day} = NutritionPlans.delete_plan_day(ctx, day.id)
    end

    test "delete_plan_day reassigns weekdays to remaining day", %{ctx: ctx, plan: plan, day: day} do
      {:ok, d2} = NutritionPlans.create_plan_day(ctx, plan.id, %{name: "Training day"})

      {:ok, _} =
        NutritionPlans.assign_weekday(ctx, plan.id, %{
          day_of_week: "monday",
          nutrition_plan_day_id: d2.id
        })

      {:ok, _} = NutritionPlans.delete_plan_day(ctx, d2.id)

      assignments = WeekdayAssignment |> WeekdayAssignment.for_plan(plan.id) |> Repo.all()
      assert length(assignments) == 7
      assert Enum.all?(assignments, &(&1.nutrition_plan_day_id == day.id))
    end

    test "assign_weekday moves one weekday", %{ctx: ctx, plan: plan} do
      {:ok, d2} = NutritionPlans.create_plan_day(ctx, plan.id, %{name: "T"})

      {:ok, wa} =
        NutritionPlans.assign_weekday(ctx, plan.id, %{
          day_of_week: "friday",
          nutrition_plan_day_id: d2.id
        })

      assert wa.nutrition_plan_day_id == d2.id
      assert length(WeekdayAssignment |> WeekdayAssignment.for_plan(plan.id) |> Repo.all()) == 7
    end

    test "cross-tenant day is not found", %{ctx: ctx} do
      foreign = insert(:plan_day)
      assert {:error, :not_found} = NutritionPlans.update_plan_day(ctx, foreign.id, %{"name" => "X"})
    end
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

    test "add_slot_option appends and caps at 3", %{ctx: ctx, day: day, meals: [m1, m2, m3, m4]} do
      {:ok, o1} = NutritionPlans.add_slot_option(ctx, day.id, %{meal_slot: "breakfast", nutrition_meal_id: m1.id})
      {:ok, o2} = NutritionPlans.add_slot_option(ctx, day.id, %{meal_slot: "breakfast", nutrition_meal_id: m2.id})
      {:ok, _o3} = NutritionPlans.add_slot_option(ctx, day.id, %{meal_slot: "breakfast", nutrition_meal_id: m3.id})
      assert o1.position == 0
      assert o2.position == 1

      assert {:error, :max_options} =
               NutritionPlans.add_slot_option(ctx, day.id, %{meal_slot: "breakfast", nutrition_meal_id: m4.id})
    end

    test "meal from another plan is rejected", %{ctx: ctx, day: day} do
      other_plan_meal = insert(:meal)

      assert {:error, :not_found} =
               NutritionPlans.add_slot_option(ctx, day.id, %{meal_slot: "lunch", nutrition_meal_id: other_plan_meal.id})
    end

    test "remove_slot_option compacts positions", %{ctx: ctx, day: day, meals: [m1, m2, _m3, _m4]} do
      {:ok, o1} = NutritionPlans.add_slot_option(ctx, day.id, %{meal_slot: "dinner", nutrition_meal_id: m1.id})
      {:ok, o2} = NutritionPlans.add_slot_option(ctx, day.id, %{meal_slot: "dinner", nutrition_meal_id: m2.id})
      {:ok, _} = NutritionPlans.remove_slot_option(ctx, o1.id)
      assert Repo.get(DayMeal, o2.id).position == 0
    end

    test "make_default_option moves to position 0", %{ctx: ctx, day: day, meals: [m1, m2, _m3, _m4]} do
      {:ok, o1} = NutritionPlans.add_slot_option(ctx, day.id, %{meal_slot: "lunch", nutrition_meal_id: m1.id})
      {:ok, o2} = NutritionPlans.add_slot_option(ctx, day.id, %{meal_slot: "lunch", nutrition_meal_id: m2.id})
      {:ok, _} = NutritionPlans.make_default_option(ctx, o2.id)
      assert Repo.get(DayMeal, o2.id).position == 0
      assert Repo.get(DayMeal, o1.id).position == 1
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
        NutritionPlans.add_slot_option(ctx, template_day.id, %{
          meal_slot: "breakfast",
          nutrition_meal_id: m1.id
        })

      {:ok, _} =
        NutritionPlans.add_slot_option(ctx, template_day.id, %{
          meal_slot: "breakfast",
          nutrition_meal_id: m2.id
        })

      client = insert(:client, business: plan.business, assigned_coach: plan.creator)
      client_ctx = %Easy.Ctx{business_id: plan.business_id, user_id: client.user_id}

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
