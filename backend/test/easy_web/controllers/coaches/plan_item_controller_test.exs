defmodule EasyWeb.Coaches.PlanItemControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/nutrition_plans/:plan_id/plan_items" do
    test "creates a plan item", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, creator: coach, plan: plan, business: business)

      attrs = build(:schedule_entry_attrs) |> Map.put("nutrition_meal_id", meal.id)

      conn = post(conn, "/v1/coach/nutrition_plans/#{plan.id}/plan_items", attrs)
      assert %{"data" => data} = json_response(conn, 201)

      assert data["nutrition_meal_id"] == meal.id
      assert data["nutrition_plan_id"] == plan.id
      assert data["day_of_week"] == attrs["day_of_week"]
      assert data["meal_slot"] == attrs["meal_slot"]
    end

    test "returns 404 when meal is from another plan", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:plan, creator: coach, business: business)
      other_plan = insert(:plan, creator: coach, business: business)
      other_meal = insert(:meal, creator: coach, plan: other_plan, business: business)

      attrs = build(:schedule_entry_attrs) |> Map.put("nutrition_meal_id", other_meal.id)

      conn = post(conn, "/v1/coach/nutrition_plans/#{plan.id}/plan_items", attrs)
      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/nutrition_plans/:plan_id/plan_items" do
    test "lists plan items", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, creator: coach, plan: plan, business: business)
      insert(:schedule_entry, plan: plan, meal: meal, business: business)

      conn = get(conn, "/v1/coach/nutrition_plans/#{plan.id}/plan_items")
      assert %{"data" => data} = json_response(conn, 200)

      assert length(data) == 1
    end
  end

  describe "PATCH /v1/coach/plan_items/:id" do
    test "updates a plan item", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, creator: coach, plan: plan, business: business)
      plan_item = insert(:schedule_entry, plan: plan, meal: meal, business: business)

      conn = patch(conn, "/v1/coach/plan_items/#{plan_item.id}", %{"day_of_week" => "tuesday"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["day_of_week"] == "tuesday"
    end

    test "returns 404 when updating to meal from another plan", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, creator: coach, plan: plan, business: business)
      plan_item = insert(:schedule_entry, plan: plan, meal: meal, business: business)
      other_plan = insert(:plan, creator: coach, business: business)
      other_meal = insert(:meal, creator: coach, plan: other_plan, business: business)

      conn =
        patch(conn, "/v1/coach/plan_items/#{plan_item.id}", %{"nutrition_meal_id" => other_meal.id})

      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/coach/plan_items/:id" do
    test "deletes a plan item", %{conn: conn, coach: coach, business: business} do
      plan = insert(:plan, creator: coach, business: business)
      meal = insert(:meal, creator: coach, plan: plan, business: business)
      plan_item = insert(:schedule_entry, plan: plan, meal: meal, business: business)

      conn = delete(conn, "/v1/coach/plan_items/#{plan_item.id}")
      assert response(conn, 204)
    end
  end
end
