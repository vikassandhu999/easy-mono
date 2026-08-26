defmodule EasyWeb.Coaches.ClientTrainingPlanControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, client: client, business: coach.business}
  end

  describe "GET /v1/coach/clients/:client_id/training-plans" do
    test "lists only this client's training plans", ctx do
      today = Date.utc_today()

      insert(:training_plan,
        creator: ctx.coach.user,
        business: ctx.business,
        client: ctx.client,
        kind: :client_plan,
        start_date: Date.add(today, -31),
        end_date: Date.add(today, -1)
      )

      insert(:training_plan, creator: ctx.coach.user, business: ctx.business)
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      insert(:training_plan,
        creator: ctx.coach.user,
        business: ctx.business,
        client: other_client,
        kind: :client_plan,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-01-31]
      )

      conn = get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/training-plans")
      assert %{"data" => [plan], "count" => 1} = json_response(conn, 200)
      assert plan["client_id"] == ctx.client.id
      assert plan["client"]["id"] == ctx.client.id
      assert plan["creator_id"] == ctx.coach.user.id
      assert Map.has_key?(plan, "source_template_id")
      assert plan["lifecycle"] == "ended"
    end

    test "returns empty list when client has no plans", ctx do
      conn = get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/training-plans")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end

    test "filters by status", ctx do
      insert(:training_plan,
        creator: ctx.coach.user,
        business: ctx.business,
        client: ctx.client,
        kind: :client_plan,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-01-31]
      )

      insert(:training_plan,
        creator: ctx.coach.user,
        business: ctx.business,
        client: ctx.client,
        kind: :client_plan,
        archived_at: ~U[2026-08-15 12:00:00Z],
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-01-31]
      )

      conn =
        get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/training-plans", %{
          "status" => "active"
        })

      assert %{"data" => [%{"status" => "active"}], "count" => 1} = json_response(conn, 200)
    end

    test "rejects unknown query keys", ctx do
      conn =
        get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/training-plans", %{
          "unexpected" => "value"
        })

      assert %{"error_detail" => %{"fields" => %{"unexpected" => ["is unknown"]}}} =
               json_response(conn, 422)
    end

    test "returns 404 for inaccessible clients", ctx do
      other_coach = insert(:coach)
      other_client = insert(:client, creator: other_coach, business: other_coach.business)

      assert ctx.conn
             |> get("/v1/coach/clients/#{other_client.id}/training-plans")
             |> json_response(404)

      assert ctx.conn
             |> get("/v1/coach/clients/#{Ecto.UUID.generate()}/training-plans")
             |> json_response(404)
    end
  end
end
