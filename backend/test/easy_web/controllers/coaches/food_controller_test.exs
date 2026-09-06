defmodule EasyWeb.Coaches.FoodControllerTest do
  use Easy.ConnCase

  alias EasyWeb.Types.Nutrition.Food, as: FoodType

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
      assert data["sugar_g_per_100g"] == attrs["sugar_g_per_100g"]
      assert data["source"] == "custom"
      assert data["revision"] == 1
      assert data["nutrients"]["complete"] == true
      assert data["nutrients"]["calories"] == 150.0
      assert data["nutrients"]["carbohydrates"] == 20.0

      assert [%{"label" => "1 cup", "unit" => "cup", "weight_g" => 100.0, "amount" => 1.0, "is_default" => true}] =
               data["serving_sizes"]

      assert %{
               "kind" => "serving",
               "amount" => 1.0,
               "unit" => "cup",
               "label" => "1 cup"
             } = data["default_portion"]

      assert [
               %{"kind" => "gram", "grams" => 100.0},
               %{"kind" => "serving", "amount" => 1.0, "unit" => "cup", "label" => "1 cup"}
             ] = data["portion_options"]

      refute Map.has_key?(hd(data["serving_sizes"]), "id")
      assert data["id"]
      assert data["creator_id"]
      assert data["inserted_at"]
    end

    test "rounds canonical nutrients to one decimal in the response", %{conn: conn} do
      attrs = build(:food_attrs) |> Map.put("calories_per_100g", 10.16)

      conn = post(conn, "/v1/coach/nutrition-foods", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["calories_per_100g"] == 10.2
      assert data["nutrients"]["calories"] == 10.2
    end

    test "unknown canonical nutrients stay null and mark totals incomplete", %{conn: conn} do
      attrs =
        build(:food_attrs)
        |> Map.merge(%{
          "protein_g_per_100g" => nil,
          "carbs_g_per_100g" => nil,
          "fat_g_per_100g" => nil,
          "fiber_g_per_100g" => nil
        })

      conn = post(conn, "/v1/coach/nutrition-foods", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["protein_g_per_100g"] == nil
      assert data["nutrients"]["protein"] == nil
      assert data["nutrients"]["complete"] == false
    end

    test "returns validation error when name is missing", %{conn: conn} do
      attrs = build(:food_attrs) |> Map.delete("name")

      conn = post(conn, "/v1/coach/nutrition-foods", attrs)
      assert json_response(conn, 422)
    end

    test "rejects a client-supplied source", %{conn: conn} do
      attrs = build(:food_attrs) |> Map.put("source", "system")

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
      assert data["revision"] == 1
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

      conn =
        patch(conn, "/v1/coach/nutrition-foods/#{food.id}", %{
          "expected_revision" => 1,
          "name" => "Updated Name"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["name"] == "Updated Name"
      assert data["id"] == food.id
      assert data["revision"] == 2
    end

    test "returns conflict when the expected revision is stale", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      food = insert(:food, creator: coach, business: business)

      patch(conn, "/v1/coach/nutrition-foods/#{food.id}", %{
        "expected_revision" => 1,
        "name" => "First"
      })

      conn =
        patch(conn, "/v1/coach/nutrition-foods/#{food.id}", %{
          "expected_revision" => 1,
          "name" => "Second"
        })

      assert %{
               "error_code" => "stale_revision",
               "error_detail" => %{"current_revision" => 2}
             } = json_response(conn, 409)
    end

    test "another coach in the business can update the food", %{conn: conn, business: business} do
      creator = insert(:coach, business: business)
      food = insert(:food, creator: creator, business: business)

      conn =
        patch(conn, "/v1/coach/nutrition-foods/#{food.id}", %{
          "expected_revision" => 1,
          "name" => "Team edit"
        })

      assert %{"data" => %{"name" => "Team edit", "revision" => 2}} = json_response(conn, 200)
    end

    test "returns 404 when updating food from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_food = insert(:food, creator: other_coach, business: other_coach.business)

      conn =
        patch(conn, "/v1/coach/nutrition-foods/#{other_food.id}", %{
          "expected_revision" => 1,
          "name" => "Hacked"
        })

      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent food", %{conn: conn} do
      conn =
        patch(conn, "/v1/coach/nutrition-foods/#{Ecto.UUID.generate()}", %{
          "expected_revision" => 1,
          "name" => "Nope"
        })

      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/nutrition-foods" do
    test "rejects unknown query parameters", %{conn: conn} do
      conn = get(conn, "/v1/coach/nutrition-foods", %{"unknown" => "value"})

      assert json_response(conn, 422)
    end

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

      conn = delete(conn, "/v1/coach/nutrition-foods/#{food.id}?expected_revision=1")
      assert response(conn, 204)

      # Verify the food is actually gone
      conn = build_conn() |> authenticate_coach(coach) |> get("/v1/coach/nutrition-foods/#{food.id}")
      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent food", %{conn: conn} do
      conn = delete(conn, "/v1/coach/nutrition-foods/#{Ecto.UUID.generate()}?expected_revision=1")
      assert json_response(conn, 404)
    end

    test "cannot delete food from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_food = insert(:food, creator: other_coach, business: other_coach.business)

      conn = delete(conn, "/v1/coach/nutrition-foods/#{other_food.id}?expected_revision=1")
      assert json_response(conn, 404)
    end

    test "another coach in the business can delete the food", %{conn: conn, business: business} do
      creator = insert(:coach, business: business)
      food = insert(:food, creator: creator, business: business)

      conn = delete(conn, "/v1/coach/nutrition-foods/#{food.id}?expected_revision=1")
      assert response(conn, 204)
    end

    test "returns conflict when the expected revision is stale", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      food = insert(:food, creator: coach, business: business)

      patch(conn, "/v1/coach/nutrition-foods/#{food.id}", %{
        "expected_revision" => 1,
        "name" => "Kept"
      })

      conn = delete(conn, "/v1/coach/nutrition-foods/#{food.id}?expected_revision=1")

      assert %{
               "error_code" => "stale_revision",
               "error_detail" => %{"current_revision" => 2}
             } = json_response(conn, 409)
    end

    test "returns 409 when a Recipe Ingredient still uses the food", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      food = insert(:food, creator: coach, business: business)
      recipe = insert(:recipe, creator: coach, business: business)

      insert(:recipe_ingredient,
        business: business,
        recipe: recipe,
        food: food,
        portion_kind: :gram,
        amount: nil,
        unit: nil,
        serving_label: nil,
        weight_g: 100.0
      )

      conn = delete(conn, "/v1/coach/nutrition-foods/#{food.id}?expected_revision=1")
      assert %{"error_code" => "in_use"} = json_response(conn, 409)
    end

    test "returns 409 when a Menu still uses the food", %{conn: conn, coach: coach, business: business} do
      food = insert(:food, creator: coach, business: business)
      plan = insert(:plan, business: business, creator: coach.user, kind: :template)
      meal = insert(:meal, business: business, plan: plan, creator: coach)
      insert(:meal_item, business: business, plan: plan, meal: meal, food: food)

      conn = delete(conn, "/v1/coach/nutrition-foods/#{food.id}?expected_revision=1")
      assert %{"error_code" => "in_use"} = json_response(conn, 409)
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

      conn = patch(conn, "/v1/coach/nutrition-foods/#{system_food.id}", %{"expected_revision" => 1, "name" => "Renamed"})
      assert json_response(conn, 422)
    end

    test "deleting a system food is rejected with 422", %{conn: conn} do
      system_food = insert(:food, business: nil, creator: nil, source: :system)

      conn = delete(conn, "/v1/coach/nutrition-foods/#{system_food.id}?expected_revision=1")
      assert json_response(conn, 422)
    end

    test "patching an imported food is rejected with 422", %{conn: conn, coach: coach, business: business} do
      imported = insert(:food, business: business, creator: coach, source: :imported)

      conn = patch(conn, "/v1/coach/nutrition-foods/#{imported.id}", %{"expected_revision" => 1, "name" => "Renamed"})
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
      assert data["revision"] == 1
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
    test "returns recipes and plan buckets for structural usage", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      food = insert(:food, creator: coach, business: business, name: "Yogurt")
      recipe = insert(:recipe, creator: coach, business: business, name: "Lassi")

      insert(:recipe_ingredient,
        business: business,
        recipe: recipe,
        food: food,
        portion_kind: :gram,
        amount: nil,
        unit: nil,
        serving_label: nil,
        weight_g: 100.0
      )

      plan = insert(:plan, business: business, creator: coach.user, kind: :template, name: "Cut")
      meal = insert(:meal, business: business, plan: plan, creator: coach)
      insert(:meal_item, business: business, plan: plan, meal: meal, food: food)

      conn = get(conn, "/v1/coach/nutrition-foods/#{food.id}/impact")
      assert %{"data" => data} = json_response(conn, 200)
      assert [%{"id" => recipe_id, "name" => "Lassi"}] = data["recipes"]
      assert recipe_id == recipe.id
      assert [%{"id" => plan_id, "name" => "Cut"}] = data["templates"]
      assert plan_id == plan.id
      assert data["active_client_plans"] == []
      refute Map.has_key?(data, "business_id")
    end

    test "returns empty buckets for an unused food", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      food = insert(:food, creator: coach, business: business)

      conn = get(conn, "/v1/coach/nutrition-foods/#{food.id}/impact")
      assert %{"data" => %{"recipes" => [], "templates" => [], "active_client_plans" => []}} = json_response(conn, 200)
    end

    test "returns 404 for another business's food", %{conn: conn} do
      other = insert(:coach)
      food = insert(:food, creator: other, business: other.business)

      conn = get(conn, "/v1/coach/nutrition-foods/#{food.id}/impact")
      assert json_response(conn, 404)
    end
  end

  describe "Food.format/1" do
    test "normalizes nil collection fields", %{coach: coach, business: business} do
      food = insert(:food, creator: coach, business: business) |> Easy.Repo.preload(:media)
      food = %{food | allergens: nil, dietary_tags: nil, serving_sizes: nil}

      assert %{allergens: [], dietary_tags: [], serving_sizes: []} =
               FoodType.format(food)
    end
  end
end
