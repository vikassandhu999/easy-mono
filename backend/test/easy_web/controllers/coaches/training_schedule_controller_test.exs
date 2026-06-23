defmodule EasyWeb.Coaches.TrainingScheduleControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    plan = insert(:training_plan, creator: coach, business: coach.business)
    workout = insert(:workout, plan: plan, creator: coach, business: coach.business)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{conn: conn, coach: coach, plan: plan, workout: workout}
  end

  describe "GET /v1/coach/training-plans/:plan_id/schedule" do
    test "returns day->entry map for the plan", %{conn: conn, plan: plan, workout: workout} do
      put(conn, "/v1/coach/training-plans/#{plan.id}/schedule/monday", %{"training_workout_id" => workout.id})
      conn = get(conn, "/v1/coach/training-plans/#{plan.id}/schedule")
      assert %{"data" => %{"monday" => entry}} = json_response(conn, 200)
      assert entry["training_workout_id"] == workout.id
      assert entry["day_of_week"] == "monday"
    end

    test "returns empty data when no schedule set", %{conn: conn, plan: plan} do
      conn = get(conn, "/v1/coach/training-plans/#{plan.id}/schedule")
      assert %{"data" => data} = json_response(conn, 200)
      assert data == %{}
    end

    test "returns 401 when not authenticated" do
      coach = insert(:coach)
      plan = insert(:training_plan, creator: coach, business: coach.business)
      conn = build_conn() |> put_req_header("content-type", "application/json")
      conn = get(conn, "/v1/coach/training-plans/#{plan.id}/schedule")
      assert json_response(conn, 403)
    end
  end

  describe "PUT /v1/coach/training-plans/:plan_id/schedule/:day" do
    test "sets a day's workout", %{conn: conn, plan: plan, workout: workout} do
      conn = put(conn, "/v1/coach/training-plans/#{plan.id}/schedule/monday", %{"training_workout_id" => workout.id})
      assert %{"data" => entry} = json_response(conn, 200)
      assert entry["training_workout_id"] == workout.id
      assert entry["day_of_week"] == "monday"
    end

    test "clears a day when body is empty (rest day)", %{conn: conn, plan: plan, workout: workout} do
      put(conn, "/v1/coach/training-plans/#{plan.id}/schedule/monday", %{"training_workout_id" => workout.id})
      conn = put(conn, "/v1/coach/training-plans/#{plan.id}/schedule/monday", %{})
      assert %{"data" => nil} = json_response(conn, 200)
    end

    test "returns 404 when workout belongs to another plan", %{conn: conn, plan: plan, coach: coach} do
      other_plan = insert(:training_plan, creator: coach, business: coach.business)
      other_workout = insert(:workout, plan: other_plan, creator: coach, business: coach.business)
      conn = put(conn, "/v1/coach/training-plans/#{plan.id}/schedule/monday", %{"training_workout_id" => other_workout.id})
      assert json_response(conn, 404)
    end

    test "returns 422 with invalid weekday", %{conn: conn, plan: plan, workout: workout} do
      conn = put(conn, "/v1/coach/training-plans/#{plan.id}/schedule/funday", %{"training_workout_id" => workout.id})
      assert json_response(conn, 422)
    end

    test "returns 401 when not authenticated" do
      coach = insert(:coach)
      plan = insert(:training_plan, creator: coach, business: coach.business)
      conn = build_conn() |> put_req_header("content-type", "application/json")
      conn = put(conn, "/v1/coach/training-plans/#{plan.id}/schedule/monday", %{})
      assert json_response(conn, 403)
    end
  end
end
