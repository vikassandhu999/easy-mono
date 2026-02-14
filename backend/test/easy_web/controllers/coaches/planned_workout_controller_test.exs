defmodule EasyWeb.Coaches.PlannedWorkoutControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/training_plans/:plan_id/planned_workouts" do
    test "creates planned workout", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)

      conn =
        post(
          conn,
          "/v1/coach/training_plans/#{plan.id}/planned_workouts",
          build(:planned_workout_attrs)
        )

      assert %{"data" => data} = json_response(conn, 201)

      assert data["training_plan_id"] == plan.id
      assert data["day_number"] == 1
    end
  end

  describe "GET /v1/coach/training_plans/:plan_id/planned_workouts" do
    test "lists planned workouts", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)
      insert(:planned_workout, training_plan: plan, business: business)

      conn = get(conn, "/v1/coach/training_plans/#{plan.id}/planned_workouts")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
    end
  end

  describe "PATCH /v1/coach/planned_workouts/:id" do
    test "updates planned workout", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)
      workout = insert(:planned_workout, training_plan: plan, business: business)

      conn =
        patch(conn, "/v1/coach/planned_workouts/#{workout.id}", %{"name" => "Updated Workout"})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["name"] == "Updated Workout"
    end
  end
end
