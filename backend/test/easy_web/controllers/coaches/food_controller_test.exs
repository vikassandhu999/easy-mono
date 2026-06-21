defmodule EasyWeb.Coaches.FoodControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/foods" do
    test "creates a food with valid params", %{conn: conn} do
      attrs = build(:food_attrs)

      conn = post(conn, "/v1/coach/foods", attrs)
      assert %{"data" => data} = json_response(conn, 201)

      assert data["name"] == attrs["name"]
      assert data["calories_per_100g"] == attrs["calories_per_100g"]
      assert data["protein_g_per_100g"] == attrs["protein_g_per_100g"]
      assert data["carbs_g_per_100g"] == attrs["carbs_g_per_100g"]
      assert data["fat_g_per_100g"] == attrs["fat_g_per_100g"]
      assert data["fiber_g_per_100g"] == attrs["fiber_g_per_100g"]
      assert data["source"] == attrs["source"]

      assert [%{"label" => "1 cup", "unit" => "cup", "weight_g" => 100.0, "amount" => 1.0, "is_default" => true}] =
               data["serving_sizes"]

      assert data["id"]
      assert data["creator_id"]
      assert data["inserted_at"]
    end

    test "returns validation error when name is missing", %{conn: conn} do
      attrs = build(:food_attrs) |> Map.delete("name")

      conn = post(conn, "/v1/coach/foods", attrs)
      assert json_response(conn, 422)
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> post("/v1/coach/foods", %{"name" => "Test"})
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/coach/foods/:id" do
    test "returns a food by id", %{conn: conn, coach: coach, business: business} do
      food = insert(:food, creator: coach, business: business)

      conn = get(conn, "/v1/coach/foods/#{food.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == food.id
      assert data["name"] == food.name
    end

    test "returns 404 for non-existent food", %{conn: conn} do
      conn = get(conn, "/v1/coach/foods/#{Ecto.UUID.generate()}")
      assert json_response(conn, 404)
    end

    test "cannot access food from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_food = insert(:food, creator: other_coach, business: other_coach.business)

      conn = get(conn, "/v1/coach/foods/#{other_food.id}")
      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/foods/:id" do
    test "updates a food with valid params", %{conn: conn, coach: coach, business: business} do
      food = insert(:food, creator: coach, business: business)

      conn = patch(conn, "/v1/coach/foods/#{food.id}", %{"name" => "Updated Name"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["name"] == "Updated Name"
      assert data["id"] == food.id
    end

    test "returns 404 when updating food from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_food = insert(:food, creator: other_coach, business: other_coach.business)

      conn = patch(conn, "/v1/coach/foods/#{other_food.id}", %{"name" => "Hacked"})
      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent food", %{conn: conn} do
      conn = patch(conn, "/v1/coach/foods/#{Ecto.UUID.generate()}", %{"name" => "Nope"})
      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/foods" do
    test "returns paginated list of foods", %{conn: conn, coach: coach, business: business} do
      for _ <- 1..3, do: insert(:food, creator: coach, business: business)

      conn = get(conn, "/v1/coach/foods")
      assert %{"data" => foods, "count" => count} = json_response(conn, 200)

      assert count == 3
      assert length(foods) == 3
    end

    test "paginates results with offset and limit", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      for _ <- 1..5, do: insert(:food, creator: coach, business: business)

      conn = get(conn, "/v1/coach/foods", %{"offset" => "2", "limit" => "2"})
      assert %{"data" => foods, "count" => 5} = json_response(conn, 200)

      assert length(foods) == 2
    end

    test "does not return foods from another business", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      insert(:food, creator: coach, business: business)

      other_coach = insert(:coach)
      insert(:food, creator: other_coach, business: other_coach.business)

      conn = get(conn, "/v1/coach/foods")
      assert %{"data" => foods, "count" => 1} = json_response(conn, 200)

      assert length(foods) == 1
    end

    test "returns empty list when no foods exist", %{conn: conn} do
      conn = get(conn, "/v1/coach/foods")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end

    test "filters by search term", %{conn: conn, coach: coach, business: business} do
      insert(:food, name: "Chicken Breast", creator: coach, business: business)
      insert(:food, name: "Brown Rice", creator: coach, business: business)

      conn = get(conn, "/v1/coach/foods", %{"search" => "chicken"})
      assert %{"data" => [food], "count" => 1} = json_response(conn, 200)

      assert food["name"] == "Chicken Breast"
    end
  end

  describe "DELETE /v1/coach/foods/:id" do
    test "deletes a food successfully", %{conn: conn, coach: coach, business: business} do
      food = insert(:food, creator: coach, business: business)

      conn = delete(conn, "/v1/coach/foods/#{food.id}")
      assert response(conn, 204)

      # Verify the food is actually gone
      conn = build_conn() |> authenticate_coach(coach) |> get("/v1/coach/foods/#{food.id}")
      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent food", %{conn: conn} do
      conn = delete(conn, "/v1/coach/foods/#{Ecto.UUID.generate()}")
      assert json_response(conn, 404)
    end

    test "cannot delete food from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_food = insert(:food, creator: other_coach, business: other_coach.business)

      conn = delete(conn, "/v1/coach/foods/#{other_food.id}")
      assert json_response(conn, 404)
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> delete("/v1/coach/foods/#{Ecto.UUID.generate()}")
      assert json_response(conn, 403)
    end
  end
end
