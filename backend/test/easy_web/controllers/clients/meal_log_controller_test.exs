defmodule EasyWeb.Clients.MealLogControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_client(client)
    food = insert(:food, creator: coach, business: coach.business, name: "Oats")

    %{conn: conn, coach: coach, client: client, business: coach.business, food: food}
  end

  describe "GET /v1/client/nutrition-meal-logs" do
    test "lists meal logs for a date with entries", ctx do
      meal_log =
        insert(:meal_log, client: ctx.client, business: ctx.business, date: ~D[2026-03-25])

      insert(:food_log_entry, meal_log: meal_log, business: ctx.business, food: ctx.food, food_name: "Oats")

      # Different date -- should not appear
      insert(:meal_log,
        client: ctx.client,
        business: ctx.business,
        date: ~D[2026-03-26],
        meal_slot: "lunch"
      )

      conn = get(ctx.conn, "/v1/client/nutrition-meal-logs", %{"date" => "2026-03-25"})
      assert %{"data" => data} = json_response(conn, 200)
      assert length(data) == 1
      assert hd(data)["date"] == "2026-03-25"
      assert length(hd(data)["food_log_entries"]) == 1
      assert hd(hd(data)["food_log_entries"])["food_name"] == "Oats"
    end

    test "no date filter defaults to today, not the whole history", ctx do
      insert(:meal_log, client: ctx.client, business: ctx.business, date: Date.utc_today())

      insert(:meal_log,
        client: ctx.client,
        business: ctx.business,
        date: ~D[2026-03-26],
        meal_slot: "lunch"
      )

      conn = get(ctx.conn, "/v1/client/nutrition-meal-logs")
      assert %{"data" => data} = json_response(conn, 200)
      assert length(data) == 1
      assert hd(data)["date"] == Date.to_iso8601(Date.utc_today())
    end

    test "does not show other client's logs", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      insert(:meal_log, client: other_client, business: ctx.business)

      conn = get(ctx.conn, "/v1/client/nutrition-meal-logs")
      assert %{"data" => []} = json_response(conn, 200)
    end

    test "lists meal logs for a date range", ctx do
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
        get(ctx.conn, "/v1/client/nutrition-meal-logs", %{
          "from" => "2026-03-25",
          "to" => "2026-03-26"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert length(data) == 2
    end

    test "accepts an inclusive 31-day range", ctx do
      conn =
        get(ctx.conn, "/v1/client/nutrition-meal-logs", %{
          "from" => "2026-03-01",
          "to" => "2026-03-31"
        })

      assert %{"data" => []} = json_response(conn, 200)
    end

    test "rejects a range wider than 31 days", ctx do
      conn =
        get(ctx.conn, "/v1/client/nutrition-meal-logs", %{
          "from" => "2026-03-01",
          "to" => "2026-04-01"
        })

      assert %{
               "error_code" => "invalid_input",
               "error_detail" => %{"fields" => %{"range" => ["must span 31 days or less"]}}
             } = json_response(conn, 422)
    end

    test "rejects a reversed range", ctx do
      conn =
        get(ctx.conn, "/v1/client/nutrition-meal-logs", %{
          "from" => "2026-03-31",
          "to" => "2026-03-01"
        })

      assert %{
               "error_code" => "invalid_input",
               "error_detail" => %{"fields" => %{"range" => ["from must be on or before to"]}}
             } = json_response(conn, 422)
    end

    test "rejects a range with a missing bound", ctx do
      conn = get(ctx.conn, "/v1/client/nutrition-meal-logs", %{"from" => "2026-03-01"})

      assert %{
               "error_code" => "invalid_input",
               "error_detail" => %{"fields" => %{"range" => ["from and to must be provided together"]}}
             } = json_response(conn, 422)
    end
  end
end
