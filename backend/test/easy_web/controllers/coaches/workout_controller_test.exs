defmodule EasyWeb.Coaches.WorkoutControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/training-plans/:plan_id/training-workouts" do
    test "creates workout", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post(
          "/v1/coach/training-plans/#{plan.id}/training-workouts",
          build(:workout_attrs)
        )

      assert %{"data" => data} = json_response(conn, 201)
      assert data["training_plan_id"] == plan.id
    end
  end

  describe "GET /v1/coach/training-plans/:plan_id/training-workouts" do
    test "lists workouts", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)
      insert(:workout, plan: plan, creator: coach, business: business)

      conn = get(conn, "/v1/coach/training-plans/#{plan.id}/training-workouts")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
    end
  end

  describe "PATCH /v1/coach/training-workouts/:id" do
    test "updates workout", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> patch("/v1/coach/training-workouts/#{workout.id}", %{"name" => "Updated Workout"})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["name"] == "Updated Workout"
    end
  end
end
