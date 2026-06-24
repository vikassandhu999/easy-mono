defmodule EasyWeb.Coaches.NutritionPlanControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/nutrition-plans" do
    test "creates a plan with valid params", %{conn: conn} do
      attrs = build(:plan_attrs)

      conn = post(conn, "/v1/coach/nutrition-plans", attrs)
      assert %{"data" => data} = json_response(conn, 201)

      assert data["name"] == attrs["name"]
      assert data["description"] == attrs["description"]
      assert data["tags"] == attrs["tags"]
      assert data["target_calories"] == attrs["target_calories"]
      assert data["target_protein_g"] == attrs["target_protein_g"]
      assert data["target_carbs_g"] == attrs["target_carbs_g"]
      assert data["target_fat_g"] == attrs["target_fat_g"]
      assert data["target_fiber_g"] == attrs["target_fiber_g"]
      assert data["status"] == attrs["status"]
      assert data["id"]
      assert data["creator_id"]
      refute Map.has_key?(data, "business_id")
    end

    test "returns validation error when name is missing", %{conn: conn} do
      attrs = build(:plan_attrs) |> Map.delete("name")

      conn = post(conn, "/v1/coach/nutrition-plans", attrs)
      assert json_response(conn, 422)
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> post("/v1/coach/nutrition-plans", %{"name" => "Plan"})
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/coach/nutrition-plans" do
    test "lists only templates for this business", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      insert(:plan, creator: coach, business: business)

      # Personal plan — should NOT appear
      client = insert(:client, creator: coach, business: business)
      insert(:plan, creator: coach, business: business, client_id: client.id)

      # Other business template — should NOT appear
      other = insert(:coach)
      insert(:plan, creator: other, business: other.business)

      conn = get(conn, "/v1/coach/nutrition-plans")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
      assert hd(data)["client_id"] == nil
    end
  end

  describe "GET /v1/coach/nutrition-plans/:id" do
    test "returns template with client as nil", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)

      conn = get(conn, "/v1/coach/nutrition-plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == plan.id
      assert data["name"] == plan.name
      assert data["client"] == nil
    end

    test "returns personal plan with client preloaded", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, creator: coach, business: business)

      plan =
        insert(:plan,
          creator: coach,
          business: business,
          client_id: client.id
        )

      conn = get(conn, "/v1/coach/nutrition-plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == plan.id
      assert data["client"]["id"] == client.id
      assert data["client"]["first_name"] == client.first_name
      assert data["client"]["last_name"] == client.last_name
    end

    test "returns 404 for non-existent plan", %{conn: conn} do
      conn = get(conn, "/v1/coach/nutrition-plans/#{Ecto.UUID.generate()}")
      assert json_response(conn, 404)
    end

    test "cannot access plan from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_plan = insert(:plan, creator: other_coach, business: other_coach.business)

      conn = get(conn, "/v1/coach/nutrition-plans/#{other_plan.id}")
      assert json_response(conn, 404)
    end

    test "meal items include per-item nutrition snapshot for food item", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, creator: coach, plan: plan, business: business)

      food =
        insert(:food,
          creator: coach,
          business: business,
          calories_per_100g: 200.0,
          protein_g_per_100g: 20.0,
          carbs_g_per_100g: 30.0,
          fat_g_per_100g: 5.0,
          fiber_g_per_100g: 2.0
        )

      insert(:meal_item, meal: meal, business: business, food: food, weight_g: 150.0)

      conn = get(conn, "/v1/coach/nutrition-plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)

      [meal_data] = data["meals"]
      [item] = meal_data["meal_items"]
      nutrition = item["nutrition"]

      # weight_g=150 × per_100g macros / 100 → rounded to 1 decimal
      assert nutrition["calories"] == 300.0
      assert nutrition["protein_g"] == 30.0
      assert nutrition["carbs_g"] == 45.0
      assert nutrition["fat_g"] == 7.5
      assert nutrition["fiber_g"] == 3.0
    end

    test "meal items include per-item nutrition snapshot for recipe item", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, creator: coach, plan: plan, business: business)

      food =
        insert(:food,
          creator: coach,
          business: business,
          calories_per_100g: 100.0,
          protein_g_per_100g: 10.0,
          carbs_g_per_100g: 10.0,
          fat_g_per_100g: 5.0,
          fiber_g_per_100g: 1.0
        )

      # recipe: one ingredient 200g of the food above, cooked_weight_g: 400g
      # recipe totals: cal=200, prot=20, carbs=20, fat=10, fiber=2
      # item weight_g=200 → factor=200/400=0.5
      # item nutrition: cal=100, prot=10, carbs=10, fat=5, fiber=1
      recipe =
        insert(:recipe,
          creator: coach,
          business: business,
          cooked_weight_g: 400.0,
          recipe_ingredients: [
            build(:recipe_ingredient, food: food, weight_g: 200.0)
          ]
        )

      insert(:meal_item, meal: meal, business: business, food: nil, recipe: recipe, weight_g: 200.0)

      conn = get(conn, "/v1/coach/nutrition-plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)

      [meal_data] = data["meals"]
      [item] = meal_data["meal_items"]
      nutrition = item["nutrition"]

      assert nutrition["calories"] == 100.0
      assert nutrition["protein_g"] == 10.0
    end

    test "meal item nutrition is zero-valued map when food has no macros set", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, creator: coach, plan: plan, business: business)

      food =
        insert(:food,
          creator: coach,
          business: business,
          calories_per_100g: 0.0,
          protein_g_per_100g: 0.0,
          carbs_g_per_100g: 0.0,
          fat_g_per_100g: 0.0,
          fiber_g_per_100g: 0.0
        )

      insert(:meal_item, meal: meal, business: business, food: food, weight_g: 100.0)

      conn = get(conn, "/v1/coach/nutrition-plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)

      [meal_data] = data["meals"]
      [item] = meal_data["meal_items"]

      # nutrition map present, all zeros — no crash
      assert is_map(item["nutrition"])
      assert item["nutrition"]["calories"] == 0.0
    end
  end

  describe "PATCH /v1/coach/nutrition-plans/:id" do
    test "updates a plan with valid params", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)

      conn = patch(conn, "/v1/coach/nutrition-plans/#{plan.id}", %{"name" => "Updated Plan"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["name"] == "Updated Plan"
      assert data["id"] == plan.id
    end

    test "returns 404 when updating plan from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_plan = insert(:plan, creator: other_coach, business: other_coach.business)

      conn = patch(conn, "/v1/coach/nutrition-plans/#{other_plan.id}", %{"name" => "Updated"})
      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/coach/nutrition-plans/:id" do
    test "deletes a plan", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)

      conn = delete(conn, "/v1/coach/nutrition-plans/#{plan.id}")
      assert response(conn, 204)
    end

    test "returns 404 when deleting plan from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_plan = insert(:plan, creator: other_coach, business: other_coach.business)

      conn = delete(conn, "/v1/coach/nutrition-plans/#{other_plan.id}")
      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/coach/nutrition-plans/:id/assign" do
    test "assigns a plan to a client", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)
      client = insert(:client, creator: coach, business: business)

      conn =
        post(conn, "/v1/coach/nutrition-plans/#{plan.id}/assign", %{"client_id" => client.id})

      assert %{"data" => data} = json_response(conn, 201)

      assert data["client_id"] == client.id
      assert data["source_template_id"] == plan.id
    end

    test "returns 404 when assigning plan from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_plan = insert(:plan, creator: other_coach, business: other_coach.business)
      client = insert(:client, creator: other_coach, business: other_coach.business)

      conn =
        post(conn, "/v1/coach/nutrition-plans/#{other_plan.id}/assign", %{
          "client_id" => client.id
        })

      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/coach/nutrition-plans/:id/duplicate" do
    test "duplicates a plan", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)

      conn = post(conn, "/v1/coach/nutrition-plans/#{plan.id}/duplicate")
      assert %{"data" => data} = json_response(conn, 201)

      assert data["name"] == "#{plan.name} (Copy)"
      assert data["source_template_id"] == plan.id
    end

    test "returns 404 when client is from another business", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:plan, creator: coach, business: business)
      other_coach = insert(:coach)
      other_client = insert(:client, creator: other_coach, business: other_coach.business)

      conn =
        post(conn, "/v1/coach/nutrition-plans/#{plan.id}/assign", %{
          "client_id" => other_client.id
        })

      assert json_response(conn, 404)
    end
  end
end
