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
end
