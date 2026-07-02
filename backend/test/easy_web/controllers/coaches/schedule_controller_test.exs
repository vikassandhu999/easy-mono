defmodule EasyWeb.Coaches.ScheduleControllerTest do
  use Easy.ConnCase

  import OpenApiSpex.TestAssertions

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
      assert data["breakfast"]["nutrition_meal_id"] == b.id
      assert data["breakfast"]["meal_slot"] == "breakfast"
      assert data["lunch"]["nutrition_meal_id"] == l.id
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

  describe "PUT /v1/coach/nutrition-plans/:plan_id/schedule (bulk)" do
    test "atomically replaces the whole week", %{conn: conn, plan: plan, breakfast: b, lunch: l} do
      put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule/monday", %{"dinner" => %{"meal_id" => l.id}})

      body = Map.new(~w(monday tuesday wednesday thursday friday saturday sunday), &{&1, %{"breakfast" => %{"meal_id" => b.id}}})
      conn = put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule", body)

      assert %{"data" => data} = json_response(conn, 200)
      assert map_size(data) == 7

      for {_day, slots} <- data do
        assert Map.keys(slots) == ["breakfast"]
        assert slots["breakfast"]["nutrition_meal_id"] == b.id
      end
    end

    test "a bad meal id rolls back the entire write", %{conn: conn, plan: plan, breakfast: b} do
      put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule/monday", %{"breakfast" => %{"meal_id" => b.id}})

      conn =
        put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule", %{
          "monday" => %{"breakfast" => %{"meal_id" => b.id}},
          "tuesday" => %{"breakfast" => %{"meal_id" => Ecto.UUID.generate()}}
        })

      # Unknown meal id → not_found (same mapping as the per-day endpoint).
      assert json_response(conn, 404)

      # Prior state intact — nothing was half-written.
      conn2 = get(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule")
      assert %{"data" => %{"monday" => %{"breakfast" => entry}}} = json_response(conn2, 200)
      assert entry["nutrition_meal_id"] == b.id
    end
  end

  describe "GET /v1/coach/nutrition-plans/:plan_id/schedule" do
    test "returns the schedule grouped by day then slot", %{conn: conn, plan: plan, breakfast: b} do
      put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule/monday", %{"breakfast" => %{"meal_id" => b.id}})
      conn = get(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule")
      assert %{"data" => %{"monday" => %{"breakfast" => entry}}} = json_response(conn, 200)
      assert entry["nutrition_meal_id"] == b.id
    end

    # Regression: the serializer once emitted meal_id/meal_name while the
    # OpenApiSpex schema (the FE contract) said nutrition_meal_id — the entire
    # schedule UI rendered "Unassigned" against a fully-scheduled plan.
    test "entries conform to the NutritionScheduleEntry schema", %{conn: conn, plan: plan, breakfast: b} do
      put(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule/monday", %{"breakfast" => %{"meal_id" => b.id}})
      conn = get(conn, "/v1/coach/nutrition-plans/#{plan.id}/schedule")
      %{"data" => %{"monday" => %{"breakfast" => entry}}} = json_response(conn, 200)
      assert_schema(entry, "NutritionScheduleEntry", EasyWeb.ApiSpec.spec())
    end
  end
end
