defmodule EasyWeb.Coaches.RecipeControllerTest do
  use Easy.ConnCase

  alias Easy.DataCase
  alias Easy.Nutrition.Programming
  import Easy.Nutrition.ProgrammingMenuFixtures

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
      assert data["revision"] == 1
      assert data["nutrients"]["complete"] == false
      refute Map.has_key?(data, "nutrition")
      refute Map.has_key?(data, "foods")
      refute Map.has_key?(data, "serving_sizes")

      assert %{"kind" => "serving", "amount" => 1.0, "unit" => "serving", "label" => nil} =
               data["default_portion"]

      assert [
               %{"kind" => "serving", "amount" => 1.0, "unit" => "serving", "label" => nil},
               %{"kind" => "gram", "grams" => 100.0}
             ] = data["portion_options"]

      assert data["id"]
      assert data["creator_id"]
      assert data["inserted_at"]
    end

    test "creates a recipe with ingredients and rounded nutrients", %{conn: conn, coach: coach, business: business} do
      food =
        insert(:food,
          creator: coach,
          business: business,
          calories_per_100g: 10.16,
          protein_g_per_100g: 1.0,
          carbs_g_per_100g: 2.0,
          fat_g_per_100g: 3.0,
          fiber_g_per_100g: 4.0
        )

      attrs =
        build(:recipe_attrs)
        |> Map.put("recipe_ingredients", [
          %{"food_id" => food.id, "portion" => %{"kind" => "gram", "grams" => 100.0}}
        ])

      conn = post(conn, "/v1/coach/nutrition-recipes", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert [ingredient] = data["recipe_ingredients"]
      assert ingredient["food_id"] == food.id

      assert %{"kind" => "gram", "grams" => 100.0} =
               ingredient["portion"]

      assert ingredient["position"] == 0
      assert data["nutrients"]["calories"] == 10.2
      assert data["nutrients"]["complete"] == true
    end

    test "unknown ingredient nutrients stay null and mark totals incomplete", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      food =
        insert(:food,
          creator: coach,
          business: business,
          calories_per_100g: 100.0,
          protein_g_per_100g: nil,
          carbs_g_per_100g: 10.0,
          fat_g_per_100g: 5.0,
          fiber_g_per_100g: 2.0
        )

      attrs =
        build(:recipe_attrs)
        |> Map.put("recipe_ingredients", [%{"food_id" => food.id, "portion" => %{"kind" => "gram", "grams" => 50.0}}])

      conn = post(conn, "/v1/coach/nutrition-recipes", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["nutrients"]["calories"] == 50.0
      assert data["nutrients"]["protein"] == nil
      assert data["nutrients"]["complete"] == false
    end

    test "rejects a subrecipe ingredient at the contract boundary", %{conn: conn} do
      attrs =
        build(:recipe_attrs)
        |> Map.put("recipe_ingredients", [
          %{"recipe_id" => Ecto.UUID.generate(), "portion" => %{"kind" => "gram", "grams" => 100.0}}
        ])

      conn = post(conn, "/v1/coach/nutrition-recipes", attrs)
      assert json_response(conn, 422)
    end

    test "returns validation error when name is missing", %{conn: conn} do
      attrs = build(:recipe_attrs) |> Map.delete("name")

      conn = post(conn, "/v1/coach/nutrition-recipes", attrs)
      assert json_response(conn, 422)
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> post("/v1/coach/nutrition-recipes", %{"name" => "Test", "servings_count" => 1})
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
      assert data["revision"] == 1
    end

    test "returns recipe with preloaded ingredients", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      media = insert(:library_media, business: business, uploaded_by_id: coach.id)
      food = insert(:food, creator: coach, business: business, media: media)
      recipe = insert(:recipe, creator: coach, business: business)

      insert(:recipe_ingredient,
        business: business,
        recipe: recipe,
        food: food,
        portion: %{kind: :gram, grams: 100.0}
      )

      conn = get(conn, "/v1/coach/nutrition-recipes/#{recipe.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert [ingredient] = data["recipe_ingredients"]
      assert ingredient["food_id"] == food.id
      assert ingredient["food"]["id"] == food.id
      assert ingredient["food"]["media"]["id"] == media.id
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
        portion: %{kind: :gram, grams: 200.0}
      )

      conn =
        patch(conn, "/v1/coach/nutrition-recipes/#{recipe.id}", %{
          "expected_revision" => 1,
          "name" => "Updated Recipe",
          "servings_count" => recipe.servings_count,
          "recipe_ingredients" => [%{"food_id" => food.id, "portion" => %{"kind" => "gram", "grams" => 200.0}}]
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["name"] == "Updated Recipe"
      assert data["id"] == recipe.id
      assert data["revision"] == 2
      assert data["nutrients"]["calories"] == 200.0
    end

    test "returns conflict when the expected revision is stale", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      recipe = insert(:recipe, creator: coach, business: business)

      patch(conn, "/v1/coach/nutrition-recipes/#{recipe.id}", %{
        "expected_revision" => 1,
        "name" => "First",
        "servings_count" => recipe.servings_count
      })

      conn =
        patch(conn, "/v1/coach/nutrition-recipes/#{recipe.id}", %{
          "expected_revision" => 1,
          "name" => "Second",
          "servings_count" => recipe.servings_count
        })

      assert %{
               "error_code" => "stale_revision",
               "error_detail" => %{"current_revision" => 2}
             } = json_response(conn, 409)
    end

    test "returns 409 when removing cooked weight would invalidate a Menu gram Portion", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      recipe = insert(:recipe, creator: coach, business: business, cooked_weight_g: 400.0, servings_count: 2)
      plan = insert(:plan, business: business, creator: coach.user, kind: :template)
      item = recipe_item("item", recipe.id, %{kind: :gram, grams: 100})
      assert {:ok, _} = Programming.replace_menu(DataCase.trainer_ctx(coach), plan.id, plan.revision, menu(plan, meals: [meal_input("meal", "Meal", [item])]))

      conn =
        patch(conn, "/v1/coach/nutrition-recipes/#{recipe.id}", %{
          "expected_revision" => 1,
          "name" => recipe.name,
          "servings_count" => 2,
          "cooked_weight_g" => nil
        })

      assert %{"error_code" => "in_use"} = json_response(conn, 409)
    end

    test "returns 404 when updating recipe from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_recipe = insert(:recipe, creator: other_coach, business: other_coach.business)

      conn =
        patch(conn, "/v1/coach/nutrition-recipes/#{other_recipe.id}", %{
          "expected_revision" => 1,
          "name" => "Hacked"
        })

      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent recipe", %{conn: conn} do
      conn =
        patch(conn, "/v1/coach/nutrition-recipes/#{Ecto.UUID.generate()}", %{
          "expected_revision" => 1,
          "name" => "Nope"
        })

      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/coach/nutrition-recipes/:id" do
    test "deletes a recipe successfully", %{conn: conn, coach: coach, business: business} do
      recipe = insert(:recipe, creator: coach, business: business)

      conn = delete(conn, "/v1/coach/nutrition-recipes/#{recipe.id}")
      assert response(conn, 204)

      conn = build_conn() |> authenticate_coach(coach) |> get("/v1/coach/nutrition-recipes/#{recipe.id}")
      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent recipe", %{conn: conn} do
      conn = delete(conn, "/v1/coach/nutrition-recipes/#{Ecto.UUID.generate()}")
      assert json_response(conn, 404)
    end

    test "rejects obsolete revision query parameters", %{conn: conn, coach: coach, business: business} do
      recipe = insert(:recipe, creator: coach, business: business)
      conn = delete(conn, "/v1/coach/nutrition-recipes/#{recipe.id}?expected_revision=1")
      assert json_response(conn, 422)
    end

    test "cannot delete recipe from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_recipe = insert(:recipe, creator: other_coach, business: other_coach.business)

      conn = delete(conn, "/v1/coach/nutrition-recipes/#{other_recipe.id}")
      assert json_response(conn, 404)
    end

    test "returns 409 when a Menu still uses the recipe", %{conn: conn, coach: coach, business: business} do
      recipe = insert(:recipe, creator: coach, business: business)
      plan = insert(:plan, business: business, creator: coach.user, kind: :template)
      item = recipe_item("item", recipe.id, %{kind: :serving, amount: 1, unit: "serving", label: nil})
      assert {:ok, _} = Programming.replace_menu(DataCase.trainer_ctx(coach), plan.id, plan.revision, menu(plan, meals: [meal_input("meal", "Meal", [item])]))

      conn = delete(conn, "/v1/coach/nutrition-recipes/#{recipe.id}")
      assert %{"error_code" => "in_use"} = json_response(conn, 409)
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

    test "paginates results with a cursor", %{conn: conn, coach: coach, business: business} do
      for _ <- 1..3, do: insert(:recipe, creator: coach, business: business)

      first_page =
        conn
        |> get("/v1/coach/nutrition-recipes", %{"cursor" => "start", "limit" => "2"})
        |> json_response(200)

      assert %{"data" => [_, _], "count" => 3, "next_cursor" => cursor} = first_page
      assert is_binary(cursor)

      assert %{"data" => [_], "count" => 3, "next_cursor" => nil} =
               conn
               |> get("/v1/coach/nutrition-recipes", %{"cursor" => cursor, "limit" => "2"})
               |> json_response(200)
    end

    test "rejects malformed cursors and keeps cursor pages tenant-scoped", %{conn: conn, coach: coach, business: business} do
      own_recipe = insert(:recipe, creator: coach, business: business)
      other_coach = insert(:coach)
      insert(:recipe, creator: other_coach, business: other_coach.business)
      insert(:recipe, creator: other_coach, business: other_coach.business)

      assert conn
             |> get("/v1/coach/nutrition-recipes", %{"cursor" => "not-a-cursor"})
             |> json_response(422)

      other_cursor =
        build_conn()
        |> authenticate_coach(other_coach)
        |> get("/v1/coach/nutrition-recipes", %{"cursor" => "start", "limit" => "1"})
        |> json_response(200)
        |> Map.fetch!("next_cursor")

      assert %{"data" => recipes, "count" => 1} =
               conn
               |> get("/v1/coach/nutrition-recipes", %{"cursor" => other_cursor})
               |> json_response(200)

      assert Enum.all?(recipes, &(&1["id"] == own_recipe.id))
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

    test "rejects unknown query parameters", %{conn: conn} do
      conn = get(conn, "/v1/coach/nutrition-recipes?unknown=value")
      assert json_response(conn, 422)
    end
  end

  describe "strict validation" do
    test "rejects an unknown/alternate key", %{conn: conn} do
      attrs = build(:recipe_attrs) |> Map.put("calories", 200)

      conn = post(conn, "/v1/coach/nutrition-recipes", attrs)
      assert json_response(conn, 422)
    end

    test "rejects retired raw ingredient portion fields", %{conn: conn} do
      attrs =
        build(:recipe_attrs)
        |> Map.put("recipe_ingredients", [
          %{"food_id" => Ecto.UUID.generate(), "weight_g" => 100.0}
        ])

      assert conn |> post("/v1/coach/nutrition-recipes", attrs) |> json_response(422)
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
        portion: %{kind: :gram, grams: 200.0}
      )

      conn = post(conn, "/v1/coach/nutrition-recipes/#{recipe.id}/copy")
      assert %{"data" => data} = json_response(conn, 201)
      assert data["name"] == "Original Bowl (Copy)"
      assert data["revision"] == 1
      refute data["id"] == recipe.id
      assert [ingredient] = data["recipe_ingredients"]
      assert ingredient["food_id"] == food.id
      assert data["nutrients"]["calories"] == 200.0
    end

    test "returns 404 for a non-existent recipe", %{conn: conn} do
      conn = post(conn, "/v1/coach/nutrition-recipes/#{Ecto.UUID.generate()}/copy")
      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/nutrition-recipes/:id/impact" do
    test "returns plan buckets for structural Menu usage", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      recipe = insert(:recipe, creator: coach, business: business, name: "Dal")
      plan = insert(:plan, business: business, creator: coach.user, kind: :template, name: "Cut")
      item = recipe_item("item", recipe.id, %{kind: :serving, amount: 1, unit: "serving", label: nil})
      assert {:ok, _} = Programming.replace_menu(DataCase.trainer_ctx(coach), plan.id, plan.revision, menu(plan, meals: [meal_input("meal", "Meal", [item])]))

      conn = get(conn, "/v1/coach/nutrition-recipes/#{recipe.id}/impact")
      assert %{"data" => data} = json_response(conn, 200)
      assert [%{"id" => plan_id, "name" => "Cut"}] = data["templates"]
      assert plan_id == plan.id
      assert data["client_plans"] == []
    end

    test "returns empty buckets for an unused recipe", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      recipe = insert(:recipe, creator: coach, business: business)

      conn = get(conn, "/v1/coach/nutrition-recipes/#{recipe.id}/impact")
      assert %{"data" => %{"templates" => [], "client_plans" => []}} = json_response(conn, 200)
    end

    test "returns 404 for another business's recipe", %{conn: conn} do
      other = insert(:coach)
      recipe = insert(:recipe, creator: other, business: other.business)

      conn = get(conn, "/v1/coach/nutrition-recipes/#{recipe.id}/impact")
      assert json_response(conn, 404)
    end
  end
end
