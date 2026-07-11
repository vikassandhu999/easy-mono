defmodule EasyWeb.Clients.FoodControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_client(client)

    %{conn: conn, coach: coach, client: client, business: coach.business}
  end

  describe "GET /v1/client/nutrition-foods" do
    test "lists business and system foods", ctx do
      insert(:food, creator: ctx.coach, business: ctx.business, name: "Business Oats")
      insert(:food, name: "System Rice", business: nil, creator: nil)

      conn = get(ctx.conn, "/v1/client/nutrition-foods")
      assert %{"data" => data, "count" => count} = json_response(conn, 200)
      assert count >= 2
      names = Enum.map(data, & &1["name"])
      assert "Business Oats" in names
      assert "System Rice" in names
    end

    test "searches foods by name", ctx do
      insert(:food, creator: ctx.coach, business: ctx.business, name: "Chicken Breast")
      insert(:food, creator: ctx.coach, business: ctx.business, name: "Brown Rice")

      conn = get(ctx.conn, "/v1/client/nutrition-foods", %{"search" => "chicken"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data != []
      assert Enum.any?(data, &(&1["name"] == "Chicken Breast"))
    end

    test "paginates results", ctx do
      for i <- 1..3,
          do: insert(:food, creator: ctx.coach, business: ctx.business, name: "Food #{i}")

      conn = get(ctx.conn, "/v1/client/nutrition-foods", %{"offset" => "0", "limit" => "2"})
      assert %{"data" => data, "count" => count} = json_response(conn, 200)
      assert count >= 3
      assert length(data) == 2
    end

    test "does not show other business foods", ctx do
      other_coach = insert(:coach)
      insert(:food, creator: other_coach, business: other_coach.business, name: "Secret Food")

      conn = get(ctx.conn, "/v1/client/nutrition-foods", %{"search" => "Secret"})
      assert %{"data" => []} = json_response(conn, 200)
    end

    test "returns 403 without auth" do
      conn = build_conn() |> get("/v1/client/nutrition-foods")
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/client/nutrition-foods/:id" do
    test "returns food detail", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Dal")

      conn = get(ctx.conn, "/v1/client/nutrition-foods/#{food.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == food.id
      assert data["name"] == "Dal"
      assert data["calories_per_100g"] != nil
    end

    test "returns 404 for other business food", ctx do
      other_coach = insert(:coach)
      food = insert(:food, creator: other_coach, business: other_coach.business)

      conn = get(ctx.conn, "/v1/client/nutrition-foods/#{food.id}")
      assert json_response(conn, 404)
    end
  end
end
