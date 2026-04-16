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

  describe "POST /v1/coach/planned_workouts/:id/duplicate" do
    test "duplicates workout to a target day", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)
      exercise = insert(:exercise, business: business)

      workout =
        insert(:planned_workout,
          training_plan: plan,
          business: business,
          name: "Push Day",
          day_number: 1
        )

      _element =
        insert(:workout_element,
          planned_workout: workout,
          exercise: exercise,
          business: business,
          position: 0,
          planned_sets: [
            %{
              set_type: :working,
              target_reps: "8-10",
              load_value: 80,
              load_unit: :kg,
              rest_seconds: 120
            }
          ]
        )

      conn =
        post(conn, "/v1/coach/planned_workouts/#{workout.id}/duplicate", %{"day_number" => 4})

      assert %{"data" => data} = json_response(conn, 201)
      assert data["name"] == "Push Day"
      assert data["day_number"] == 4
      assert data["training_plan_id"] == plan.id
      assert data["id"] != workout.id

      [element] = data["workout_elements"]
      assert element["exercise"]["id"] == exercise.id

      [set] = element["planned_sets"]
      assert set["target_reps"] == "8-10"
      assert set["load_value"] == "80"
      assert set["rest_seconds"] == 120
    end

    test "returns 422 without day_number", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)
      workout = insert(:planned_workout, training_plan: plan, business: business)

      conn = post(conn, "/v1/coach/planned_workouts/#{workout.id}/duplicate", %{})
      assert json_response(conn, 422)
    end

    test "returns 404 for cross-business workout", %{conn: conn} do
      other_coach = insert(:coach)
      other_plan = insert(:training_plan, author: other_coach, business: other_coach.business)

      other_workout =
        insert(:planned_workout, training_plan: other_plan, business: other_coach.business)

      conn =
        post(conn, "/v1/coach/planned_workouts/#{other_workout.id}/duplicate", %{
          "day_number" => 1
        })

      assert json_response(conn, 404)
    end
  end
end
