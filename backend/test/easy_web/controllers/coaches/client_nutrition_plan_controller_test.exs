defmodule EasyWeb.Coaches.ClientNutritionPlanControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, client: client, business: coach.business}
  end

  describe "GET /v1/coach/clients/:client_id/nutrition-plans" do
    test "lists only this client's nutrition plans", ctx do
      insert(:plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :active
      )

      insert(:plan, creator: ctx.coach, business: ctx.business)
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      insert(:plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: other_client.id
      )

      conn = get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/nutrition-plans")
      assert %{"data" => [plan], "count" => 1} = json_response(conn, 200)
      assert plan["client_id"] == ctx.client.id
      assert plan["client"]["id"] == ctx.client.id
      assert plan["creator_id"] == ctx.coach.user.id
      assert Map.has_key?(plan, "source_template_id")
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

      assert %{"data" => [%{"status" => "active"}], "count" => 1} = json_response(conn, 200)
    end

    test "returns 404 for inaccessible clients", ctx do
      other_coach = insert(:coach)
      other_client = insert(:client, creator: other_coach, business: other_coach.business)

      assert ctx.conn
             |> get("/v1/coach/clients/#{other_client.id}/nutrition-plans")
             |> json_response(404)

      assert ctx.conn
             |> get("/v1/coach/clients/#{Ecto.UUID.generate()}/nutrition-plans")
             |> json_response(404)
    end
  end
end
