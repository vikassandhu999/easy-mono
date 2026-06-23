defmodule EasyWeb.Coaches.WorkoutControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/training_plans/:plan_id/workouts" do
    test "creates workout", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)

      conn =
        post(
          conn,
          "/v1/coach/training_plans/#{plan.id}/workouts",
          build(:workout_attrs)
        )

      assert %{"data" => data} = json_response(conn, 201)
      assert data["training_plan_id"] == plan.id
    end
  end

  describe "GET /v1/coach/training_plans/:plan_id/workouts" do
    test "lists workouts", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)
      insert(:workout, plan: plan, creator: coach, business: business)

      conn = get(conn, "/v1/coach/training_plans/#{plan.id}/workouts")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
    end
  end

  describe "PATCH /v1/coach/workouts/:id" do
    test "updates workout", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business)

      conn = patch(conn, "/v1/coach/workouts/#{workout.id}", %{"name" => "Updated Workout"})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["name"] == "Updated Workout"
    end
  end

  describe "POST /v1/coach/workouts/:id/duplicate" do
    test "duplicates workout", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)
      exercise = insert(:exercise, business: business)

      workout =
        insert(:workout,
          plan: plan,
          creator: coach,
          business: business,
          name: "Push Day"
        )

      _element =
        insert(:workout_element,
          workout: workout,
          exercise: exercise,
          business: business,
          position: 0,
          planned_sets: [
            %{
              set_type: "working",
              reps: "8-10",
              load_value: 80,
              load_unit: "kg",
              rpe: 8,
              rest_seconds: 120
            }
          ]
        )

      conn = post(conn, "/v1/coach/workouts/#{workout.id}/duplicate")

      assert %{"data" => data} = json_response(conn, 201)
      assert data["name"] == "Push Day"
      assert data["training_plan_id"] == plan.id
      assert data["id"] != workout.id

      [element] = data["workout_elements"]
      assert element["exercise"]["id"] == exercise.id

      [set] = element["planned_sets"]
      assert set["reps"] == "8-10"
      assert set["set_type"] == "working"
      assert set["load_value"] == "80"
      assert set["rest_seconds"] == 120
    end

    test "returns 404 for cross-business workout", %{conn: conn} do
      other_coach = insert(:coach)
      other_plan = insert(:training_plan, creator: other_coach, business: other_coach.business)

      other_workout =
        insert(:workout, plan: other_plan, creator: other_coach, business: other_coach.business)

      conn = post(conn, "/v1/coach/workouts/#{other_workout.id}/duplicate")
      assert json_response(conn, 404)
    end
  end
end
