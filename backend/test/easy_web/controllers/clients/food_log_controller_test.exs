defmodule EasyWeb.Clients.FoodLogControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_client(client)
    food = insert(:food, creator: coach, business: coach.business, name: "Oats")

    %{conn: conn, coach: coach, client: client, business: coach.business, food: food}
  end

  describe "POST /v1/client/food_logs" do
    test "creates a food log entry with auto-populated snapshot", ctx do
      attrs = build(:food_log_attrs) |> Map.put("food_id", ctx.food.id)

      conn = post(ctx.conn, "/v1/client/food_logs", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["food_id"] == ctx.food.id
      assert data["macros_snapshot"] != nil
      assert data["food_name_snapshot"] == "Oats"
      assert data["meal_slot"] == "breakfast"
      assert data["food"]["id"] == ctx.food.id
    end

    test "rejects invalid meal_slot", ctx do
      attrs =
        build(:food_log_attrs)
        |> Map.put("food_id", ctx.food.id)
        |> Map.put("meal_slot", "brunch")

      conn = post(ctx.conn, "/v1/client/food_logs", attrs)
      assert json_response(conn, 422)
    end

    test "rejects missing food_id and recipe_id", ctx do
      attrs = build(:food_log_attrs)

      conn = post(ctx.conn, "/v1/client/food_logs", attrs)
      assert json_response(conn, 422)
    end

    test "rejects food_id from other business", ctx do
      other_coach = insert(:coach)
      other_food = insert(:food, creator: other_coach, business: other_coach.business)

      attrs = build(:food_log_attrs) |> Map.put("food_id", other_food.id)

      conn = post(ctx.conn, "/v1/client/food_logs", attrs)
      assert json_response(conn, 422)
    end

    test "returns 403 without auth" do
      conn = build_conn() |> post("/v1/client/food_logs", %{})
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/client/food_logs" do
    test "lists logs for a given date", ctx do
      log =
        insert(:food_log,
          client: ctx.client,
          business: ctx.business,
          food: ctx.food,
          date: ~D[2026-03-25]
        )

      # Different date — should not appear
      insert(:food_log,
        client: ctx.client,
        business: ctx.business,
        food: ctx.food,
        date: ~D[2026-03-26]
      )

      conn = get(ctx.conn, "/v1/client/food_logs", %{"date" => "2026-03-25"})
      assert %{"data" => data} = json_response(conn, 200)
      assert length(data) == 1
      assert hd(data)["id"] == log.id
    end

    test "lists all logs without date filter", ctx do
      insert(:food_log,
        client: ctx.client,
        business: ctx.business,
        food: ctx.food,
        date: ~D[2026-03-25]
      )

      insert(:food_log,
        client: ctx.client,
        business: ctx.business,
        food: ctx.food,
        date: ~D[2026-03-26]
      )

      conn = get(ctx.conn, "/v1/client/food_logs")
      assert %{"data" => data} = json_response(conn, 200)
      assert length(data) == 2
    end

    test "does not show other client's logs", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      insert(:food_log, client: other_client, business: ctx.business, food: ctx.food)

      conn = get(ctx.conn, "/v1/client/food_logs")
      assert %{"data" => []} = json_response(conn, 200)
    end
  end

  describe "PATCH /v1/client/food_logs/:id" do
    test "updates amount and notes", ctx do
      log = insert(:food_log, client: ctx.client, business: ctx.business, food: ctx.food)

      conn =
        patch(ctx.conn, "/v1/client/food_logs/#{log.id}", %{
          "amount" => 150,
          "notes" => "ate more"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["amount"] == 150.0
      assert data["notes"] == "ate more"
    end

    test "returns 404 for other client's log", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      log = insert(:food_log, client: other_client, business: ctx.business, food: ctx.food)

      conn = patch(ctx.conn, "/v1/client/food_logs/#{log.id}", %{"amount" => 200})
      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/client/food_logs/:id" do
    test "deletes a food log entry", ctx do
      log = insert(:food_log, client: ctx.client, business: ctx.business, food: ctx.food)

      conn = delete(ctx.conn, "/v1/client/food_logs/#{log.id}")
      assert response(conn, 204)
    end

    test "returns 404 for other client's log", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      log = insert(:food_log, client: other_client, business: ctx.business, food: ctx.food)

      conn = delete(ctx.conn, "/v1/client/food_logs/#{log.id}")
      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/client/food_logs/log_meal" do
    test "logs all items in a meal, skipping already logged", ctx do
      plan =
        insert(:plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          type: :personal
        )

      meal = insert(:meal, plan: plan, creator: ctx.coach, business: ctx.business)
      food2 = insert(:food, creator: ctx.coach, business: ctx.business, name: "Milk")

      insert(:meal_item,
        meal: meal,
        business: ctx.business,
        food: ctx.food,
        amount: 100,
        unit: "g",
        weight_g: 100
      )

      item2 =
        insert(:meal_item,
          meal: meal,
          business: ctx.business,
          food: food2,
          amount: 200,
          unit: "ml",
          weight_g: 200,
          position: 1
        )

      # Pre-log one item
      insert(:food_log,
        client: ctx.client,
        business: ctx.business,
        food: food2,
        meal_item: item2,
        date: ~D[2026-03-25],
        meal_slot: "breakfast"
      )

      conn =
        post(ctx.conn, "/v1/client/food_logs/log_meal", %{
          "date" => "2026-03-25",
          "meal_slot" => "breakfast",
          "meal_id" => meal.id
        })

      assert %{"data" => data} = json_response(conn, 201)
      # Only 1 new entry (the other was already logged)
      assert length(data) == 1
      assert hd(data)["food_name_snapshot"] == "Oats"
    end

    test "returns error for invalid date", ctx do
      conn =
        post(ctx.conn, "/v1/client/food_logs/log_meal", %{
          "date" => "not-a-date",
          "meal_slot" => "breakfast",
          "meal_id" => Ecto.UUID.generate()
        })

      assert json_response(conn, 422)
    end
  end

  describe "POST /v1/client/food_logs/log_day" do
    test "logs all meals for a day from plan", ctx do
      plan =
        insert(:plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          type: :personal
        )

      meal1 =
        insert(:meal, plan: plan, creator: ctx.coach, business: ctx.business, name: "Breakfast")

      meal2 = insert(:meal, plan: plan, creator: ctx.coach, business: ctx.business, name: "Lunch")

      insert(:meal_item,
        meal: meal1,
        business: ctx.business,
        food: ctx.food,
        amount: 100,
        unit: "g",
        weight_g: 100
      )

      food2 = insert(:food, creator: ctx.coach, business: ctx.business, name: "Rice")

      insert(:meal_item,
        meal: meal2,
        business: ctx.business,
        food: food2,
        amount: 200,
        unit: "g",
        weight_g: 200
      )

      # Plan items for Monday
      insert(:plan_item,
        plan: plan,
        meal: meal1,
        creator: ctx.coach,
        business: ctx.business,
        day: "monday",
        meal_type: "breakfast"
      )

      insert(:plan_item,
        plan: plan,
        meal: meal2,
        creator: ctx.coach,
        business: ctx.business,
        day: "monday",
        meal_type: "lunch"
      )

      conn =
        post(ctx.conn, "/v1/client/food_logs/log_day", %{
          "date" => "2026-03-30",
          "plan_id" => plan.id
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert length(data) == 2

      names = Enum.map(data, & &1["food_name_snapshot"])
      assert "Oats" in names
      assert "Rice" in names
    end

    test "returns 404 for plan not assigned to this client", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      plan =
        insert(:plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: other_client.id,
          type: :personal
        )

      conn =
        post(ctx.conn, "/v1/client/food_logs/log_day", %{
          "date" => "2026-03-30",
          "plan_id" => plan.id
        })

      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent plan_id", ctx do
      conn =
        post(ctx.conn, "/v1/client/food_logs/log_day", %{
          "date" => "2026-03-30",
          "plan_id" => Ecto.UUID.generate()
        })

      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/client/food_logs (recipe)" do
    test "creates a food log with recipe_id and auto-populates snapshot", ctx do
      recipe = insert(:recipe, creator: ctx.coach, business: ctx.business, name: "Dal Tadka")

      attrs =
        build(:food_log_attrs)
        |> Map.put("recipe_id", recipe.id)

      conn = post(ctx.conn, "/v1/client/food_logs", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["recipe_id"] == recipe.id
      assert data["food_id"] == nil
      assert data["food_name_snapshot"] == "Dal Tadka"
      assert data["macros_snapshot"] != nil
    end
  end

  describe "POST /v1/client/food_logs/log_meal (edge cases)" do
    test "returns error for non-existent meal_id", ctx do
      conn =
        post(ctx.conn, "/v1/client/food_logs/log_meal", %{
          "date" => "2026-03-25",
          "meal_slot" => "breakfast",
          "meal_id" => Ecto.UUID.generate()
        })

      assert json_response(conn, 404)
    end

    test "calling log_meal twice is idempotent", ctx do
      plan =
        insert(:plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          type: :personal
        )

      meal = insert(:meal, plan: plan, creator: ctx.coach, business: ctx.business)

      insert(:meal_item,
        meal: meal,
        business: ctx.business,
        food: ctx.food,
        amount: 100,
        unit: "g",
        weight_g: 100
      )

      params = %{
        "date" => "2026-03-25",
        "meal_slot" => "breakfast",
        "meal_id" => meal.id
      }

      conn1 = post(ctx.conn, "/v1/client/food_logs/log_meal", params)
      assert %{"data" => data1} = json_response(conn1, 201)
      assert length(data1) == 1

      # Second call — should create zero new entries
      conn2 = post(ctx.conn, "/v1/client/food_logs/log_meal", params)
      assert %{"data" => data2} = json_response(conn2, 201)
      assert data2 == []
    end
  end
end
