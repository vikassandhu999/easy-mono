defmodule EasyWeb.Coaches.ClientPlanControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, client: client, business: coach.business}
  end

  describe "GET /v1/coach/clients/:client_id/training_plans" do
    test "lists only this client's training plans", ctx do
      insert(:training_plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-01-31]
      )

      # Template — should NOT appear
      insert(:training_plan, creator: ctx.coach, business: ctx.business)

      # Other client's plan — should NOT appear
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      insert(:training_plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: other_client.id,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-01-31]
      )

      conn = get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/training_plans")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
      assert hd(data)["client_id"] == ctx.client.id
      assert hd(data)["client"]["id"] == ctx.client.id
    end

    test "returns empty list when client has no plans", ctx do
      conn = get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/training_plans")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end

    test "filters by status", ctx do
      insert(:training_plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :active,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-01-31]
      )

      insert(:training_plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :archived,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-01-31]
      )

      conn =
        get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/training_plans", %{
          "status" => "active"
        })

      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert hd(data)["status"] == "active"
    end

    test "returns 404 for client from another business", ctx do
      other_coach = insert(:coach)
      other_client = insert(:client, creator: other_coach, business: other_coach.business)

      conn = get(ctx.conn, "/v1/coach/clients/#{other_client.id}/training_plans")
      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent client", ctx do
      conn = get(ctx.conn, "/v1/coach/clients/#{Ecto.UUID.generate()}/training_plans")
      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/clients/:client_id/nutrition-plans" do
    test "lists only this client's nutrition plans", ctx do
      insert(:plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :active
      )

      # Template — should NOT appear
      insert(:plan, creator: ctx.coach, business: ctx.business)

      # Other client's plan — should NOT appear
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      insert(:plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: other_client.id
      )

      conn = get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/nutrition-plans")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
      assert hd(data)["client_id"] == ctx.client.id
      assert hd(data)["client"]["id"] == ctx.client.id
    end

    test "returns empty list when client has no plans", ctx do
      conn = get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/nutrition-plans")
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

      conn =
        get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/nutrition-plans", %{
          "status" => "active"
        })

      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert hd(data)["status"] == "active"
    end

    test "returns 404 for client from another business", ctx do
      other_coach = insert(:coach)
      other_client = insert(:client, creator: other_coach, business: other_coach.business)

      conn = get(ctx.conn, "/v1/coach/clients/#{other_client.id}/nutrition-plans")
      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent client", ctx do
      conn = get(ctx.conn, "/v1/coach/clients/#{Ecto.UUID.generate()}/nutrition-plans")
      assert json_response(conn, 404)
    end
  end
end
