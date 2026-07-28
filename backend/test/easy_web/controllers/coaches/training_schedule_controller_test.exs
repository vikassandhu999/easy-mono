defmodule EasyWeb.Coaches.TrainingScheduleControllerTest do
  use Easy.ConnCase

  @weekdays ~w(monday tuesday wednesday thursday friday saturday sunday)

  setup do
    coach = insert(:coach)
    plan = insert(:training_plan, creator: coach, business: coach.business)
    workout = insert(:workout, plan: plan, business: coach.business)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{conn: conn, coach: coach, plan: plan, workout: workout}
  end

  defp rest_week, do: Map.new(@weekdays, &{&1, nil})

  describe "PUT /v1/coach/training-plans/:plan_id/schedule" do
    test "replaces the whole week", %{conn: conn, plan: plan, workout: workout} do
      body = rest_week() |> Map.merge(%{"monday" => workout.id, "thursday" => workout.id})

      conn = put(conn, "/v1/coach/training-plans/#{plan.id}/schedule", body)

      assert %{"data" => schedule} = json_response(conn, 200)
      assert schedule["monday"] == workout.id
      assert schedule["thursday"] == workout.id
      assert schedule["sunday"] == nil
    end

    test "clears a workout the new map no longer names", %{conn: conn, plan: plan, workout: workout} do
      put(conn, "/v1/coach/training-plans/#{plan.id}/schedule", Map.put(rest_week(), "monday", workout.id))
      conn = put(conn, "/v1/coach/training-plans/#{plan.id}/schedule", rest_week())

      assert %{"data" => schedule} = json_response(conn, 200)
      assert Enum.all?(@weekdays, &is_nil(schedule[&1]))
    end

    test "returns 422 when a weekday is missing", %{conn: conn, plan: plan} do
      conn = put(conn, "/v1/coach/training-plans/#{plan.id}/schedule", Map.delete(rest_week(), "sunday"))
      assert json_response(conn, 422)
    end

    test "returns 404 when a workout belongs to another plan", %{conn: conn, plan: plan, coach: coach} do
      other_plan = insert(:training_plan, creator: coach, business: coach.business)
      other_workout = insert(:workout, plan: other_plan, business: coach.business)

      conn =
        put(conn, "/v1/coach/training-plans/#{plan.id}/schedule", Map.put(rest_week(), "monday", other_workout.id))

      assert json_response(conn, 404)
    end

    test "returns 404 for a plan in another business", %{conn: conn} do
      foreign_coach = insert(:coach)
      foreign_plan = insert(:training_plan, creator: foreign_coach, business: foreign_coach.business)

      conn = put(conn, "/v1/coach/training-plans/#{foreign_plan.id}/schedule", rest_week())
      assert json_response(conn, 404)
    end

    test "returns 401 when not authenticated", %{plan: plan} do
      conn = build_conn() |> put_req_header("content-type", "application/json")
      conn = put(conn, "/v1/coach/training-plans/#{plan.id}/schedule", rest_week())
      assert json_response(conn, 403)
    end
  end
end
