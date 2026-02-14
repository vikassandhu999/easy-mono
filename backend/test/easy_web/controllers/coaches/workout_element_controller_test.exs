defmodule EasyWeb.Coaches.WorkoutElementControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/workout_elements" do
    test "creates workout element", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)
      workout = insert(:planned_workout, training_plan: plan, business: business)
      exercise = insert(:exercise, business: business)

      attrs =
        build(:workout_element_attrs)
        |> Map.put("planned_workout_id", workout.id)
        |> Map.put("exercise_id", exercise.id)

      conn = post(conn, "/v1/coach/workout_elements", attrs)
      assert %{"data" => data} = json_response(conn, 201)

      assert data["planned_workout_id"] == workout.id
      assert data["exercise_id"] == exercise.id
    end

    test "returns 404 when exercise belongs to another business", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, author: coach, business: business)
      workout = insert(:planned_workout, training_plan: plan, business: business)

      other = insert(:coach)
      other_exercise = insert(:exercise, business: other.business)

      attrs =
        build(:workout_element_attrs)
        |> Map.put("planned_workout_id", workout.id)
        |> Map.put("exercise_id", other_exercise.id)

      conn = post(conn, "/v1/coach/workout_elements", attrs)
      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/workout_elements/:id" do
    test "updates workout element", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)
      workout = insert(:planned_workout, training_plan: plan, business: business)
      exercise = insert(:exercise, business: business)

      element =
        insert(:workout_element,
          planned_workout: workout,
          exercise: exercise,
          business: business,
          position: 0
        )

      conn = patch(conn, "/v1/coach/workout_elements/#{element.id}", %{"notes" => "Updated"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["notes"] == "Updated"
    end

    test "returns 404 when updating to other business exercise", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, author: coach, business: business)
      workout = insert(:planned_workout, training_plan: plan, business: business)
      exercise = insert(:exercise, business: business)

      element =
        insert(:workout_element,
          planned_workout: workout,
          exercise: exercise,
          business: business,
          position: 0
        )

      other = insert(:coach)
      other_exercise = insert(:exercise, business: other.business)

      conn =
        patch(conn, "/v1/coach/workout_elements/#{element.id}", %{
          "exercise_id" => other_exercise.id
        })

      assert json_response(conn, 404)
    end
  end
end
