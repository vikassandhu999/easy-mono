defmodule Easy.Training.PlanItemTest do
  use Easy.SchemaCase

  alias Easy.TrainingPlans, as: Plans
  alias Easy.Training.PlanItem

  describe "insert_changeset/4" do
    test "does not check workout membership against the database" do
      business = insert(:business)
      coach = insert(:coach, business: business)
      plan = insert(:training_plan, author: coach, business: business)
      other_plan = insert(:training_plan, author: coach, business: business)
      workout = insert(:workout, training_plan: other_plan, business: business)

      changeset =
        PlanItem.insert_changeset(plan.id, business.id, coach.id, %{
          "day" => "monday",
          "workout_type" => "primary",
          "workout_id" => workout.id
        })

      assert changeset.valid?
    end

    test "does not check rest days against the database" do
      business = insert(:business)
      coach = insert(:coach, business: business)
      plan = insert(:training_plan, author: coach, business: business, rest_days: ["monday"])
      workout = insert(:workout, training_plan: plan, business: business)

      changeset =
        PlanItem.insert_changeset(plan.id, business.id, coach.id, %{
          "day" => "monday",
          "workout_type" => "primary",
          "workout_id" => workout.id
        })

      assert changeset.valid?
    end
  end

  describe "Plans.create_plan_item/4" do
    test "returns not found when workout is outside the plan" do
      business = insert(:business)
      coach = insert(:coach, business: business)
      plan = insert(:training_plan, author: coach, business: business)
      other_plan = insert(:training_plan, author: coach, business: business)
      workout = insert(:workout, training_plan: other_plan, business: business)

      assert {:error, :not_found} =
               Plans.create_plan_item(plan.id, business.id, coach.id, %{
                 "day" => "monday",
                 "workout_type" => "primary",
                 "workout_id" => workout.id
               })
    end

    test "checks rest days at the action boundary" do
      business = insert(:business)
      coach = insert(:coach, business: business)
      plan = insert(:training_plan, author: coach, business: business, rest_days: ["monday"])
      workout = insert(:workout, training_plan: plan, business: business)

      assert {:error, changeset} =
               Plans.create_plan_item(plan.id, business.id, coach.id, %{
                 "day" => "monday",
                 "workout_type" => "primary",
                 "workout_id" => workout.id
               })

      assert %{day: ["cannot schedule workout on a rest day"]} = errors_on(changeset)
    end
  end
end
