defmodule EasyWeb.Coaches.FoodControllerTest do
  use Easy.ConnCase

  alias Easy.DataCase
  alias Easy.Nutrition.Programming
  import Easy.Nutrition.ProgrammingMenuFixtures

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
    test "search matches copied punctuation and numeric names within a category", %{conn: conn, coach: coach, business: business} do
      for name <- ["Non-fat yogurt 2.5%", "Test food 00 1789533529417-375", "Farmer's yogurt", "Crème fraîche"] do
        food = insert(:food, name: name, category: "Breakfast", creator: coach, business: business)
        insert(:food, name: name, category: "Dinner", creator: coach, business: business)

        assert %{"data" => [%{"id" => id}], "count" => 1, "next_cursor" => nil} =
                 conn
                 |> get("/v1/coach/nutrition-foods", %{"search" => name, "categories" => ["Breakfast"], "cursor" => "start"})
                 |> json_response(200)

        assert id == food.id
      end

      assert %{"data" => [%{"name" => "Non-fat yogurt 2.5%"}], "count" => 1} =
               conn
               |> get("/v1/coach/nutrition-foods", %{"search" => "non-fa yog 2.5", "categories" => ["Breakfast"], "cursor" => "start"})
               |> json_response(200)

      assert %{"count" => 4} =
               conn
               |> get("/v1/coach/nutrition-foods", %{"search" => "! :* & |", "categories" => ["Breakfast"], "cursor" => "start"})
               |> json_response(200)
    end

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

    test "paginates results with a cursor", %{conn: conn, coach: coach, business: business} do
      for _ <- 1..3, do: insert(:food, creator: coach, business: business)

      first_page =
        conn
        |> get("/v1/coach/nutrition-foods", %{"cursor" => "start", "limit" => "2"})
        |> json_response(200)

      assert %{"data" => [_, _], "count" => 3, "next_cursor" => cursor} = first_page
      assert is_binary(cursor)

      assert %{"data" => [_], "count" => 3, "next_cursor" => nil} =
               conn
               |> get("/v1/coach/nutrition-foods", %{"cursor" => cursor, "limit" => "2"})
               |> json_response(200)
    end

    test "cursor search pagination visits every relevance-ordered food exactly once", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      chicken =
        insert(:food,
          name: "Chicken",
          creator: coach,
          business: business,
          inserted_at: ~U[2026-01-02 00:00:00Z]
        )

      chicken_breast =
        insert(:food,
          name: "Chicken Breast",
          creator: coach,
          business: business,
          inserted_at: ~U[2026-01-01 00:00:00Z]
        )

      chicken_salad =
        insert(:food,
          name: "Chicken Salad",
          creator: coach,
          business: business,
          inserted_at: ~U[2026-01-03 00:00:00Z]
        )

      first_page =
        conn
        |> get("/v1/coach/nutrition-foods", %{"search" => "chicken", "cursor" => "start", "limit" => "2"})
        |> json_response(200)

      assert %{"data" => first_foods, "count" => 3, "next_cursor" => cursor} = first_page
      assert Enum.map(first_foods, & &1["id"]) == [chicken_salad.id, chicken.id]

      assert %{"data" => second_foods, "count" => 3, "next_cursor" => nil} =
               conn
               |> get("/v1/coach/nutrition-foods", %{"search" => "chicken", "cursor" => cursor, "limit" => "2"})
               |> json_response(200)

      ids = Enum.map(first_foods ++ second_foods, & &1["id"])
      assert ids == [chicken_salad.id, chicken.id, chicken_breast.id]
      assert MapSet.new(ids) == MapSet.new([chicken.id, chicken_breast.id, chicken_salad.id])
    end

    test "rejects malformed cursors and keeps cursor pages tenant-scoped", %{conn: conn, coach: coach, business: business} do
      own_food = insert(:food, creator: coach, business: business)
      other_coach = insert(:coach)
      insert(:food, creator: other_coach, business: other_coach.business)
      insert(:food, creator: other_coach, business: other_coach.business)

      assert conn
             |> get("/v1/coach/nutrition-foods", %{"cursor" => "not-a-cursor"})
             |> json_response(422)

      other_cursor =
        build_conn()
        |> authenticate_coach(other_coach)
        |> get("/v1/coach/nutrition-foods", %{"cursor" => "start", "limit" => "1"})
        |> json_response(200)
        |> Map.fetch!("next_cursor")

      assert %{"data" => foods, "count" => 1} =
               conn
               |> get("/v1/coach/nutrition-foods", %{"cursor" => other_cursor})
               |> json_response(200)

      assert Enum.all?(foods, &(&1["id"] == own_food.id))
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

    test "another coach in the business can delete the food", %{conn: conn, business: business} do
      creator = insert(:coach, business: business)
      food = insert(:food, creator: creator, business: business)

      conn = delete(conn, "/v1/coach/nutrition-foods/#{food.id}")
      assert response(conn, 204)
    end

    test "rejects obsolete revision query parameters", %{conn: conn, coach: coach, business: business} do
      food = insert(:food, creator: coach, business: business)
      conn = delete(conn, "/v1/coach/nutrition-foods/#{food.id}?expected_revision=1")
      assert json_response(conn, 422)
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
        portion: %{kind: :gram, grams: 100.0}
      )

      conn = delete(conn, "/v1/coach/nutrition-foods/#{food.id}")
      assert %{"error_code" => "in_use"} = json_response(conn, 409)
    end

    test "returns 409 when a Menu still uses the food", %{conn: conn, coach: coach, business: business} do
      food = insert(:food, creator: coach, business: business)
      plan = insert(:plan, business: business, creator: coach.user, kind: :template)
      item = food_item("item", food.id, %{kind: :gram, grams: 100})
      assert {:ok, _} = Programming.replace_menu(DataCase.trainer_ctx(coach), plan.id, plan.revision, menu(plan, meals: [meal_input("meal", "Meal", [item])]))

      conn = delete(conn, "/v1/coach/nutrition-foods/#{food.id}")
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
    test "hides unassigned client plan references from trainers while owners can see them" do
      owner_user = insert(:user)
      business = insert(:business, owner: owner_user)
      owner = insert(:coach, business: business, user: owner_user)
      trainer = insert(:coach, business: business)
      other_trainer = insert(:coach, business: business)
      food = insert(:food, creator: trainer, business: business)
      visible_client = insert(:client, business: business, creator: trainer, assigned_coach: trainer)
      hidden_client = insert(:client, business: business, creator: other_trainer, assigned_coach: other_trainer)

      visible_plan = insert(:plan, business: business, creator: trainer.user, client: visible_client, name: "Visible plan")
      hidden_plan = insert(:plan, business: business, creator: other_trainer.user, client: hidden_client, name: "Hidden plan")
      item = food_item("impact-visibility-item", food.id, %{kind: :gram, grams: 100})

      assert {:ok, _} =
               Programming.replace_menu(
                 DataCase.trainer_ctx(trainer),
                 visible_plan.id,
                 visible_plan.revision,
                 menu(visible_plan, meals: [meal_input("visible-impact-meal", "Meal", [item])])
               )

      assert {:ok, _} =
               Programming.replace_menu(
                 DataCase.trainer_ctx(other_trainer),
                 hidden_plan.id,
                 hidden_plan.revision,
                 menu(hidden_plan, meals: [meal_input("hidden-impact-meal", "Meal", [item])])
               )

      trainer_response =
        build_conn()
        |> authenticate_coach(trainer)
        |> get("/v1/coach/nutrition-foods/#{food.id}/impact")
        |> json_response(200)

      assert %{"data" => %{"client_plans" => [%{"id" => visible_plan_id, "name" => "Visible plan"}]}} = trainer_response
      assert visible_plan_id == visible_plan.id
      refute inspect(trainer_response) =~ hidden_plan.id

      owner_response =
        build_conn()
        |> authenticate_coach(owner)
        |> get("/v1/coach/nutrition-foods/#{food.id}/impact")
        |> json_response(200)

      assert %{"data" => %{"client_plans" => owner_plans}} = owner_response
      assert MapSet.new(Enum.map(owner_plans, & &1["id"])) == MapSet.new([visible_plan.id, hidden_plan.id])
    end

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
        portion: %{kind: :gram, grams: 100.0}
      )

      plan = insert(:plan, business: business, creator: coach.user, kind: :template, name: "Cut")
      item = food_item("item", food.id, %{kind: :gram, grams: 100})
      assert {:ok, _} = Programming.replace_menu(DataCase.trainer_ctx(coach), plan.id, plan.revision, menu(plan, meals: [meal_input("meal", "Meal", [item])]))

      conn = get(conn, "/v1/coach/nutrition-foods/#{food.id}/impact")
      assert %{"data" => data} = json_response(conn, 200)
      assert [%{"id" => recipe_id, "name" => "Lassi"}] = data["recipes"]
      assert recipe_id == recipe.id
      assert [%{"id" => plan_id, "name" => "Cut"}] = data["templates"]
      assert plan_id == plan.id
      assert data["client_plans"] == []
      refute Map.has_key?(data, "business_id")
    end

    test "returns empty buckets for an unused food", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      food = insert(:food, creator: coach, business: business)

      conn = get(conn, "/v1/coach/nutrition-foods/#{food.id}/impact")
      assert %{"data" => %{"recipes" => [], "templates" => [], "client_plans" => []}} = json_response(conn, 200)
    end

    test "returns 404 for another business's food", %{conn: conn} do
      other = insert(:coach)
      food = insert(:food, creator: other, business: other.business)

      conn = get(conn, "/v1/coach/nutrition-foods/#{food.id}/impact")
      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/nutrition-foods/:id/usage" do
    test "lists a food's recipe references once and returns usage metadata", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      food = insert(:food, creator: coach, business: business, name: "Yogurt")
      recipe = insert(:recipe, creator: coach, business: business, name: "Lassi")

      for {grams, position} <- Enum.with_index([100.0, 200.0]) do
        insert(:recipe_ingredient,
          business: business,
          recipe: recipe,
          food: food,
          portion: %{kind: :gram, grams: grams},
          position: position
        )
      end

      template = insert(:plan, business: business, creator: coach.user, kind: :template, name: "Cut")
      item = food_item("usage-item", food.id, %{kind: :gram, grams: 100})
      assert {:ok, _} = Programming.replace_menu(DataCase.trainer_ctx(coach), template.id, template.revision, menu(template, meals: [meal_input("usage-meal", "Meal", [item])]))

      response =
        conn
        |> get("/v1/coach/nutrition-foods/#{food.id}/usage", %{"kind" => "recipes", "cursor" => "start"})
        |> json_response(200)

      assert %{
               "item" => %{"id" => food_id, "name" => "Yogurt", "read_only" => false},
               "counts" => %{"recipes" => 1, "templates" => 1, "client_plans" => 0},
               "delete_blocked_reason" => "in_use",
               "count" => 1,
               "next_cursor" => nil,
               "data" => [
                 %{"id" => recipe_id, "name" => "Lassi", "client_id" => nil, "kind" => "recipe", "inserted_at" => _}
               ]
             } = response

      assert food_id == food.id
      assert recipe_id == recipe.id
    end

    test "hides unassigned client plans while retaining their delete protection", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      food = insert(:food, creator: coach, business: business)
      visible_client = insert(:client, business: business, creator: coach, assigned_coach: coach)
      other_coach = insert(:coach, business: business)
      hidden_client = insert(:client, business: business, creator: other_coach, assigned_coach: other_coach)

      visible_plan = insert(:plan, business: business, creator: coach.user, client: visible_client, name: "Visible plan")
      hidden_plan = insert(:plan, business: business, creator: other_coach.user, client: hidden_client, name: "Hidden plan")
      item = food_item("client-usage-item", food.id, %{kind: :gram, grams: 100})

      assert {:ok, _} =
               Programming.replace_menu(
                 DataCase.trainer_ctx(coach),
                 visible_plan.id,
                 visible_plan.revision,
                 menu(visible_plan, meals: [meal_input("visible-usage-meal", "Meal", [item])])
               )

      assert {:ok, _} =
               Programming.replace_menu(
                 DataCase.trainer_ctx(other_coach),
                 hidden_plan.id,
                 hidden_plan.revision,
                 menu(hidden_plan, meals: [meal_input("hidden-usage-meal", "Meal", [item])])
               )

      response =
        conn
        |> get("/v1/coach/nutrition-foods/#{food.id}/usage", %{"kind" => "client_plans", "cursor" => "start"})
        |> json_response(200)

      assert %{
               "counts" => %{"client_plans" => 1},
               "delete_blocked_reason" => "in_use",
               "count" => 1,
               "data" => [
                 %{"id" => plan_id, "name" => "Visible plan", "client_id" => client_id, "kind" => "client_plan"}
               ]
             } = response

      assert plan_id == visible_plan.id
      assert client_id == visible_client.id
      refute inspect(response) =~ hidden_plan.id
      refute inspect(response) =~ hidden_client.id
    end

    test "does not expose another business's food", %{conn: conn} do
      other = insert(:coach)
      food = insert(:food, creator: other, business: other.business)

      assert conn
             |> get("/v1/coach/nutrition-foods/#{food.id}/usage", %{"cursor" => "start"})
             |> json_response(404)
    end

    test "validates query values and reports a shared food as read-only", %{coach: coach} do
      food = insert(:food, business: nil, creator: nil, source: :system, name: "Shared oats")

      for params <- [
            %{"cursor" => "not-a-cursor"},
            %{"kind" => "plans"},
            %{"limit" => "-1"},
            %{"unknown" => "value"}
          ] do
        assert build_conn()
               |> authenticate_coach(coach)
               |> get("/v1/coach/nutrition-foods/#{food.id}/usage", params)
               |> json_response(422)
      end

      assert %{"data" => [], "count" => 0, "next_cursor" => nil} =
               build_conn()
               |> authenticate_coach(coach)
               |> get("/v1/coach/nutrition-foods/#{food.id}/usage", %{"cursor" => "start", "limit" => "101"})
               |> json_response(200)

      assert %{
               "item" => %{"id" => food_id, "name" => "Shared oats", "read_only" => true},
               "delete_blocked_reason" => "shared_food"
             } =
               build_conn()
               |> authenticate_coach(coach)
               |> get("/v1/coach/nutrition-foods/#{food.id}/usage", %{"cursor" => "start"})
               |> json_response(200)

      assert food_id == food.id
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
