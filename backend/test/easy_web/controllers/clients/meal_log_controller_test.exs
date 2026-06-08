defmodule EasyWeb.Clients.MealLogControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_client(client)
    food = insert(:food, creator: coach, business: coach.business, name: "Oats")

    %{conn: conn, coach: coach, client: client, business: coach.business, food: food}
  end

  describe "GET /v1/client/meal_logs" do
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

      conn = get(ctx.conn, "/v1/client/meal_logs", %{"date" => "2026-03-25"})
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

      conn = get(ctx.conn, "/v1/client/meal_logs")
      assert %{"data" => data} = json_response(conn, 200)
      assert length(data) == 2
    end

    test "does not show other client's logs", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      insert(:meal_log, client: other_client, business: ctx.business)

      conn = get(ctx.conn, "/v1/client/meal_logs")
      assert %{"data" => []} = json_response(conn, 200)
    end
  end

  describe "GET /v1/client/meal_logs/:id" do
    test "returns meal log with entries", ctx do
      meal_log = insert(:meal_log, client: ctx.client, business: ctx.business)
      insert(:food_log_entry, meal_log: meal_log, food: ctx.food, food_name: "Oats")

      conn = get(ctx.conn, "/v1/client/meal_logs/#{meal_log.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == meal_log.id
      assert length(data["food_log_entries"]) == 1
    end

    test "returns 404 for other client's log", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      meal_log = insert(:meal_log, client: other_client, business: ctx.business)

      conn = get(ctx.conn, "/v1/client/meal_logs/#{meal_log.id}")
      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent id", ctx do
      conn = get(ctx.conn, "/v1/client/meal_logs/#{Ecto.UUID.generate()}")
      assert json_response(conn, 404)
    end
  end
end
