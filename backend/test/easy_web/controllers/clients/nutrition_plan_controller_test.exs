defmodule EasyWeb.Clients.NutritionPlanControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_client(client)

    %{conn: conn, coach: coach, client: client, business: coach.business}
  end

  describe "GET /v1/client/nutrition_plans" do
    test "lists only personal plans assigned to the client", ctx do
      insert(:plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :active
      )

      # Template — should not appear
      insert(:plan, creator: ctx.coach, business: ctx.business)

      # Assigned to another client — should not appear
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      insert(:plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: other_client.id
      )

      conn = get(ctx.conn, "/v1/client/nutrition_plans")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
      assert hd(data)["id"] != nil
      # Index response should not include meals/plan_items
      refute Map.has_key?(hd(data), "meals")
      refute Map.has_key?(hd(data), "plan_items")
    end

    test "returns empty list when no plans assigned", ctx do
      conn = get(ctx.conn, "/v1/client/nutrition_plans")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end

    test "filters by status", ctx do
      insert(:plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :active
      )

      insert(:plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :archived
      )

      conn = get(ctx.conn, "/v1/client/nutrition_plans", %{"status" => "active"})
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
    end

    test "returns 403 without auth" do
      conn = build_conn() |> get("/v1/client/nutrition_plans")
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/client/nutrition_plans/:id" do
    test "returns plan with meals and plan_items", ctx do
      plan =
        insert(:plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          status: :active
        )

      meal = insert(:meal, plan: plan, creator: ctx.coach, business: ctx.business)

      insert(:meal_item,
        meal: meal,
        business: ctx.business,
        food: insert(:food, creator: ctx.coach, business: ctx.business)
      )

      insert(:plan_item,
        plan: plan,
        meal: meal,
        creator: ctx.coach,
        business: ctx.business
      )

      conn = get(ctx.conn, "/v1/client/nutrition_plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == plan.id
      assert length(data["meals"]) == 1
      assert length(data["plan_items"]) == 1

      # Meal items include food detail
      meal_data = hd(data["meals"])
      assert length(meal_data["meal_items"]) == 1
      item = hd(meal_data["meal_items"])
      assert item["food"] != nil
      assert item["food"]["name"] != nil
    end

    test "returns 404 for other client's plan", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      plan =
        insert(:plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: other_client.id
        )

      conn = get(ctx.conn, "/v1/client/nutrition_plans/#{plan.id}")
      assert json_response(conn, 404)
    end

    test "returns 404 for template plan", ctx do
      plan = insert(:plan, creator: ctx.coach, business: ctx.business)

      conn = get(ctx.conn, "/v1/client/nutrition_plans/#{plan.id}")
      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/client/nutrition_plans/today" do
    test "returns today's meals from active plan", ctx do
      plan =
        insert(:plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          status: :active
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

      insert(:plan_item,
        plan: plan,
        meal: meal,
        creator: ctx.coach,
        business: ctx.business,
        day: day,
        meal_type: "breakfast"
      )

      conn = get(ctx.conn, "/v1/client/nutrition_plans/today")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["date"] == Date.to_iso8601(today)
      assert data["day"] == day
      assert data["plan_id"] == plan.id
      assert length(data["meals"]) == 1

      meal_data = hd(data["meals"])
      assert meal_data["meal_slot"] == "breakfast"
      assert meal_data["meal_name"] == "Breakfast"
      assert length(meal_data["items"]) == 1

      item = hd(meal_data["items"])
      assert item["food_name"] == "Oats"
      assert item["amount"] == 100.0
    end

    test "returns 404 when no active plan", ctx do
      # Only an archived plan
      insert(:plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :archived
      )

      conn = get(ctx.conn, "/v1/client/nutrition_plans/today")
      assert json_response(conn, 404)
    end

    test "returns empty meals for a day with no plan_items", ctx do
      insert(:plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :active
      )

      # No plan_items for today's day
      conn = get(ctx.conn, "/v1/client/nutrition_plans/today")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["meals"] == []
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

      # Monday plan item
      insert(:plan_item,
        plan: plan,
        meal: meal,
        creator: ctx.coach,
        business: ctx.business,
        day: "monday",
        meal_type: "lunch"
      )

      # Query for a known Monday
      conn = get(ctx.conn, "/v1/client/nutrition_plans/today", %{"date" => "2026-03-30"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["date"] == "2026-03-30"
      assert data["day"] == "monday"
      assert length(data["meals"]) == 1
    end

    test "respects plan date range", ctx do
      # Plan that ended yesterday
      insert(:plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :active,
        start_date: ~D[2025-01-01],
        end_date: ~D[2025-12-31]
      )

      conn = get(ctx.conn, "/v1/client/nutrition_plans/today")
      assert json_response(conn, 404)
    end
  end
end
