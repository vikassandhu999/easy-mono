defmodule EasyWeb.Coaches.PerformedSetControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)
    client = insert(:client, creator: coach, business: coach.business)
    session = insert(:workout_session, client: client, business: coach.business, state: :active)
    exercise = insert(:exercise, business: coach.business)

    %{
      conn: conn,
      coach: coach,
      business: coach.business,
      client: client,
      session: session,
      exercise: exercise
    }
  end

  describe "POST /v1/coach/performed_sets" do
    test "creates performed set", %{conn: conn, session: session, exercise: exercise} do
      conn =
        post(conn, "/v1/coach/performed_sets", %{
          "workout_session_id" => session.id,
          "exercise_id" => exercise.id,
          "set_type" => "working",
          "position" => 0,
          "reps" => "10",
          "load_value" => 80,
          "load_unit" => "kg",
          "completed" => true
        })

      assert %{"data" => data} = json_response(conn, 201)

      assert data["training_session_id"] == session.id
      assert data["exercise_id"] == exercise.id
      assert data["position"] == 0
      assert data["reps"] == "10"
      assert data["set_type"] == "working"
      assert data["completed"] == true
      assert data["exercise_name"] == exercise.name
      assert data["exercise"]["name"] == exercise.name
    end

    test "returns 404 for session in another business", %{conn: conn, exercise: exercise} do
      other = insert(:coach)
      other_client = insert(:client, creator: other, business: other.business)
      other_session = insert(:workout_session, client: other_client, business: other.business)

      conn =
        post(conn, "/v1/coach/performed_sets", %{
          "workout_session_id" => other_session.id,
          "exercise_id" => exercise.id,
          "set_type" => "working",
          "position" => 0,
          "reps" => "10",
          "completed" => true
        })

      assert json_response(conn, 404)
    end

    test "returns 404 for exercise in another business", %{conn: conn, session: session} do
      other = insert(:coach)
      other_exercise = insert(:exercise, business: other.business)

      conn =
        post(conn, "/v1/coach/performed_sets", %{
          "workout_session_id" => session.id,
          "exercise_id" => other_exercise.id,
          "set_type" => "working",
          "position" => 0,
          "reps" => "10",
          "completed" => true
        })

      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/performed_sets/:id" do
    test "updates performed set", %{
      conn: conn,
      session: session,
      exercise: exercise,
      business: business
    } do
      {:ok, set} =
        Easy.Sessions.create_performed_set(session.id, business.id, %{
          "exercise_id" => exercise.id,
          "set_type" => "working",
          "position" => 0,
          "reps" => "10",
          "load_value" => 80,
          "load_unit" => "kg",
          "completed" => true
        })

      conn =
        patch(conn, "/v1/coach/performed_sets/#{set.id}", %{
          "reps" => "8",
          "load_value" => 75,
          "notes" => "Dropped weight"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["reps"] == "8"
      assert data["notes"] == "Dropped weight"
    end

    test "returns 404 for set in another business", %{conn: conn} do
      other = insert(:coach)
      other_client = insert(:client, creator: other, business: other.business)
      other_session = insert(:workout_session, client: other_client, business: other.business)
      other_exercise = insert(:exercise, business: other.business)

      {:ok, set} =
        Easy.Sessions.create_performed_set(other_session.id, other.business_id, %{
          "exercise_id" => other_exercise.id,
          "set_type" => "working",
          "position" => 0,
          "reps" => "10",
          "completed" => true
        })

      conn = patch(conn, "/v1/coach/performed_sets/#{set.id}", %{"reps" => "5"})
      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/coach/performed_sets/:id" do
    test "deletes performed set", %{
      conn: conn,
      session: session,
      exercise: exercise,
      business: business
    } do
      {:ok, set} =
        Easy.Sessions.create_performed_set(session.id, business.id, %{
          "exercise_id" => exercise.id,
          "set_type" => "working",
          "position" => 0,
          "reps" => "10",
          "completed" => true
        })

      conn = delete(conn, "/v1/coach/performed_sets/#{set.id}")
      assert response(conn, 204)
    end

    test "returns 404 for set in another business", %{conn: conn} do
      other = insert(:coach)
      other_client = insert(:client, creator: other, business: other.business)
      other_session = insert(:workout_session, client: other_client, business: other.business)
      other_exercise = insert(:exercise, business: other.business)

      {:ok, set} =
        Easy.Sessions.create_performed_set(other_session.id, other.business_id, %{
          "exercise_id" => other_exercise.id,
          "set_type" => "working",
          "position" => 0,
          "reps" => "10",
          "completed" => true
        })

      conn = delete(conn, "/v1/coach/performed_sets/#{set.id}")
      assert json_response(conn, 404)
    end
  end
end
