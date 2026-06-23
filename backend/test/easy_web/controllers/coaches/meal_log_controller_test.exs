defmodule EasyWeb.Coaches.MealLogControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)
    client = insert(:client, creator: coach, business: coach.business, status: :active)
    food = insert(:food, creator: coach, business: coach.business, name: "Oats")

    %{conn: conn, coach: coach, business: coach.business, client: client, food: food}
  end

  describe "GET /v1/coach/clients/:client_id/nutrition-meal-logs" do
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
        get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/nutrition-meal-logs", %{
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
        get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/nutrition-meal-logs", %{
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

      conn = get(ctx.conn, "/v1/coach/clients/#{other_client.id}/nutrition-meal-logs")
      assert json_response(conn, 404)
    end

    test "returns 403 without auth" do
      client_id = Ecto.UUID.generate()
      conn = build_conn() |> get("/v1/coach/clients/#{client_id}/nutrition-meal-logs")
      assert json_response(conn, 403)
    end
  end
end
