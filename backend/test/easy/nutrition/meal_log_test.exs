defmodule Easy.Nutrition.MealLogTest do
  use Easy.SchemaCase, async: false

  alias Easy.MealLogs
  alias Easy.Repo

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

  defp insert_coach do
    business = insert(:business, owner: build(:user, email: unique_email()))
    insert(:coach, business: business, user: build(:user, email: unique_email()))
  end

  defp unique_email do
    "user-#{System.unique_integer([:positive])}@test.com"
  end
end
