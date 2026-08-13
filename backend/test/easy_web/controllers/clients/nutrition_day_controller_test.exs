defmodule EasyWeb.Clients.NutritionDayControllerTest do
  use Easy.ConnCase

  alias Easy.MealLogs

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)

    conn =
      build_conn()
      |> authenticate_client(client)
      |> put_req_header("content-type", "application/json")

    %{conn: conn, coach: coach, client: client, business: coach.business}
  end

  describe "GET /v1/client/nutrition-days" do
    test "returns today's slots from active plan with empty diary rows", ctx do
      plan =
        insert(:plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          status: :active,
          target_calories: 2000.0
        )

      meal =
        insert(:meal, plan: plan, creator: ctx.coach, business: ctx.business, name: "Breakfast")

      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")

      insert(:meal_item,
        meal: meal,
        business: ctx.business,
        food: food,
        amount: 100,
        unit: "g",
        weight_g: 100
      )

      today = Date.utc_today()
      day = Easy.Utils.weekday_name(today)

      plan_day =
        insert(:plan_day, plan: plan, business: ctx.business, name: "Everyday", position: 0, weekdays: [day])

      insert(:day_meal,
        plan_day: plan_day,
        meal: meal,
        business: ctx.business,
        meal_slot: "breakfast",
        position: 0
      )

      conn = get(ctx.conn, "/v1/client/nutrition-days")
      assert %{"data" => [data]} = json_response(conn, 200)
      assert data["date"] == Date.to_iso8601(today)
      assert data["plan_id"] == plan.id
      assert data["targets"]["calories"] == 2000.0
      assert length(data["slots"]) == 1

      slot_data = hd(data["slots"])
      assert slot_data["meal_slot"] == "breakfast"
      assert slot_data["meal_id"] == meal.id
      assert slot_data["rows"] == []
      assert length(slot_data["options"]) == 1
      assert hd(slot_data["options"])["meal_name"] == "Breakfast"
      assert hd(hd(slot_data["options"])["items"])["food_name"] == "Oats"
    end

    test "returns empty day when no active plan", ctx do
      insert(:plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :archived
      )

      conn = get(ctx.conn, "/v1/client/nutrition-days")
      assert %{"data" => [data]} = json_response(conn, 200)
      assert data["plan_id"] == nil
      assert data["slots"] == []
    end

    test "accepts optional date param", ctx do
      plan =
        insert(:plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          status: :active
        )

      meal = insert(:meal, plan: plan, creator: ctx.coach, business: ctx.business)

      plan_day =
        insert(:plan_day,
          plan: plan,
          business: ctx.business,
          name: "Everyday",
          position: 0,
          weekdays: ["monday"]
        )

      insert(:day_meal,
        plan_day: plan_day,
        meal: meal,
        business: ctx.business,
        meal_slot: "lunch",
        position: 0
      )

      conn = get(ctx.conn, "/v1/client/nutrition-days", %{"date" => "2026-03-30"})
      assert %{"data" => [data]} = json_response(conn, 200)
      assert data["date"] == "2026-03-30"
      assert length(data["slots"]) == 1
      assert hd(data["slots"])["meal_slot"] == "lunch"
    end

    test "logged planned meal yields as_planned rows with no added or skipped", ctx do
      plan =
        insert(:plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          status: :active
        )

      meal = insert(:meal, plan: plan, creator: ctx.coach, business: ctx.business, name: "Dinner")
      date = ~D[2026-08-10]
      day = Easy.Utils.weekday_name(date)

      plan_day =
        insert(:plan_day, plan: plan, business: ctx.business, name: "Everyday", position: 0, weekdays: [day])

      insert(:day_meal,
        plan_day: plan_day,
        meal: meal,
        business: ctx.business,
        meal_slot: "dinner",
        position: 0
      )

      foods =
        for i <- 1..5 do
          food =
            insert(:food,
              creator: ctx.coach,
              business: ctx.business,
              name: "Food #{i}",
              calories_per_100g: 100.0
            )

          insert(:meal_item,
            meal: meal,
            business: ctx.business,
            food: food,
            amount: 100.0,
            unit: "g",
            weight_g: 100.0,
            position: i - 1
          )

          food
        end

      client_ctx =
        Easy.Ctx.new(ctx.business.id, ctx.client.user_id, nil, false)
        |> Map.put(:client_id, ctx.client.id)

      assert {:ok, entries} =
               MealLogs.log_client_meal(client_ctx, %{
                 date: date,
                 meal_slot: "dinner",
                 meal_id: meal.id
               })

      assert length(entries) == 5

      conn = get(ctx.conn, "/v1/client/nutrition-days", %{"date" => Date.to_iso8601(date)})
      assert %{"data" => [data]} = json_response(conn, 200)
      slot = Enum.find(data["slots"], &(&1["meal_slot"] == "dinner"))
      assert length(slot["rows"]) == 5
      assert Enum.all?(slot["rows"], &(&1["status"] == "as_planned"))
      refute Enum.any?(slot["rows"], &(&1["status"] in ["added", "skipped"]))
      assert length(foods) == 5
    end

    test "range returns one day per date", ctx do
      conn =
        get(ctx.conn, "/v1/client/nutrition-days", %{
          "from" => "2026-08-10",
          "to" => "2026-08-12"
        })

      assert %{"data" => days} = json_response(conn, 200)
      assert Enum.map(days, & &1["date"]) == ["2026-08-10", "2026-08-11", "2026-08-12"]
    end

    test "rejects a malformed exact date", ctx do
      conn = get(ctx.conn, "/v1/client/nutrition-days", %{"date" => "not-a-date"})

      assert %{"error_detail" => %{"fields" => %{"date" => ["is invalid"]}}} = json_response(conn, 422)
    end

    test "rejects a range whose dates are malformed", ctx do
      conn =
        get(ctx.conn, "/v1/client/nutrition-days", %{
          "from" => "not-a-date",
          "to" => "also-not-a-date"
        })

      assert %{"error_detail" => %{"fields" => %{"date" => ["is invalid"]}}} = json_response(conn, 422)
    end
  end
end
