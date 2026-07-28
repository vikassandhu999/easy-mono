defmodule EasyWeb.Coaches.MealControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "PATCH /v1/coach/nutrition-meals/:id" do
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

      conn = patch(conn, "/v1/coach/nutrition-meals/#{meal.id}", %{"name" => "Updated Meal"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["name"] == "Updated Meal"

      # Derived nutrition must be correct on update, not silently zero.
      # 100.0 cal/100g x 150g / 100 = 150.0
      assert data["nutrition"]["calories"] == 150.0
    end
  end

  describe "DELETE /v1/coach/nutrition-meals/:id" do
    test "deletes a meal", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, creator: coach, plan: plan, business: business)

      conn = delete(conn, "/v1/coach/nutrition-meals/#{meal.id}")
      assert response(conn, 204)
    end
  end
end
