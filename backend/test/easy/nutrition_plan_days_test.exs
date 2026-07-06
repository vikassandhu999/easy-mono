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
    %Easy.Ctx{business_id: plan.business_id, user_id: coach.user_id}
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
