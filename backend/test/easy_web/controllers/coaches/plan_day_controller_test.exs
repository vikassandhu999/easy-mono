defmodule EasyWeb.Coaches.PlanDayControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    plan = insert(:plan, business: coach.business, creator: coach)
    meal = insert(:meal, plan: plan, creator: coach, business: coach.business)
    meal2 = insert(:meal, plan: plan, creator: coach, business: coach.business)
    meal3 = insert(:meal, plan: plan, creator: coach, business: coach.business)
    meal4 = insert(:meal, plan: plan, creator: coach, business: coach.business)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{
      conn: conn,
      coach: coach,
      plan: plan,
      meal: meal,
      meal2: meal2,
      meal3: meal3,
      meal4: meal4
    }
  end

  describe "POST /v1/coach/nutrition-plans/:plan_id/days" do
    test "creates the first day at position 0 with default name", %{conn: conn, plan: plan} do
      conn = post(conn, "/v1/coach/nutrition-plans/#{plan.id}/days", %{})
      assert %{"data" => data} = json_response(conn, 201)
      assert data["position"] == 0
      assert data["name"] == "Day 1"
    end

    test "creates a second day at position 1 with default name 'Day 2'", %{conn: conn, plan: plan} do
      insert(:plan_day, plan: plan, business: plan.business, position: 0, name: "Everyday")

      conn = post(conn, "/v1/coach/nutrition-plans/#{plan.id}/days", %{})
      assert %{"data" => data} = json_response(conn, 201)
      assert data["position"] == 1
      assert data["name"] == "Day 2"
    end

    test "accepts an explicit name", %{conn: conn, plan: plan} do
      conn = post(conn, "/v1/coach/nutrition-plans/#{plan.id}/days", %{"name" => "Rest Day"})
      assert %{"data" => data} = json_response(conn, 201)
      assert data["name"] == "Rest Day"
    end

    test "returns 404 for a plan in another business", %{conn: conn} do
      other = insert(:plan)
      conn = post(conn, "/v1/coach/nutrition-plans/#{other.id}/days", %{})
      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/nutrition-days/:id" do
    test "renames a day", %{conn: conn, plan: plan} do
      day = insert(:plan_day, plan: plan, business: plan.business)

      conn = patch(conn, "/v1/coach/nutrition-days/#{day.id}", %{"name" => "Leg Day"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["name"] == "Leg Day"
    end

    test "returns 404 for a day in another business", %{conn: conn} do
      other_day = insert(:plan_day)
      conn = patch(conn, "/v1/coach/nutrition-days/#{other_day.id}", %{"name" => "Nope"})
      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/coach/nutrition-days/:id" do
    test "deletes a non-last day and moves its weekdays to the fallback", %{conn: conn, plan: plan} do
      day1 = insert(:plan_day, plan: plan, business: plan.business, position: 0)
      day2 = insert(:plan_day, plan: plan, business: plan.business, position: 1, weekdays: ["monday"])

      conn = delete(conn, "/v1/coach/nutrition-days/#{day2.id}")
      assert response(conn, 204)

      show = get(conn, "/v1/coach/nutrition-plans/#{plan.id}")
      assert %{"data" => data} = json_response(show, 200)
      assert data["weekday_assignments"]["monday"] == day1.id
    end

    test "returns 409 when deleting the last remaining day", %{conn: conn, plan: plan} do
      day = insert(:plan_day, plan: plan, business: plan.business)

      conn = delete(conn, "/v1/coach/nutrition-days/#{day.id}")
      assert json_response(conn, 409)
    end

    test "returns 404 for a day in another business", %{conn: conn} do
      other_day = insert(:plan_day)
      conn = delete(conn, "/v1/coach/nutrition-days/#{other_day.id}")
      assert json_response(conn, 404)
    end
  end

  describe "PUT /v1/coach/nutrition-plans/:plan_id/schedule" do
    test "replaces the whole weekday map", %{conn: conn, plan: plan} do
      day1 = insert(:plan_day, plan: plan, business: plan.business, position: 0)
      day2 = insert(:plan_day, plan: plan, business: plan.business, position: 1)

      conn = put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule", schedule_body(day1.id, "sunday", day2.id))

      assert %{"data" => data} = json_response(conn, 200)
      assert data["monday"] == day1.id
      assert data["sunday"] == day2.id

      show = get(conn, "/v1/coach/nutrition-plans/#{plan.id}")
      assert %{"data" => plan_data} = json_response(show, 200)
      assert plan_data["weekday_assignments"]["sunday"] == day2.id
    end

    test "returns 422 when a weekday is missing", %{conn: conn, plan: plan} do
      day = insert(:plan_day, plan: plan, business: plan.business)
      body = day.id |> schedule_body() |> Map.delete("sunday")

      conn = put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule", body)
      assert json_response(conn, 422)
    end

    test "returns 404 for a day from another plan", %{conn: conn, plan: plan} do
      day = insert(:plan_day, plan: plan, business: plan.business)
      foreign_day = insert(:plan_day)

      conn = put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule", schedule_body(day.id, "monday", foreign_day.id))

      assert json_response(conn, 404)
    end

    test "returns 404 for a plan in another business", %{conn: conn} do
      other_plan = insert(:plan)
      other_day = insert(:plan_day, plan: other_plan, business: other_plan.business)

      conn = put(conn, "/v1/coach/nutrition-plans/#{other_plan.id}/schedule", schedule_body(other_day.id))
      assert json_response(conn, 404)
    end
  end

  defp schedule_body(day_id) do
    Map.new(~w(monday tuesday wednesday thursday friday saturday sunday), &{&1, day_id})
  end

  defp schedule_body(day_id, weekday, other_id) do
    day_id |> schedule_body() |> Map.put(weekday, other_id)
  end

  describe "POST /v1/coach/nutrition-days/:day_id/meals" do
    test "places existing meals up to 3 then rejects the 4th", %{
      conn: conn,
      plan: plan,
      meal: meal,
      meal2: meal2,
      meal3: meal3,
      meal4: meal4
    } do
      day = insert(:plan_day, plan: plan, business: plan.business)

      for m <- [meal, meal2, meal3] do
        conn2 =
          post(conn, "/v1/coach/nutrition-days/#{day.id}/meals", %{
            "meal_slot" => "breakfast",
            "nutrition_meal_id" => m.id
          })

        assert %{"data" => data} = json_response(conn2, 201)
        assert data["meal"]["id"] == m.id
        assert data["meal"]["meal_items"] == []
      end

      conn3 =
        post(conn, "/v1/coach/nutrition-days/#{day.id}/meals", %{
          "meal_slot" => "breakfast",
          "nutrition_meal_id" => meal4.id
        })

      assert json_response(conn3, 409)
    end

    test "creates a new plan meal from a name and embeds it", %{conn: conn, plan: plan} do
      day = insert(:plan_day, plan: plan, business: plan.business)

      conn = post(conn, "/v1/coach/nutrition-days/#{day.id}/meals", %{"meal_slot" => "lunch", "name" => "New meal"})

      assert %{"data" => data} = json_response(conn, 201)
      assert data["meal"]["name"] == "New meal"
      assert data["meal"]["nutrition_plan_id"] == plan.id
      assert data["nutrition_meal_id"] == data["meal"]["id"]
    end

    test "returns 422 when neither name nor nutrition_meal_id is given", %{conn: conn, plan: plan} do
      day = insert(:plan_day, plan: plan, business: plan.business)

      conn = post(conn, "/v1/coach/nutrition-days/#{day.id}/meals", %{"meal_slot" => "lunch"})
      assert json_response(conn, 422)
    end

    test "returns 404 for a meal belonging to another plan", %{conn: conn, plan: plan} do
      day = insert(:plan_day, plan: plan, business: plan.business)
      other_meal = insert(:meal)

      conn =
        post(conn, "/v1/coach/nutrition-days/#{day.id}/meals", %{
          "meal_slot" => "breakfast",
          "nutrition_meal_id" => other_meal.id
        })

      assert json_response(conn, 404)
    end

    test "returns 404 for a day in another business", %{conn: conn, meal: meal} do
      other_day = insert(:plan_day)

      conn =
        post(conn, "/v1/coach/nutrition-days/#{other_day.id}/meals", %{
          "meal_slot" => "breakfast",
          "nutrition_meal_id" => meal.id
        })

      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/coach/nutrition-day-meals/:id" do
    test "compacts remaining option positions", %{conn: conn, plan: plan, meal: meal, meal2: meal2} do
      day = insert(:plan_day, plan: plan, business: plan.business)
      dm1 = insert(:day_meal, plan_day: day, meal: meal, business: plan.business, position: 0)
      dm2 = insert(:day_meal, plan_day: day, meal: meal2, business: plan.business, position: 1)

      conn = delete(conn, "/v1/coach/nutrition-day-meals/#{dm1.id}")
      assert response(conn, 204)

      show = get(conn, "/v1/coach/nutrition-plans/#{plan.id}")
      assert %{"data" => data} = json_response(show, 200)
      [day_data] = data["days"]
      [remaining] = day_data["day_meals"]
      assert remaining["id"] == dm2.id
      assert remaining["position"] == 0
    end

    test "returns 404 for a day meal in another business", %{conn: conn} do
      other_dm = insert(:day_meal)
      conn = delete(conn, "/v1/coach/nutrition-day-meals/#{other_dm.id}")
      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/nutrition-day-meals/:id" do
    test "an explicit position reorders the chosen option to position 0", %{
      conn: conn,
      plan: plan,
      meal: meal,
      meal2: meal2
    } do
      day = insert(:plan_day, plan: plan, business: plan.business)
      dm1 = insert(:day_meal, plan_day: day, meal: meal, business: plan.business, position: 0)
      dm2 = insert(:day_meal, plan_day: day, meal: meal2, business: plan.business, position: 1)

      conn = patch(conn, "/v1/coach/nutrition-day-meals/#{dm2.id}", %{"position" => 0})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == dm2.id
      assert data["position"] == 0

      show = get(conn, "/v1/coach/nutrition-plans/#{plan.id}")
      assert %{"data" => plan_data} = json_response(show, 200)
      [day_data] = plan_data["days"]
      assert Enum.find(day_data["day_meals"], &(&1["id"] == dm1.id))["position"] == 1
    end

    test "returns 404 for a day meal in another business", %{conn: conn} do
      other_dm = insert(:day_meal)
      conn = patch(conn, "/v1/coach/nutrition-day-meals/#{other_dm.id}", %{"position" => 0})
      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/nutrition-plans/:id includes days and weekday_assignments" do
    test "plan show includes days with day_meals and weekday_assignments", %{
      conn: conn,
      plan: plan,
      meal: meal
    } do
      day = insert(:plan_day, plan: plan, business: plan.business, name: "Everyday", weekdays: ["monday"])
      insert(:day_meal, plan_day: day, meal: meal, business: plan.business)

      conn = get(conn, "/v1/coach/nutrition-plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)

      [day_data] = data["days"]
      assert day_data["name"] == "Everyday"
      assert day_data["weekdays"] == ["monday"]
      [dm_data] = day_data["day_meals"]
      assert dm_data["nutrition_meal_id"] == meal.id

      assert data["weekday_assignments"]["monday"] == day.id
    end
  end
end
