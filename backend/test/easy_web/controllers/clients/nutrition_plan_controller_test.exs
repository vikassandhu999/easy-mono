defmodule EasyWeb.Clients.NutritionPlanControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_client(client)

    %{conn: conn, coach: coach, client: client, business: coach.business}
  end

  describe "GET /v1/client/nutrition-plans" do
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

      conn = get(ctx.conn, "/v1/client/nutrition-plans")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
      assert hd(data)["id"] != nil
      # Index response should not include meals
      refute Map.has_key?(hd(data), "meals")
    end

    test "returns empty list when no plans assigned", ctx do
      conn = get(ctx.conn, "/v1/client/nutrition-plans")
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

      conn = get(ctx.conn, "/v1/client/nutrition-plans", %{"status" => "active"})
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
    end

    test "returns 403 without auth" do
      conn = build_conn() |> get("/v1/client/nutrition-plans")
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/client/nutrition-plans/:id" do
    test "returns plan with meals", ctx do
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

      conn = get(ctx.conn, "/v1/client/nutrition-plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == plan.id
      assert length(data["meals"]) == 1

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

      conn = get(ctx.conn, "/v1/client/nutrition-plans/#{plan.id}")
      assert json_response(conn, 404)
    end

    test "returns 404 for template plan", ctx do
      plan = insert(:plan, creator: ctx.coach, business: ctx.business)

      conn = get(ctx.conn, "/v1/client/nutrition-plans/#{plan.id}")
      assert json_response(conn, 404)
    end
  end
end
