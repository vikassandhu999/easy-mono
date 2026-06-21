defmodule EasyWeb.Coaches.MealControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/nutrition-plans/:plan_id/meals" do
    test "creates a meal for a plan", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)
      attrs = build(:meal_attrs)

      conn = post(conn, "/v1/coach/nutrition-plans/#{plan.id}/meals", attrs)
      assert %{"data" => data} = json_response(conn, 201)

      assert data["name"] == attrs["name"]
      assert data["nutrition_plan_id"] == plan.id
      assert data["creator_id"] == coach.id
    end

    test "returns 404 when plan is from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_plan = insert(:plan, creator: other_coach, business: other_coach.business)

      conn = post(conn, "/v1/coach/nutrition-plans/#{other_plan.id}/meals", build(:meal_attrs))
      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/nutrition-plans/:plan_id/meals" do
    test "lists meals for a plan", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)
      insert(:meal, plan: plan, creator: coach, business: business)

      conn = get(conn, "/v1/coach/nutrition-plans/#{plan.id}/meals")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)

      assert length(data) == 1
    end
  end

  describe "GET /v1/coach/meals/:id" do
    test "returns a meal by id", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, creator: coach, plan: plan, business: business)

      conn = get(conn, "/v1/coach/meals/#{meal.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == meal.id
    end

    test "returns 404 for meal from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_plan = insert(:plan, creator: other_coach, business: other_coach.business)
      meal = insert(:meal, creator: other_coach, plan: other_plan, business: other_coach.business)

      conn = get(conn, "/v1/coach/meals/#{meal.id}")
      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/meals/:id" do
    test "updates a meal", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, creator: coach, plan: plan, business: business)
      food = insert(:food, creator: coach, business: business, calories_per_100g: 100.0)

      insert(:meal_item,
        meal: meal,
        business: business,
        food: food,
        amount: 1.0,
        unit: "g",
        weight_g: 150.0
      )

      conn = patch(conn, "/v1/coach/meals/#{meal.id}", %{"name" => "Updated Meal"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["name"] == "Updated Meal"

      # Derived nutrition must be correct on update, not silently zero.
      # 100.0 cal/100g x 150g / 100 = 150.0
      assert data["nutrition"]["calories"] == 150.0
    end
  end

  describe "DELETE /v1/coach/meals/:id" do
    test "deletes a meal", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, creator: coach, plan: plan, business: business)

      conn = delete(conn, "/v1/coach/meals/#{meal.id}")
      assert response(conn, 204)
    end
  end
end
