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
        MealLogs.add_client_extra(client_ctx, %{
          date: @date,
          meal_slot: "breakfast",
          food_id: food.id,
          amount: 1.0,
          unit: "g",
          weight_g: 100.0
        })

      entry = Repo.preload(entry, :meal_log)

      assert entry.business_id == entry.meal_log.business_id
      assert entry.business_id == client_ctx.business_id
    end

    test "business_id is not castable from attrs" do
      %{client_ctx: client_ctx, food: food} = scenario()
      other_business = insert(:business)

      {:ok, entry} =
        MealLogs.add_client_extra(client_ctx, %{
          date: @date,
          meal_slot: "breakfast",
          business_id: other_business.id,
          food_id: food.id,
          weight_g: 100.0
        })

      assert entry.business_id == client_ctx.business_id
    end
  end

  describe "database constraints" do
    test "rejects weight_g of zero" do
      %{meal_log: meal_log, business: business, food: food} = scenario()

      assert {:error, %Postgrex.Error{postgres: %{code: :check_violation, constraint: constraint}}} =
               insert_entry_sql(meal_log, business, food, 0.0)

      assert constraint == "nutrition_food_log_entries_weight_positive"
    end

    test "accepts a null weight_g" do
      %{meal_log: meal_log, business: business, food: food} = scenario()

      assert {:ok, _} = insert_entry_sql(meal_log, business, food, nil)
    end

    test "rejects logging the same planned meal item twice" do
      %{meal_log: meal_log, business: business, food: food, coach: coach} = scenario()
      meal = insert(:meal, business: business, creator: coach)
      meal_item = insert(:meal_item, business: business, meal: meal, food: food)

      attrs = %{food_id: food.id, food_name: food.name, weight_g: 100.0}

      insert = fn ->
        business.id
        |> FoodLogEntry.insert_changeset(meal_log.id, attrs)
        |> Ecto.Changeset.put_change(:planned_item_id, meal_item.id)
        |> Repo.insert()
      end

      assert {:ok, _entry} = insert.()
      assert {:error, changeset} = insert.()
      assert "has already been taken" in errors_on(changeset).planned_item_id
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

  defp insert_entry_sql(meal_log, business, food, weight_g) do
    Repo.query(
      """
      INSERT INTO nutrition_food_log_entries
        (id, food_name, weight_g, nutrition_meal_log_id, business_id, food_id, inserted_at, updated_at)
      VALUES (gen_random_uuid(), 'Oats', $1, $2, $3, $4, now(), now())
      """,
      [weight_g, uuid(meal_log.id), uuid(business.id), uuid(food.id)]
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
      client_ctx: %Ctx{business_id: coach.business_id, user_id: client.user_id, client_id: client.id},
      coach: coach,
      food: food,
      meal_log: meal_log
    }
  end
end
