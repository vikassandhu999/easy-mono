defmodule EasyWeb.Coaches.FoodControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/nutrition-foods" do
    test "creates a food with valid params", %{conn: conn} do
      attrs = build(:food_attrs)

      conn = post(conn, "/v1/coach/nutrition-foods", attrs)
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

      conn = post(conn, "/v1/coach/nutrition-foods", attrs)
      assert json_response(conn, 422)
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> post("/v1/coach/nutrition-foods", %{"name" => "Test"})
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/coach/nutrition-foods/:id" do
    test "returns a food by id", %{conn: conn, coach: coach, business: business} do
      food = insert(:food, creator: coach, business: business)

      conn = get(conn, "/v1/coach/nutrition-foods/#{food.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == food.id
      assert data["name"] == food.name
    end

    test "returns 404 for non-existent food", %{conn: conn} do
      conn = get(conn, "/v1/coach/nutrition-foods/#{Ecto.UUID.generate()}")
      assert json_response(conn, 404)
    end

    test "cannot access food from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_food = insert(:food, creator: other_coach, business: other_coach.business)

      conn = get(conn, "/v1/coach/nutrition-foods/#{other_food.id}")
      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/nutrition-foods/:id" do
    test "updates a food with valid params", %{conn: conn, coach: coach, business: business} do
      food = insert(:food, creator: coach, business: business)

      conn = patch(conn, "/v1/coach/nutrition-foods/#{food.id}", %{"name" => "Updated Name"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["name"] == "Updated Name"
      assert data["id"] == food.id
    end

    test "returns 404 when updating food from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_food = insert(:food, creator: other_coach, business: other_coach.business)

      conn = patch(conn, "/v1/coach/nutrition-foods/#{other_food.id}", %{"name" => "Hacked"})
      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent food", %{conn: conn} do
      conn = patch(conn, "/v1/coach/nutrition-foods/#{Ecto.UUID.generate()}", %{"name" => "Nope"})
      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/nutrition-foods" do
    test "returns paginated list of foods", %{conn: conn, coach: coach, business: business} do
      for _ <- 1..3, do: insert(:food, creator: coach, business: business)

      conn = get(conn, "/v1/coach/nutrition-foods")
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

      conn = get(conn, "/v1/coach/nutrition-foods", %{"offset" => "2", "limit" => "2"})
      assert %{"data" => foods, "count" => 5} = json_response(conn, 200)

      assert length(foods) == 2
    end

    test "uses a stable order for foods with matching timestamps", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      inserted_at = ~U[2026-06-29 00:00:00Z]

      insert(:food,
        id: "00000000-0000-0000-0000-000000000001",
        name: "Food A",
        creator: coach,
        business: business,
        inserted_at: inserted_at,
        updated_at: inserted_at
      )

      insert(:food,
        id: "00000000-0000-0000-0000-000000000003",
        name: "Food C",
        creator: coach,
        business: business,
        inserted_at: inserted_at,
        updated_at: inserted_at
      )

      insert(:food,
        id: "00000000-0000-0000-0000-000000000002",
        name: "Food B",
        creator: coach,
        business: business,
        inserted_at: inserted_at,
        updated_at: inserted_at
      )

      conn = get(conn, "/v1/coach/nutrition-foods", %{"offset" => "1", "limit" => "1"})
      assert %{"data" => [food], "count" => 3} = json_response(conn, 200)

      assert food["id"] == "00000000-0000-0000-0000-000000000002"
    end

    test "does not return foods from another business", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      insert(:food, creator: coach, business: business)

      other_coach = insert(:coach)
      insert(:food, creator: other_coach, business: other_coach.business)

      conn = get(conn, "/v1/coach/nutrition-foods")
      assert %{"data" => foods, "count" => 1} = json_response(conn, 200)

      assert length(foods) == 1
    end

    test "returns empty list when no foods exist", %{conn: conn} do
      conn = get(conn, "/v1/coach/nutrition-foods")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end

    test "filters by search term", %{conn: conn, coach: coach, business: business} do
      insert(:food, name: "Chicken Breast", creator: coach, business: business)
      insert(:food, name: "Brown Rice", creator: coach, business: business)

      conn = get(conn, "/v1/coach/nutrition-foods", %{"search" => "chicken"})
      assert %{"data" => [food], "count" => 1} = json_response(conn, 200)

      assert food["name"] == "Chicken Breast"
    end
  end

  describe "DELETE /v1/coach/nutrition-foods/:id" do
    test "deletes a food successfully", %{conn: conn, coach: coach, business: business} do
      food = insert(:food, creator: coach, business: business)

      conn = delete(conn, "/v1/coach/nutrition-foods/#{food.id}")
      assert response(conn, 204)

      # Verify the food is actually gone
      conn = build_conn() |> authenticate_coach(coach) |> get("/v1/coach/nutrition-foods/#{food.id}")
      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent food", %{conn: conn} do
      conn = delete(conn, "/v1/coach/nutrition-foods/#{Ecto.UUID.generate()}")
      assert json_response(conn, 404)
    end

    test "cannot delete food from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_food = insert(:food, creator: other_coach, business: other_coach.business)

      conn = delete(conn, "/v1/coach/nutrition-foods/#{other_food.id}")
      assert json_response(conn, 404)
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> delete("/v1/coach/nutrition-foods/#{Ecto.UUID.generate()}")
      assert json_response(conn, 403)
    end
  end

  describe "strict validation" do
    test "rejects an unknown/alternate key", %{conn: conn} do
      attrs = build(:food_attrs) |> Map.put("protein", 10)

      conn = post(conn, "/v1/coach/nutrition-foods", attrs)
      assert json_response(conn, 422)
    end
  end

  describe "read-only sources" do
    test "patching a system food is rejected with 422", %{conn: conn} do
      system_food = insert(:food, business: nil, creator: nil, source: :system)

      conn = patch(conn, "/v1/coach/nutrition-foods/#{system_food.id}", %{"name" => "Renamed"})
      assert json_response(conn, 422)
    end

    test "deleting a system food is rejected with 422", %{conn: conn} do
      system_food = insert(:food, business: nil, creator: nil, source: :system)

      conn = delete(conn, "/v1/coach/nutrition-foods/#{system_food.id}")
      assert json_response(conn, 422)
    end
  end

  describe "POST /v1/coach/nutrition-foods/:id/copy" do
    test "copy of a system food creates an editable business copy", %{conn: conn} do
      system_food =
        insert(:food, business: nil, creator: nil, source: :system, calories_per_100g: 120.0)

      conn = post(conn, "/v1/coach/nutrition-foods/#{system_food.id}/copy")
      assert %{"data" => data} = json_response(conn, 201)

      assert data["source"] == "custom"
      assert data["calories_per_100g"] == 120.0
      refute data["id"] == system_food.id
      assert data["creator_id"]
    end

    test "returns 404 for a non-existent food", %{conn: conn} do
      conn = post(conn, "/v1/coach/nutrition-foods/#{Ecto.UUID.generate()}/copy")
      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/nutrition-foods/:id/impact" do
    test "returns templates and active client plan buckets", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      food = insert(:food, creator: coach, business: business)
      client = insert(:client, creator: coach, business: business)

      template_plan = insert(:plan, creator: coach, business: business, client: nil, status: :active)
      client_plan = insert(:plan, creator: coach, business: business, client: client, status: :active)

      for plan <- [template_plan, client_plan] do
        meal = insert(:meal, creator: coach, business: business, plan: plan)
        insert(:meal_item, business: business, meal: meal, food: food, recipe: nil)
      end

      conn = get(conn, "/v1/coach/nutrition-foods/#{food.id}/impact")
      assert %{"data" => data} = json_response(conn, 200)

      assert [%{"id" => template_id}] = data["templates"]
      assert template_id == template_plan.id

      assert [%{"id" => active_id, "client_id" => active_client_id}] = data["active_client_plans"]
      assert active_id == client_plan.id
      assert active_client_id == client.id
    end

    test "returns empty buckets for an unused food", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      food = insert(:food, creator: coach, business: business)

      conn = get(conn, "/v1/coach/nutrition-foods/#{food.id}/impact")
      assert %{"data" => %{"templates" => [], "active_client_plans" => []}} = json_response(conn, 200)
    end
  end
end
