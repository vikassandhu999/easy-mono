defmodule EasyWeb.Coaches.ScheduleControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    plan = insert(:plan, business: coach.business, creator: coach)
    breakfast = insert(:meal, plan: plan, creator: coach, business: coach.business)
    lunch = insert(:meal, plan: plan, creator: coach, business: coach.business)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{conn: conn, coach: coach, plan: plan, breakfast: breakfast, lunch: lunch}
  end

  describe "PUT /v1/coach/nutrition-plans/:plan_id/schedule/:day" do
    test "sets a day's schedule as desired state", %{conn: conn, plan: plan, breakfast: b, lunch: l} do
      conn =
        put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule/monday", %{
          "breakfast" => %{"meal_id" => b.id},
          "lunch" => %{"meal_id" => l.id}
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["breakfast"]["meal_id"] == b.id
      assert data["breakfast"]["meal_slot"] == "breakfast"
      assert data["breakfast"]["meal_name"] == b.name
      assert data["lunch"]["meal_id"] == l.id
    end

    test "replacing a day removes omitted slots", %{conn: conn, plan: plan, breakfast: b, lunch: l} do
      put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule/monday", %{
        "breakfast" => %{"meal_id" => b.id},
        "lunch" => %{"meal_id" => l.id}
      })

      conn = put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule/monday", %{"breakfast" => %{"meal_id" => b.id}})
      assert %{"data" => data} = json_response(conn, 200)
      assert Map.keys(data) == ["breakfast"]
    end

    test "rejects an invalid weekday", %{conn: conn, plan: plan, breakfast: b} do
      conn = put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule/funday", %{"breakfast" => %{"meal_id" => b.id}})
      assert json_response(conn, 422)
    end
  end

  describe "GET /v1/coach/nutrition-plans/:plan_id/schedule" do
    test "returns the schedule grouped by day then slot", %{conn: conn, plan: plan, breakfast: b} do
      put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule/monday", %{"breakfast" => %{"meal_id" => b.id}})
      conn = get(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule")
      assert %{"data" => %{"monday" => %{"breakfast" => entry}}} = json_response(conn, 200)
      assert entry["meal_id"] == b.id
    end
  end
end
