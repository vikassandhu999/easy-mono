defmodule Easy.Nutrition.MealItemTest do
  use Easy.SchemaCase, async: false

  alias Easy.Nutrition.MealItem
  alias Easy.Meals

  describe "insert_changeset/3" do
    test "does not query when building a changeset" do
      parent = self()
      handler_id = {__MODULE__, self()}

      :telemetry.attach(
        handler_id,
        [:easy, :repo, :query],
        fn _event, _measurements, metadata, _config -> send(parent, {:query, metadata.query}) end,
        nil
      )

      changeset =
        MealItem.insert_changeset(Ecto.UUID.generate(), Ecto.UUID.generate(), %{
          "food_id" => Ecto.UUID.generate()
        })

      :telemetry.detach(handler_id)

      refute_received {:query, _query}
      refute Map.has_key?(changeset.changes, :position)
    end
  end

  describe "create/3" do
    test "assigns the next position in the action boundary" do
      coach = insert_coach()
      plan = insert(:plan, business: coach.business, creator: coach)
      meal = insert(:meal, business: coach.business, creator: coach, plan: plan)
      food = insert(:food, business: coach.business, creator: coach)
      insert(:meal_item, meal: meal, business: meal.business, food: food, position: 0)

      ctx = Easy.Ctx.new(meal.business_id, coach.user_id)

      assert {:ok, meal_item} =
               Meals.create_meal_item(ctx, meal.id, %{
                 food_id: food.id,
                 weight_g: 100.0
               })

      assert meal_item.position == 1
    end

    test "keeps an explicit zero position" do
      coach = insert_coach()
      plan = insert(:plan, business: coach.business, creator: coach)
      meal = insert(:meal, business: coach.business, creator: coach, plan: plan)
      food = insert(:food, business: coach.business, creator: coach)
      insert(:meal_item, meal: meal, business: meal.business, food: food, position: 1)

      ctx = Easy.Ctx.new(meal.business_id, coach.user_id)

      assert {:ok, meal_item} =
               Meals.create_meal_item(ctx, meal.id, %{
                 food_id: food.id,
                 weight_g: 100.0,
                 position: 0
               })

      assert meal_item.position == 0
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
