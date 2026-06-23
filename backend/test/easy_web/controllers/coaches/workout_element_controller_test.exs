defmodule EasyWeb.Coaches.WorkoutElementControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/training-workouts/:workout_id/exercises" do
    test "creates workout element", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business)
      exercise = insert(:exercise, business: business)

      attrs =
        build(:workout_element_attrs)
        |> Map.put("exercise_id", exercise.id)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-workouts/#{workout.id}/exercises", attrs)

      assert %{"data" => data} = json_response(conn, 201)

      assert data["training_workout_id"] == workout.id
      assert data["exercise_id"] == exercise.id
    end

    test "allows a system exercise (no business) in a workout", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business)
      system_exercise = insert(:exercise, source: "system", business: nil, creator: nil)

      attrs =
        build(:workout_element_attrs)
        |> Map.put("exercise_id", system_exercise.id)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-workouts/#{workout.id}/exercises", attrs)

      assert %{"data" => data} = json_response(conn, 201)
      assert data["exercise_id"] == system_exercise.id
    end

    test "returns 404 when exercise belongs to another business", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business)

      other = insert(:coach)
      other_exercise = insert(:exercise, business: other.business)

      attrs =
        build(:workout_element_attrs)
        |> Map.put("exercise_id", other_exercise.id)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-workouts/#{workout.id}/exercises", attrs)

      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/training-workout-exercises/:id" do
    test "updates workout element", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business)
      exercise = insert(:exercise, business: business)

      element =
        insert(:workout_element,
          workout: workout,
          exercise: exercise,
          business: business,
          position: 0
        )

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> patch("/v1/coach/training-workout-exercises/#{element.id}", %{"notes" => "Updated"})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["notes"] == "Updated"
    end

    test "returns 404 when updating to other business exercise", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business)
      exercise = insert(:exercise, business: business)

      element =
        insert(:workout_element,
          workout: workout,
          exercise: exercise,
          business: business,
          position: 0
        )

      other = insert(:coach)
      other_exercise = insert(:exercise, business: other.business)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> patch("/v1/coach/training-workout-exercises/#{element.id}", %{
          "exercise_id" => other_exercise.id
        })

      assert json_response(conn, 404)
    end
  end
end
