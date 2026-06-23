defmodule EasyWeb.Coaches.MealItemControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/nutrition-meals/:meal_id/items" do
    test "creates a meal item", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, creator: coach, plan: plan, business: business)
      food = insert(:food, creator: coach, business: business)

      attrs = build(:meal_item_attrs) |> Map.put("food_id", food.id)

      conn = post(conn, "/v1/coach/nutrition-meals/#{meal.id}/items", attrs)
      assert %{"data" => data} = json_response(conn, 201)

      assert data["food_id"] == food.id
      assert data["nutrition_meal_id"] == meal.id
    end
  end

  describe "PATCH /v1/coach/nutrition-meal-items/:id" do
    test "updates a meal item", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, creator: coach, plan: plan, business: business)
      food = insert(:food, creator: coach, business: business)
      meal_item = insert(:meal_item, meal: meal, food: food, business: business)

      conn = patch(conn, "/v1/coach/nutrition-meal-items/#{meal_item.id}", %{"amount" => 2.0})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["amount"] == 2.0
    end
  end

  describe "DELETE /v1/coach/nutrition-meal-items/:id" do
    test "deletes a meal item", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, creator: coach, plan: plan, business: business)
      food = insert(:food, creator: coach, business: business)
      meal_item = insert(:meal_item, meal: meal, food: food, business: business)

      conn = delete(conn, "/v1/coach/nutrition-meal-items/#{meal_item.id}")
      assert response(conn, 204)
    end
  end
end
