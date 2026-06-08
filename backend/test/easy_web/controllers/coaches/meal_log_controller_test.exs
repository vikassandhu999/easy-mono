defmodule EasyWeb.Coaches.MealLogControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)
    client = insert(:client, creator: coach, business: coach.business, status: :active)
    food = insert(:food, creator: coach, business: coach.business, name: "Oats")

    %{conn: conn, coach: coach, business: coach.business, client: client, food: food}
  end

  describe "GET /v1/coach/meal_logs" do
    test "lists client meal logs for a date", ctx do
      meal_log =
        insert(:meal_log, client: ctx.client, business: ctx.business, date: ~D[2026-03-25])

      insert(:food_log_entry, meal_log: meal_log, food: ctx.food, food_name: "Oats")

      # Different date
      insert(:meal_log,
        client: ctx.client,
        business: ctx.business,
        date: ~D[2026-03-26],
        meal_slot: "lunch"
      )

      conn =
        get(ctx.conn, "/v1/coach/meal_logs", %{
          "client_id" => ctx.client.id,
          "date" => "2026-03-25"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert length(data) == 1
      assert hd(data)["id"] == meal_log.id
      assert hd(data)["client_id"] == ctx.client.id
      assert length(hd(data)["food_log_entries"]) == 1
    end

    test "lists client meal logs for a date range", ctx do
      insert(:meal_log, client: ctx.client, business: ctx.business, date: ~D[2026-03-25])

      insert(:meal_log,
        client: ctx.client,
        business: ctx.business,
        date: ~D[2026-03-26],
        meal_slot: "lunch"
      )

      insert(:meal_log,
        client: ctx.client,
        business: ctx.business,
        date: ~D[2026-03-28],
        meal_slot: "dinner"
      )

      conn =
        get(ctx.conn, "/v1/coach/meal_logs", %{
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

      conn = get(ctx.conn, "/v1/coach/meal_logs", %{"client_id" => other_client.id})
      assert json_response(conn, 404)
    end

    test "returns 403 without auth" do
      conn = build_conn() |> get("/v1/coach/meal_logs", %{"client_id" => Ecto.UUID.generate()})
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/coach/meal_logs/summary" do
    test "returns daily macro summaries", ctx do
      ml1 =
        insert(:meal_log,
          client: ctx.client,
          business: ctx.business,
          date: ~D[2026-03-25],
          planned_calories: 500.0,
          logged_calories: 450.0
        )

      insert(:food_log_entry,
        meal_log: ml1,
        food: ctx.food,
        food_name: "Oats",
        calories: 389.0,
        source: :planned
      )

      ml2 =
        insert(:meal_log,
          client: ctx.client,
          business: ctx.business,
          date: ~D[2026-03-25],
          meal_slot: "lunch",
          planned_calories: 700.0,
          logged_calories: 600.0
        )

      insert(:food_log_entry,
        meal_log: ml2,
        food: ctx.food,
        food_name: "Rice",
        calories: 260.0,
        source: :planned
      )

      insert(:food_log_entry,
        meal_log: ml2,
        food: ctx.food,
        food_name: "Chicken",
        calories: 340.0,
        source: :replacement,
        planned_item_index: 1
      )

      conn =
        get(ctx.conn, "/v1/coach/meal_logs/summary", %{
          "client_id" => ctx.client.id,
          "from" => "2026-03-25",
          "to" => "2026-03-25"
        })

      assert %{"data" => [summary]} = json_response(conn, 200)
      assert summary["date"] == "2026-03-25"
      assert summary["meals_logged"] == 2
      assert summary["total_entries"] == 3
      assert summary["planned_calories"] == 1200.0
      assert summary["logged_calories"] == 1050.0
      assert summary["replacements"] == 1
      assert summary["unplanned_count"] == 0
    end

    test "returns empty for date range with no logs", ctx do
      conn =
        get(ctx.conn, "/v1/coach/meal_logs/summary", %{
          "client_id" => ctx.client.id,
          "from" => "2026-01-01",
          "to" => "2026-01-07"
        })

      assert %{"data" => []} = json_response(conn, 200)
    end
  end

  describe "DELETE /v1/coach/food_log_entries/:id" do
    test "deletes a food log entry", ctx do
      meal_log = insert(:meal_log, client: ctx.client, business: ctx.business)
      entry = insert(:food_log_entry, meal_log: meal_log, food: ctx.food)

      conn = delete(ctx.conn, "/v1/coach/food_log_entries/#{entry.id}")
      assert response(conn, 204)
    end

    test "returns 404 for other business entry", ctx do
      other_coach = insert(:coach)
      other_client = insert(:client, creator: other_coach, business: other_coach.business)
      meal_log = insert(:meal_log, client: other_client, business: other_coach.business)

      entry =
        insert(:food_log_entry,
          meal_log: meal_log,
          food: insert(:food, creator: other_coach, business: other_coach.business)
        )

      conn = delete(ctx.conn, "/v1/coach/food_log_entries/#{entry.id}")
      assert json_response(conn, 404)
    end
  end
end
