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

      insert(:food_log_entry, meal_log: meal_log, food: ctx.food, food_name: "Oats")

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

    test "lists all logs without date filter", ctx do
      insert(:meal_log, client: ctx.client, business: ctx.business, date: ~D[2026-03-25])

      insert(:meal_log,
        client: ctx.client,
        business: ctx.business,
        date: ~D[2026-03-26],
        meal_slot: "lunch"
      )

      conn = get(ctx.conn, "/v1/client/nutrition-meal-logs")
      assert %{"data" => data} = json_response(conn, 200)
      assert length(data) == 2
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
  end
end
