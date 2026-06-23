defmodule Easy.Training.PlanItemTest do
  use Easy.SchemaCase

  alias Easy.TrainingPlans, as: Plans
  alias Easy.Training.ScheduleEntry, as: PlanItem

  describe "insert_changeset/4" do
    test "does not check workout membership against the database" do
      business = insert(:business)
      coach = insert(:coach, business: business)
      plan = insert(:training_plan, creator: coach, business: business)
      other_plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: other_plan, creator: coach, business: business)

      changeset =
        PlanItem.insert_changeset(plan.id, business.id, coach.id, %{
          "day_of_week" => "monday",
          "training_workout_id" => workout.id
        })

      assert changeset.valid?
    end

    test "requires a day_of_week" do
      business = insert(:business)
      coach = insert(:coach, business: business)
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business)

      changeset =
        PlanItem.insert_changeset(plan.id, business.id, coach.id, %{
          "training_workout_id" => workout.id
        })

      assert %{day_of_week: ["can't be blank"]} = errors_on(changeset)
    end
  end

  describe "Plans.create_plan_item/4" do
    test "returns not found when workout is outside the plan" do
      business = insert(:business)
      coach = insert(:coach, business: business)
      plan = insert(:training_plan, creator: coach, business: business)
      other_plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: other_plan, creator: coach, business: business)

      assert {:error, :not_found} =
               Plans.create_plan_item(plan.id, business.id, coach.id, %{
                 "day_of_week" => "monday",
                 "training_workout_id" => workout.id
               })
    end

    test "schedules a workout on a day for the plan" do
      business = insert(:business)
      coach = insert(:coach, business: business)
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business)

      assert {:ok, item} =
               Plans.create_plan_item(plan.id, business.id, coach.id, %{
                 "day_of_week" => "monday",
                 "training_workout_id" => workout.id
               })

      assert item.day_of_week == "monday"
    end

    test "rejects a second workout on the same day for the plan" do
      business = insert(:business)
      coach = insert(:coach, business: business)
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business)
      other_workout = insert(:workout, plan: plan, creator: coach, business: business)

      assert {:ok, _item} =
               Plans.create_plan_item(plan.id, business.id, coach.id, %{
                 "day_of_week" => "monday",
                 "training_workout_id" => workout.id
               })

      assert {:error, changeset} =
               Plans.create_plan_item(plan.id, business.id, coach.id, %{
                 "day_of_week" => "monday",
                 "training_workout_id" => other_workout.id
               })

      refute changeset.valid?
    end
  end
end
