defmodule EasyWeb.Coaches.RecipeControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/nutrition-recipes" do
    test "creates a recipe with valid params", %{conn: conn} do
      attrs = build(:recipe_attrs)

      conn = post(conn, "/v1/coach/nutrition-recipes", attrs)
      assert %{"data" => data} = json_response(conn, 201)

      assert data["name"] == attrs["name"]
      assert data["description"] == attrs["description"]
      assert data["instructions"] == attrs["instructions"]
      assert data["servings_count"] == attrs["servings_count"]
      assert data["cooked_weight_g"] == attrs["cooked_weight_g"]
      assert data["nutrition"]

      assert [%{"label" => "1 serving", "unit" => "serving", "weight_g" => 200.0, "amount" => 1.0, "is_default" => true}] =
               data["serving_sizes"]

      assert data["id"]
      assert data["creator_id"]
      assert data["inserted_at"]
    end

    test "creates a recipe with ingredients", %{conn: conn, coach: coach, business: business} do
      food = insert(:food, creator: coach, business: business, calories_per_100g: 100.0)

      attrs =
        build(:recipe_attrs)
        |> Map.put("recipe_ingredients", [
          %{"food_id" => food.id, "amount" => 2.0, "unit" => "cup", "weight_g" => 480.0}
        ])

      conn = post(conn, "/v1/coach/nutrition-recipes", attrs)
      assert %{"data" => data} = json_response(conn, 201)

      assert [ingredient] = data["recipe_ingredients"]
      assert ingredient["food_id"] == food.id
      assert ingredient["amount"] == 2.0
      assert ingredient["unit"] == "cup"
      assert ingredient["weight_g"] == 480.0

      # Derived nutrition must be correct on create, not silently zero.
      # 100.0 cal/100g x 480g / 100 = 480.0
      assert data["nutrition"]["calories"] == 480.0
    end

    test "returns validation error when name is missing", %{conn: conn} do
      attrs = build(:recipe_attrs) |> Map.delete("name")

      conn = post(conn, "/v1/coach/nutrition-recipes", attrs)
      assert json_response(conn, 422)
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> post("/v1/coach/nutrition-recipes", %{"name" => "Test"})
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/coach/nutrition-recipes/:id" do
    test "returns a recipe by id", %{conn: conn, coach: coach, business: business} do
      recipe = insert(:recipe, creator: coach, business: business)

      conn = get(conn, "/v1/coach/nutrition-recipes/#{recipe.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == recipe.id
      assert data["name"] == recipe.name
    end

    test "returns recipe with preloaded ingredients", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      food = insert(:food, creator: coach, business: business)
      recipe = insert(:recipe, creator: coach, business: business)
      insert(:recipe_ingredient, business: business, recipe: recipe, food: food)

      conn = get(conn, "/v1/coach/nutrition-recipes/#{recipe.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert [ingredient] = data["recipe_ingredients"]
      assert ingredient["food_id"] == food.id
      assert ingredient["food"]["id"] == food.id
    end

    test "returns 404 for non-existent recipe", %{conn: conn} do
      conn = get(conn, "/v1/coach/nutrition-recipes/#{Ecto.UUID.generate()}")
      assert json_response(conn, 404)
    end

    test "cannot access recipe from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_recipe = insert(:recipe, creator: other_coach, business: other_coach.business)

      conn = get(conn, "/v1/coach/nutrition-recipes/#{other_recipe.id}")
      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/nutrition-recipes/:id" do
    test "updates a recipe with valid params", %{conn: conn, coach: coach, business: business} do
      food = insert(:food, creator: coach, business: business, calories_per_100g: 100.0)
      recipe = insert(:recipe, creator: coach, business: business)

      insert(:recipe_ingredient,
        business: business,
        recipe: recipe,
        food: food,
        weight_g: 200.0
      )

      conn = patch(conn, "/v1/coach/nutrition-recipes/#{recipe.id}", %{"name" => "Updated Recipe"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["name"] == "Updated Recipe"
      assert data["id"] == recipe.id

      # Derived nutrition must be correct on update, not silently zero.
      # 100.0 cal/100g x 200g / 100 = 200.0
      assert data["nutrition"]["calories"] == 200.0
    end

    test "returns 404 when updating recipe from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_recipe = insert(:recipe, creator: other_coach, business: other_coach.business)

      conn = patch(conn, "/v1/coach/nutrition-recipes/#{other_recipe.id}", %{"name" => "Hacked"})
      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent recipe", %{conn: conn} do
      conn = patch(conn, "/v1/coach/nutrition-recipes/#{Ecto.UUID.generate()}", %{"name" => "Nope"})
      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/coach/nutrition-recipes/:id" do
    test "deletes a recipe successfully", %{conn: conn, coach: coach, business: business} do
      recipe = insert(:recipe, creator: coach, business: business)

      conn = delete(conn, "/v1/coach/nutrition-recipes/#{recipe.id}")
      assert response(conn, 204)

      # Verify the recipe is actually gone
      conn = build_conn() |> authenticate_coach(coach) |> get("/v1/coach/nutrition-recipes/#{recipe.id}")
      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent recipe", %{conn: conn} do
      conn = delete(conn, "/v1/coach/nutrition-recipes/#{Ecto.UUID.generate()}")
      assert json_response(conn, 404)
    end

    test "cannot delete recipe from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_recipe = insert(:recipe, creator: other_coach, business: other_coach.business)

      conn = delete(conn, "/v1/coach/nutrition-recipes/#{other_recipe.id}")
      assert json_response(conn, 404)
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> delete("/v1/coach/nutrition-recipes/#{Ecto.UUID.generate()}")
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/coach/nutrition-recipes" do
    test "returns paginated list of recipes", %{conn: conn, coach: coach, business: business} do
      for _ <- 1..3, do: insert(:recipe, creator: coach, business: business)

      conn = get(conn, "/v1/coach/nutrition-recipes")
      assert %{"data" => recipes, "count" => count} = json_response(conn, 200)

      assert count == 3
      assert length(recipes) == 3
    end

    test "paginates results with offset and limit", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      for _ <- 1..5, do: insert(:recipe, creator: coach, business: business)

      conn = get(conn, "/v1/coach/nutrition-recipes", %{"offset" => "2", "limit" => "2"})
      assert %{"data" => recipes, "count" => 5} = json_response(conn, 200)

      assert length(recipes) == 2
    end

    test "does not return recipes from another business", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      insert(:recipe, creator: coach, business: business)

      other_coach = insert(:coach)
      insert(:recipe, creator: other_coach, business: other_coach.business)

      conn = get(conn, "/v1/coach/nutrition-recipes")
      assert %{"data" => recipes, "count" => 1} = json_response(conn, 200)

      assert length(recipes) == 1
    end

    test "returns empty list when no recipes exist", %{conn: conn} do
      conn = get(conn, "/v1/coach/nutrition-recipes")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end
  end

  describe "strict validation" do
    test "rejects an unknown/alternate key", %{conn: conn} do
      attrs = build(:recipe_attrs) |> Map.put("calories", 200)

      conn = post(conn, "/v1/coach/nutrition-recipes", attrs)
      assert json_response(conn, 422)
    end
  end

  describe "POST /v1/coach/nutrition-recipes/:id/copy" do
    test "copies a recipe with its ingredients into the business", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      food = insert(:food, creator: coach, business: business, calories_per_100g: 100.0)
      recipe = insert(:recipe, creator: coach, business: business, name: "Original Bowl")

      insert(:recipe_ingredient,
        business: business,
        recipe: recipe,
        food: food,
        weight_g: 200.0
      )

      conn = post(conn, "/v1/coach/nutrition-recipes/#{recipe.id}/copy")
      assert %{"data" => data} = json_response(conn, 201)

      assert data["name"] == "Original Bowl"
      refute data["id"] == recipe.id
      assert [ingredient] = data["recipe_ingredients"]
      assert ingredient["food_id"] == food.id

      # Derived nutrition is recomputed on the copy: 100 cal/100g x 200g / 100 = 200.0
      assert data["nutrition"]["calories"] == 200.0
    end

    test "returns 404 for a non-existent recipe", %{conn: conn} do
      conn = post(conn, "/v1/coach/nutrition-recipes/#{Ecto.UUID.generate()}/copy")
      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/nutrition-recipes/:id/impact" do
    test "returns templates and active client plan buckets", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      recipe = insert(:recipe, creator: coach, business: business)
      client = insert(:client, creator: coach, business: business)

      template_plan = insert(:plan, creator: coach, business: business, client: nil, status: :active)
      client_plan = insert(:plan, creator: coach, business: business, client: client, status: :active)

      for plan <- [template_plan, client_plan] do
        meal = insert(:meal, creator: coach, business: business, plan: plan)
        insert(:meal_item, business: business, meal: meal, recipe: recipe, food: nil)
      end

      conn = get(conn, "/v1/coach/nutrition-recipes/#{recipe.id}/impact")
      assert %{"data" => data} = json_response(conn, 200)

      assert [%{"id" => template_id}] = data["templates"]
      assert template_id == template_plan.id

      assert [%{"id" => active_id, "client_id" => active_client_id}] = data["active_client_plans"]
      assert active_id == client_plan.id
      assert active_client_id == client.id
    end

    test "returns empty buckets for an unused recipe", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      recipe = insert(:recipe, creator: coach, business: business)

      conn = get(conn, "/v1/coach/nutrition-recipes/#{recipe.id}/impact")
      assert %{"data" => %{"templates" => [], "active_client_plans" => []}} = json_response(conn, 200)
    end
  end
end
