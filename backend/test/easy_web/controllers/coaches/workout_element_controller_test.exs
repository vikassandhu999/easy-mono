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
      workout = insert(:workout, plan: plan, business: business)
      exercise = insert(:exercise, business: business)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-workouts/#{workout.id}/exercises", %{
          "exercises" => [element_attrs(exercise)]
        })

      assert %{"data" => [data]} = json_response(conn, 201)

      assert data["training_workout_id"] == workout.id
      assert data["exercise_id"] == exercise.id
    end

    test "appends the batch in order, after what the workout already holds", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, business: business)
      ex1 = insert(:exercise, business: business)
      ex2 = insert(:exercise, business: business)
      insert(:workout_element, workout: workout, exercise: ex1, business: business, position: 0)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-workouts/#{workout.id}/exercises", %{
          "exercises" => [element_attrs(ex1), element_attrs(ex2)]
        })

      assert %{"data" => [first, second]} = json_response(conn, 201)
      assert [first["position"], second["position"]] == [1, 2]
      assert [first["exercise_id"], second["exercise_id"]] == [ex1.id, ex2.id]
    end

    test "allows a system exercise (no business) in a workout", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, business: business)
      system_exercise = insert(:exercise, source: "system", business: nil, creator: nil)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-workouts/#{workout.id}/exercises", %{
          "exercises" => [element_attrs(system_exercise)]
        })

      assert %{"data" => [data]} = json_response(conn, 201)
      assert data["exercise_id"] == system_exercise.id
      assert data["exercise"]["name"] == system_exercise.name
    end

    test "returns 404 when exercise belongs to another business", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, business: business)

      reachable = insert(:exercise, business: business)
      other = insert(:coach)
      other_exercise = insert(:exercise, business: other.business)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-workouts/#{workout.id}/exercises", %{
          "exercises" => [element_attrs(reachable), element_attrs(other_exercise)]
        })

      assert json_response(conn, 404)
      assert Easy.Repo.all(Easy.Training.TrainingWorkoutExercise) == []
    end
  end

  describe "PATCH /v1/coach/training-workout-exercises/:id" do
    test "updates workout element", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, business: business)
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
        |> patch("/v1/coach/training-workout-exercises/#{element.id}", %{
          "planned_sets" => [planned_set_attrs() |> Map.put("reps", "12")]
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert [%{"reps" => "12"}] = data["planned_sets"]
    end

    test "returns 404 when updating to other business exercise", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, business: business)
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

  describe "PUT /v1/coach/training-workouts/:workout_id/exercises/reorder" do
    test "reorders elements to the given order and reassigns positions", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, business: business)
      ex = insert(:exercise, business: business)
      e0 = insert(:workout_element, workout: workout, exercise: ex, business: business, position: 0)
      e1 = insert(:workout_element, workout: workout, exercise: ex, business: business, position: 1)
      e2 = insert(:workout_element, workout: workout, exercise: ex, business: business, position: 2)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> put("/v1/coach/training-workouts/#{workout.id}/exercises/reorder", %{
          "element_ids" => [e2.id, e0.id, e1.id]
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert Enum.map(data, & &1["id"]) == [e2.id, e0.id, e1.id]
      assert Enum.map(data, & &1["position"]) == [0, 1, 2]
    end

    test "returns 422 when element_ids are not exactly the workout's elements", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, business: business)
      ex = insert(:exercise, business: business)
      e0 = insert(:workout_element, workout: workout, exercise: ex, business: business, position: 0)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> put("/v1/coach/training-workouts/#{workout.id}/exercises/reorder", %{
          "element_ids" => [e0.id, Ecto.UUID.generate()]
        })

      assert json_response(conn, 422)
    end

    test "returns 404 for a workout in another business", %{conn: conn} do
      other = insert(:coach)
      other_plan = insert(:training_plan, creator: other, business: other.business)
      other_workout = insert(:workout, plan: other_plan, business: other.business)
      other_ex = insert(:exercise, business: other.business)

      element =
        insert(:workout_element, workout: other_workout, exercise: other_ex, business: other.business, position: 0)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> put("/v1/coach/training-workouts/#{other_workout.id}/exercises/reorder", %{
          "element_ids" => [element.id]
        })

      assert json_response(conn, 404)
    end
  end

  defp planned_set_attrs do
    :workout_element_attrs |> build() |> Map.fetch!("planned_sets") |> hd()
  end

  defp element_attrs(exercise) do
    :workout_element_attrs |> build() |> Map.put("exercise_id", exercise.id)
  end
end
