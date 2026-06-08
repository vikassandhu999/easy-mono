defmodule EasyWeb.Coaches.WorkoutSessionControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/workout_sessions" do
    test "creates session without plan", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)

      conn =
        post(conn, "/v1/coach/workout_sessions", %{"client_id" => client.id, "notes" => "Start"})

      assert %{"data" => data} = json_response(conn, 201)

      assert data["client_id"] == client.id
      assert data["state"] == "active"
      assert is_nil(data["planned_snapshot"])
      assert is_nil(data["workout_id"])
    end

    test "creates session with workout and builds snapshot", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, creator: coach, business: business)
      plan = insert(:training_plan, author: coach, business: business)

      workout =
        insert(:workout, training_plan: plan, business: business, name: "Push Day")

      exercise = insert(:exercise, business: business, name: "Bench Press")

      element =
        insert(:workout_element,
          workout: workout,
          exercise: exercise,
          business: business,
          position: 0,
          planned_sets: [
            %{
              target_reps: "8-10",
              load_value: 80,
              load_unit: :kg,
              rest_seconds: 120
            }
          ]
        )

      conn =
        post(conn, "/v1/coach/workout_sessions", %{
          "client_id" => client.id,
          "workout_id" => workout.id
        })

      assert %{"data" => data} = json_response(conn, 201)

      assert data["workout_id"] == workout.id

      assert %{"workout_name" => "Push Day", "elements" => elements} =
               data["planned_snapshot"]

      assert length(elements) == 1

      [snap_element] = elements
      assert snap_element["element_id"] == element.id
      assert snap_element["exercise_name"] == "Bench Press"
      assert snap_element["exercise_id"] == exercise.id
      assert length(snap_element["planned_sets"]) == 1

      [snap_set] = snap_element["planned_sets"]
      assert snap_set["target_reps"] == "8-10"
      assert snap_set["load_value"] == "80"
      assert snap_set["load_unit"] == "kg"
      assert snap_set["rest_seconds"] == 120
    end

    test "returns 404 when workout belongs to another business", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, creator: coach, business: business)

      other = insert(:coach)
      other_plan = insert(:training_plan, author: other, business: other.business)

      other_workout = insert(:workout, training_plan: other_plan, business: other.business)

      conn =
        post(conn, "/v1/coach/workout_sessions", %{
          "client_id" => client.id,
          "workout_id" => other_workout.id,
          "notes" => "Start"
        })

      assert json_response(conn, 404)
    end

    test "rejects creating session when client already has an active session", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, creator: coach, business: business)
      insert(:workout_session, client: client, business: business, state: :active)

      conn =
        post(conn, "/v1/coach/workout_sessions", %{
          "client_id" => client.id,
          "notes" => "Start"
        })

      assert %{"error_code" => "invalid_input"} = json_response(conn, 422)
    end
  end

  describe "GET /v1/coach/workout_sessions" do
    test "lists sessions", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)
      insert(:workout_session, client: client, business: business)

      conn = get(conn, "/v1/coach/workout_sessions")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
    end
  end

  describe "GET /v1/coach/workout_sessions/:id" do
    test "shows session with performed sets", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)
      session = insert(:workout_session, client: client, business: business, state: :active)

      conn = get(conn, "/v1/coach/workout_sessions/#{session.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == session.id
      assert is_list(data["performed_sets"])
    end

    test "returns 404 for session in another business", %{conn: conn} do
      other = insert(:coach)
      other_client = insert(:client, creator: other, business: other.business)
      session = insert(:workout_session, client: other_client, business: other.business)

      conn = get(conn, "/v1/coach/workout_sessions/#{session.id}")
      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/coach/workout_sessions/:id/complete" do
    test "completes session", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)
      session = insert(:workout_session, client: client, business: business, state: :active)

      conn = post(conn, "/v1/coach/workout_sessions/#{session.id}/complete", %{"notes" => "Done"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["state"] == "completed"
      assert data["notes"] == "Done"
      assert not is_nil(data["ended_at"])
    end
  end

  describe "POST /v1/coach/workout_sessions/:id/discard" do
    test "discards session", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)
      session = insert(:workout_session, client: client, business: business, state: :active)

      conn = post(conn, "/v1/coach/workout_sessions/#{session.id}/discard")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["state"] == "discarded"
    end
  end

  describe "DELETE /v1/coach/workout_sessions/:id" do
    test "deletes session", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)
      session = insert(:workout_session, client: client, business: business)

      conn = delete(conn, "/v1/coach/workout_sessions/#{session.id}")
      assert response(conn, 204)
    end
  end
end
