defmodule EasyWeb.Coaches.FoodLogControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)
    client = insert(:client, creator: coach, business: coach.business, status: :active)
    food = insert(:food, creator: coach, business: coach.business, name: "Oats")

    %{conn: conn, coach: coach, business: coach.business, client: client, food: food}
  end

  describe "GET /v1/coach/food_logs" do
    test "lists client logs for a date", ctx do
      log =
        insert(:food_log,
          client: ctx.client,
          business: ctx.business,
          food: ctx.food,
          date: ~D[2026-03-25]
        )

      # Different date
      insert(:food_log,
        client: ctx.client,
        business: ctx.business,
        food: ctx.food,
        date: ~D[2026-03-26]
      )

      conn =
        get(ctx.conn, "/v1/coach/food_logs", %{
          "client_id" => ctx.client.id,
          "date" => "2026-03-25"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert length(data) == 1
      assert hd(data)["id"] == log.id
      assert hd(data)["client_id"] == ctx.client.id
    end

    test "lists client logs for a date range", ctx do
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

      insert(:food_log,
        client: ctx.client,
        business: ctx.business,
        food: ctx.food,
        date: ~D[2026-03-28]
      )

      conn =
        get(ctx.conn, "/v1/coach/food_logs", %{
          "client_id" => ctx.client.id,
          "from" => "2026-03-25",
          "to" => "2026-03-26"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert length(data) == 2
    end

    test "returns 404 for other business client", ctx do
      other_coach = insert(:coach)

      other_client =
        insert(:client, creator: other_coach, business: other_coach.business, status: :active)

      conn = get(ctx.conn, "/v1/coach/food_logs", %{"client_id" => other_client.id})
      assert json_response(conn, 404)
    end

    test "returns 403 without auth" do
      conn = build_conn() |> get("/v1/coach/food_logs", %{"client_id" => Ecto.UUID.generate()})
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/coach/food_logs/summary" do
    test "returns daily macro summaries", ctx do
      insert(:food_log,
        client: ctx.client,
        business: ctx.business,
        food: ctx.food,
        date: ~D[2026-03-25],
        weight_g: 100.0,
        macros_snapshot: %{
          "calories_per_100g" => 389,
          "protein_g" => 16.9,
          "carbs_g" => 66.3,
          "fat_g" => 6.9
        }
      )

      insert(:food_log,
        client: ctx.client,
        business: ctx.business,
        food: ctx.food,
        date: ~D[2026-03-25],
        meal_slot: "lunch",
        weight_g: 200.0,
        macros_snapshot: %{
          "calories_per_100g" => 130,
          "protein_g" => 2.7,
          "carbs_g" => 28,
          "fat_g" => 0.3
        }
      )

      conn =
        get(ctx.conn, "/v1/coach/food_logs/summary", %{
          "client_id" => ctx.client.id,
          "from" => "2026-03-25",
          "to" => "2026-03-25"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert length(data) == 1

      summary = hd(data)
      assert summary["date"] == "2026-03-25"
      assert summary["total_entries"] == 2
      # 389*100/100 + 130*200/100 = 389 + 260 = 649
      assert summary["totals"]["calories"] == 649.0
    end

    test "returns empty for date range with no logs", ctx do
      conn =
        get(ctx.conn, "/v1/coach/food_logs/summary", %{
          "client_id" => ctx.client.id,
          "from" => "2026-01-01",
          "to" => "2026-01-07"
        })

      assert %{"data" => []} = json_response(conn, 200)
    end
  end

  describe "DELETE /v1/coach/food_logs/:id" do
    test "deletes a food log entry", ctx do
      log = insert(:food_log, client: ctx.client, business: ctx.business, food: ctx.food)

      conn = delete(ctx.conn, "/v1/coach/food_logs/#{log.id}")
      assert response(conn, 204)
    end

    test "returns 404 for other business log", ctx do
      other_coach = insert(:coach)
      other_client = insert(:client, creator: other_coach, business: other_coach.business)

      log =
        insert(:food_log,
          client: other_client,
          business: other_coach.business,
          food: insert(:food, creator: other_coach, business: other_coach.business)
        )

      conn = delete(ctx.conn, "/v1/coach/food_logs/#{log.id}")
      assert json_response(conn, 404)
    end
  end
end
