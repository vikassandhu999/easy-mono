defmodule EasyWeb.Coaches.NutritionPlanControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/nutrition_plans" do
    test "creates a plan with valid params", %{conn: conn} do
      attrs = build(:plan_attrs)

      conn = post(conn, "/v1/coach/nutrition_plans", attrs)
      assert %{"data" => data} = json_response(conn, 201)

      assert data["name"] == attrs["name"]
      assert data["description"] == attrs["description"]
      assert data["tags"] == attrs["tags"]
      assert data["macros_goal"] == attrs["macros_goal"]
      assert data["type"] == attrs["type"]
      assert data["status"] == attrs["status"]
      assert data["id"]
      assert data["creator_id"]
      assert data["business_id"]
    end

    test "returns validation error when name is missing", %{conn: conn} do
      attrs = build(:plan_attrs) |> Map.delete("name")

      conn = post(conn, "/v1/coach/nutrition_plans", attrs)
      assert json_response(conn, 422)
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> post("/v1/coach/nutrition_plans", %{"name" => "Plan"})
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/coach/nutrition_plans" do
    test "lists plans and filters by client_id", %{conn: conn, coach: coach, business: business} do
      client1 = insert(:client, creator: coach, business: business)
      client2 = insert(:client, creator: coach, business: business)

      insert(:plan, creator: coach, business: business, client_id: client1.id, type: :personal)
      insert(:plan, creator: coach, business: business, client_id: client2.id, type: :personal)
      insert(:plan, creator: coach, business: business, type: :template)

      conn_all = get(conn, "/v1/coach/nutrition_plans")
      assert %{"data" => _data_all, "count" => 3} = json_response(conn_all, 200)

      conn_filtered = get(conn, "/v1/coach/nutrition_plans", %{"client_id" => client1.id})
      assert %{"data" => data_filtered, "count" => 1} = json_response(conn_filtered, 200)
      assert hd(data_filtered)["client_id"] == client1.id
    end
  end

  describe "GET /v1/coach/nutrition_plans/:id" do
    test "returns a plan by id", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)

      conn = get(conn, "/v1/coach/nutrition_plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == plan.id
      assert data["name"] == plan.name
    end

    test "returns 404 for non-existent plan", %{conn: conn} do
      conn = get(conn, "/v1/coach/nutrition_plans/#{Ecto.UUID.generate()}")
      assert json_response(conn, 404)
    end

    test "cannot access plan from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_plan = insert(:plan, creator: other_coach, business: other_coach.business)

      conn = get(conn, "/v1/coach/nutrition_plans/#{other_plan.id}")
      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/nutrition_plans/:id" do
    test "updates a plan with valid params", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)

      conn = patch(conn, "/v1/coach/nutrition_plans/#{plan.id}", %{"name" => "Updated Plan"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["name"] == "Updated Plan"
      assert data["id"] == plan.id
    end

    test "returns 404 when updating plan from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_plan = insert(:plan, creator: other_coach, business: other_coach.business)

      conn = patch(conn, "/v1/coach/nutrition_plans/#{other_plan.id}", %{"name" => "Updated"})
      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/coach/nutrition_plans/:id" do
    test "deletes a plan", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)

      conn = delete(conn, "/v1/coach/nutrition_plans/#{plan.id}")
      assert response(conn, 204)
    end

    test "returns 404 when deleting plan from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_plan = insert(:plan, creator: other_coach, business: other_coach.business)

      conn = delete(conn, "/v1/coach/nutrition_plans/#{other_plan.id}")
      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/coach/nutrition_plans/:id/assign" do
    test "assigns a plan to a client", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)
      client = insert(:client, creator: coach, business: business)

      conn =
        post(conn, "/v1/coach/nutrition_plans/#{plan.id}/assign", %{"client_id" => client.id})

      assert %{"data" => data} = json_response(conn, 201)

      assert data["client_id"] == client.id
      assert data["type"] == "personal"
      assert data["source_template_id"] == plan.id
    end

    test "returns 404 when assigning plan from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_plan = insert(:plan, creator: other_coach, business: other_coach.business)
      client = insert(:client, creator: other_coach, business: other_coach.business)

      conn =
        post(conn, "/v1/coach/nutrition_plans/#{other_plan.id}/assign", %{
          "client_id" => client.id
        })

      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/coach/nutrition_plans/:id/duplicate" do
    test "duplicates a plan", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)

      conn = post(conn, "/v1/coach/nutrition_plans/#{plan.id}/duplicate")
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
        post(conn, "/v1/coach/nutrition_plans/#{plan.id}/assign", %{
          "client_id" => other_client.id
        })

      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/nutrition_plans/:id/shopping-list" do
    test "returns aggregated shopping list", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, plan: plan, creator: coach, business: business)
      food = insert(:food, creator: coach, business: business)

      insert(:meal_item,
        meal: meal,
        food: food,
        business: business,
        amount: 1.0,
        weight_g: 100.0,
        unit: "cup",
        position: 0
      )

      insert(:meal_item,
        meal: meal,
        food: food,
        business: business,
        amount: 2.0,
        weight_g: 50.0,
        unit: "cup",
        position: 1
      )

      conn = get(conn, "/v1/coach/nutrition_plans/#{plan.id}/shopping-list")
      assert %{"data" => [item]} = json_response(conn, 200)

      assert item["food_id"] == food.id
      assert item["amount"] == 3.0
      assert item["weight_g"] == 150.0
      assert item["unit"] == "cup"
      assert item["type"] == "food"
      assert item["name"] == food.name
    end
  end

  describe "GET /v1/coach/nutrition_plans/:id/macros" do
    test "returns summed macros", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)

      insert(:meal,
        plan: plan,
        creator: coach,
        business: business,
        macros: %{"calories" => 100, "protein" => 10}
      )

      insert(:meal,
        plan: plan,
        creator: coach,
        business: business,
        macros: %{"calories" => 200, "protein" => 5}
      )

      conn = get(conn, "/v1/coach/nutrition_plans/#{plan.id}/macros")
      assert %{"data" => macros} = json_response(conn, 200)

      assert macros["calories"] == 300
      assert macros["protein"] == 15
    end
  end

  describe "POST /v1/coach/nutrition_plans/:id/copy-day" do
    test "copies plan items from one day to another", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, plan: plan, creator: coach, business: business)

      insert(:plan_item,
        plan: plan,
        meal: meal,
        creator: coach,
        business: business,
        day: "monday",
        meal_type: "breakfast"
      )

      conn =
        post(conn, "/v1/coach/nutrition_plans/#{plan.id}/copy-day", %{
          "source_day" => "monday",
          "target_day" => "tuesday"
        })

      assert %{"data" => [item]} = json_response(conn, 200)
      assert item["day"] == "tuesday"
      assert item["meal_type"] == "breakfast"
      assert item["meal_id"] == meal.id
    end
  end
end
