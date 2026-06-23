defmodule Easy.Training.PlanItemTest do
  use Easy.SchemaCase

  alias Easy.Ctx
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
        PlanItem.insert_changeset(business.id, coach.id, plan.id, %{
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
        PlanItem.insert_changeset(business.id, coach.id, plan.id, %{
          "training_workout_id" => workout.id
        })

      assert %{day_of_week: ["can't be blank"]} = errors_on(changeset)
    end
  end

  describe "Plans.set_day_schedule/4" do
    test "returns not found when workout is outside the plan" do
      coach = insert(:coach)
      plan = insert(:training_plan, creator: coach, business: coach.business)
      other_plan = insert(:training_plan, creator: coach, business: coach.business)
      workout = insert(:workout, plan: other_plan, creator: coach, business: coach.business)
      ctx = Ctx.new(coach.business_id, coach.user_id)

      assert {:error, :not_found} =
               Plans.set_day_schedule(ctx, plan.id, "monday", %{
                 training_workout_id: workout.id
               })
    end

    test "schedules a workout on a day for the plan" do
      coach = insert(:coach)
      plan = insert(:training_plan, creator: coach, business: coach.business)
      workout = insert(:workout, plan: plan, creator: coach, business: coach.business)
      ctx = Ctx.new(coach.business_id, coach.user_id)

      assert {:ok, item} =
               Plans.set_day_schedule(ctx, plan.id, "monday", %{
                 training_workout_id: workout.id
               })

      assert item.day_of_week == :monday
    end

    test "replaces a second workout on the same day (desired-state semantics)" do
      coach = insert(:coach)
      plan = insert(:training_plan, creator: coach, business: coach.business)
      workout_a = insert(:workout, plan: plan, creator: coach, business: coach.business)
      workout_b = insert(:workout, plan: plan, creator: coach, business: coach.business)
      ctx = Ctx.new(coach.business_id, coach.user_id)

      assert {:ok, _item} =
               Plans.set_day_schedule(ctx, plan.id, "monday", %{
                 training_workout_id: workout_a.id
               })

      assert {:ok, item} =
               Plans.set_day_schedule(ctx, plan.id, "monday", %{
                 training_workout_id: workout_b.id
               })

      assert item.training_workout_id == workout_b.id
    end
  end
end
