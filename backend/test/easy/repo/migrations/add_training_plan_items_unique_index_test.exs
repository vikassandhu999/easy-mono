Code.require_file(
  "../../../../priv/repo/migrations/20260421230000_add_training_plan_items_unique_index.exs",
  __DIR__
)

defmodule Easy.Repo.Migrations.AddTrainingPlanItemsUniqueIndexTest do
  use Easy.DataCase

  alias Easy.Repo
  alias Easy.Repo.Migrations.AddTrainingPlanItemsUniqueIndex

  test "raises instead of deleting unsupported duplicate workout slots" do
    Repo.query!("DROP INDEX IF EXISTS training_plan_items_plan_id_day_workout_type_index")

    business = insert(:business)
    coach = insert(:coach, business: business)
    plan = insert(:training_plan, author: coach, business: business)

    monday_workouts =
      for _ <- 1..3 do
        insert(:workout, training_plan: plan, business: business)
      end

    Enum.each(monday_workouts, fn workout ->
      insert(:training_plan_item,
        training_plan: plan,
        workout: workout,
        business: business,
        creator: coach,
        day: "monday",
        workout_type: "primary"
      )
    end)

    error = assert_raise Postgrex.Error, &run_migration/0

    assert Exception.message(error) =~ "unsupported duplicate workout slots"
  end

  defp run_migration do
    Ecto.Migration.Runner.run(
      Repo,
      Repo.config(),
      20_260_421_230_000,
      AddTrainingPlanItemsUniqueIndex,
      :forward,
      :up,
      :up,
      log: false
    )
  end
end
