defmodule Easy.Nutrition.FoodLogEntryTest do
  use Easy.SchemaCase, async: false

  alias Easy.Ctx
  alias Easy.MealLogs
  alias Easy.Nutrition.FoodLogEntry

  @date ~D[2026-07-06]

  describe "business_id" do
    test "an entry logged by a client carries the same business as its meal log" do
      %{client_ctx: client_ctx, food: food} = scenario()

      {:ok, entry} =
        MealLogs.create_client_food_log_entry(client_ctx, %{
          date: @date,
          meal_slot: "breakfast",
          food_id: food.id,
          amount: 1.0,
          unit: "g",
          weight_g: 100.0,
          source: :unplanned
        })

      entry = Repo.preload(entry, :meal_log)

      assert entry.business_id == entry.meal_log.business_id
      assert entry.business_id == client_ctx.business_id
    end

    test "business_id is not castable from attrs" do
      %{client_ctx: client_ctx, food: food} = scenario()
      other_business = insert(:business)

      {:ok, entry} =
        MealLogs.create_client_food_log_entry(client_ctx, %{
          date: @date,
          meal_slot: "breakfast",
          business_id: other_business.id,
          food_id: food.id,
          weight_g: 100.0,
          source: :unplanned
        })

      assert entry.business_id == client_ctx.business_id
    end
  end

  describe "database constraints" do
    test "rejects an unknown source" do
      %{meal_log: meal_log, business: business, food: food} = scenario()

      assert {:error, %Postgrex.Error{postgres: %{code: :check_violation, constraint: constraint}}} =
               insert_entry_sql(meal_log, business, food, "brunch-leftovers", 100.0)

      assert constraint == "nutrition_food_log_entries_source_check"
    end

    test "rejects weight_g of zero" do
      %{meal_log: meal_log, business: business, food: food} = scenario()

      assert {:error, %Postgrex.Error{postgres: %{code: :check_violation, constraint: constraint}}} =
               insert_entry_sql(meal_log, business, food, "planned", 0.0)

      assert constraint == "nutrition_food_log_entries_weight_positive"
    end

    test "accepts a null weight_g" do
      %{meal_log: meal_log, business: business, food: food} = scenario()

      assert {:ok, _} = insert_entry_sql(meal_log, business, food, "planned", nil)
    end

    test "rejects an unknown meal_slot on the meal log" do
      %{business: business, client: client} = scenario()

      assert {:error, %Postgrex.Error{postgres: %{code: :check_violation, constraint: constraint}}} =
               Repo.query(
                 """
                 INSERT INTO nutrition_meal_logs
                   (id, date, meal_slot, logged_calories, client_id, business_id, inserted_at, updated_at)
                 VALUES (gen_random_uuid(), $1, $2, 0, $3, $4, now(), now())
                 """,
                 [~D[2026-07-07], "brunch", uuid(client.id), uuid(business.id)]
               )

      assert constraint == "nutrition_meal_logs_meal_slot_check"
    end
  end

  defp insert_entry_sql(meal_log, business, food, source, weight_g) do
    Repo.query(
      """
      INSERT INTO nutrition_food_log_entries
        (id, food_name, weight_g, source, nutrition_meal_log_id, business_id, food_id, inserted_at, updated_at)
      VALUES (gen_random_uuid(), 'Oats', $1, $2, $3, $4, $5, now(), now())
      """,
      [weight_g, source, uuid(meal_log.id), uuid(business.id), uuid(food.id)]
    )
  end

  defp uuid(id), do: Ecto.UUID.dump!(id)

  defp scenario do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    food = insert(:food, creator: coach, business: coach.business, calories_per_100g: 100.0)
    meal_log = insert(:meal_log, client: client, business: coach.business)

    %{
      business: coach.business,
      client: client,
      client_ctx: %Ctx{business_id: coach.business_id, user_id: client.user_id},
      food: food,
      meal_log: meal_log
    }
  end
end
