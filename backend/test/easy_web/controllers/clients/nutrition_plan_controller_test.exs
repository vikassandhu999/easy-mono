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
      assert hd(data)["lifecycle"] == "incomplete"
      assert hd(data)["meals"] == []
      assert Map.has_key?(hd(data), "day_patterns")
    end

    test "returns empty list when no plans assigned", ctx do
      conn = get(ctx.conn, "/v1/client/nutrition-plans")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end

    test "omits archived Client Plans unless status is archived", ctx do
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
        status: :archived,
        start_date: ~D[2026-07-01],
        end_date: ~D[2026-07-31]
      )

      conn = get(ctx.conn, "/v1/client/nutrition-plans")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert hd(data)["status"] == "active"

      archived_conn = get(ctx.conn, "/v1/client/nutrition-plans", %{"status" => "archived"})
      assert %{"data" => archived, "count" => 1} = json_response(archived_conn, 200)
      assert hd(archived)["status"] == "archived"
    end

    test "returns 403 without auth" do
      conn = build_conn() |> get("/v1/client/nutrition-plans")
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/client/nutrition-plans/:id" do
    test "returns plan with Day Patterns", ctx do
      plan =
        insert(:plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          status: :active
        )

      conn = get(ctx.conn, "/v1/client/nutrition-plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == plan.id
      assert data["kind"] == "client_plan"
      assert data["lifecycle"] == "incomplete"
      assert data["day_patterns"] == []
      assert data["meals"] == []
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

    test "returns an archived Client Plan listed by the archived filter", ctx do
      plan =
        insert(:plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          status: :archived,
          start_date: ~D[2026-07-01]
        )

      conn = get(ctx.conn, "/v1/client/nutrition-plans/#{plan.id}")
      assert %{"data" => %{"id" => id, "status" => "archived"}} = json_response(conn, 200)
      assert id == plan.id
    end

    test "returns 404 for template plan", ctx do
      plan = insert(:plan, creator: ctx.coach, business: ctx.business)

      conn = get(ctx.conn, "/v1/client/nutrition-plans/#{plan.id}")
      assert json_response(conn, 404)
    end
  end
end
