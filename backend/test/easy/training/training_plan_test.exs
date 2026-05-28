defmodule Easy.Training.TrainingPlanTest do
  use Easy.SchemaCase

  alias Easy.Training.Plans
  alias Easy.Training.TrainingPlan

  describe "update_changeset/2" do
    test "does not check scheduled plan items against the database" do
      business = insert(:business)
      coach = insert(:coach, business: business)
      plan = insert(:training_plan, author: coach, business: business)
      workout = insert(:workout, training_plan: plan, business: business)

      insert(:training_plan_item,
        training_plan: plan,
        workout: workout,
        business: business,
        creator: coach,
        day: "monday"
      )

      changeset = TrainingPlan.update_changeset(plan, %{"rest_days" => ["monday"]})

      assert changeset.valid?
    end
  end

  describe "Plans.update_training_plan/2" do
    test "checks scheduled plan items at the action boundary" do
      business = insert(:business)
      coach = insert(:coach, business: business)
      plan = insert(:training_plan, author: coach, business: business)
      workout = insert(:workout, training_plan: plan, business: business)

      insert(:training_plan_item,
        training_plan: plan,
        workout: workout,
        business: business,
        creator: coach,
        day: "monday"
      )

      assert {:error, changeset} = Plans.update_training_plan(plan, %{"rest_days" => ["monday"]})

      assert %{rest_days: ["cannot include days with scheduled workouts"]} =
               errors_on(changeset)
    end
  end
end
