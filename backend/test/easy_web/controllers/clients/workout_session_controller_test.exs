defmodule EasyWeb.Clients.WorkoutSessionControllerTest do
  use Easy.ConnCase

  alias Easy.Sessions

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_client(client)

    %{conn: conn, coach: coach, client: client, business: coach.business}
  end

  describe "POST /v1/client/workout_sessions" do
    test "starts a freestyle workout (no plan)", ctx do
      conn = post(ctx.conn, "/v1/client/workout_sessions", %{})
      assert %{"data" => data} = json_response(conn, 201)
      assert data["state"] == "active"
      assert data["training_workout_id"] == nil
      assert data["planned_snapshot"] == nil
      assert data["started_at"] != nil
    end

    test "starts a planned workout with snapshot", ctx do
      plan =
        insert(:training_plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: Date.add(Date.utc_today(), -1),
          end_date: Date.add(Date.utc_today(), 30)
        )

      workout = insert(:workout, plan: plan, creator: ctx.coach, business: ctx.business)
      exercise = insert(:exercise, business: ctx.business)

      _element =
        insert(:workout_element,
          workout: workout,
          exercise: exercise,
          business: ctx.business,
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

      conn =
        post(ctx.conn, "/v1/client/workout_sessions", %{
          "training_workout_id" => workout.id
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["state"] == "active"
      assert data["training_workout_id"] == workout.id
      assert data["planned_snapshot"] != nil

      snapshot = data["planned_snapshot"]
      assert [exercise_snap] = snapshot["exercises"]
      assert exercise_snap["name"] == exercise.name
      assert [set_snap] = exercise_snap["sets"]
      assert set_snap["reps"] == "8-10"
      assert set_snap["set_type"] == "working"
    end

    test "rejects another client's assigned workout", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      other_plan =
        insert(:training_plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: other_client.id,
          start_date: Date.add(Date.utc_today(), -1),
          end_date: Date.add(Date.utc_today(), 30)
        )

      workout = insert(:workout, plan: other_plan, creator: ctx.coach, business: ctx.business)

      conn =
        post(ctx.conn, "/v1/client/workout_sessions", %{
          "training_workout_id" => workout.id
        })

      assert json_response(conn, 404)
    end

    test "rejects template workout", ctx do
      plan = insert(:training_plan, creator: ctx.coach, business: ctx.business)
      workout = insert(:workout, plan: plan, creator: ctx.coach, business: ctx.business)

      conn =
        post(ctx.conn, "/v1/client/workout_sessions", %{
          "training_workout_id" => workout.id
        })

      assert json_response(conn, 404)
    end

    test "rejects creating session when active session exists", ctx do
      {:ok, _session} = Sessions.create_workout_session(ctx.business.id, ctx.client.id, %{})

      conn = post(ctx.conn, "/v1/client/workout_sessions", %{})
      assert %{"error_code" => "invalid_input"} = json_response(conn, 422)
    end

    test "rejects unauthenticated request", _ctx do
      conn = build_conn() |> post("/v1/client/workout_sessions", %{})
      assert json_response(conn, 403)
    end

    test "snapshot captures name of a system exercise (source: system, business: nil)", ctx do
      plan =
        insert(:training_plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: Date.add(Date.utc_today(), -1),
          end_date: Date.add(Date.utc_today(), 30)
        )

      workout = insert(:workout, plan: plan, creator: ctx.coach, business: ctx.business)

      system_exercise =
        insert(:exercise, source: "system", business: nil, name: "System Squat")

      _element =
        insert(:workout_element,
          workout: workout,
          exercise: system_exercise,
          business: ctx.business,
          planned_sets: [
            %{
              set_type: "working",
              reps: "5",
              load_value: 100,
              load_unit: "kg",
              rpe: 9,
              rest_seconds: 180
            }
          ]
        )

      conn =
        post(ctx.conn, "/v1/client/workout_sessions", %{
          "training_workout_id" => workout.id
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["planned_snapshot"] != nil

      [exercise_snap] = data["planned_snapshot"]["exercises"]
      assert exercise_snap["name"] == "System Squat"
      assert [set_snap] = exercise_snap["sets"]
      assert set_snap["reps"] == "5"
      assert set_snap["set_type"] == "working"
    end
  end

  describe "GET /v1/client/workout_sessions" do
    test "lists only this client's sessions", ctx do
      {:ok, _session} = Sessions.create_workout_session(ctx.business.id, ctx.client.id, %{})

      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      {:ok, _other} = Sessions.create_workout_session(ctx.business.id, other_client.id, %{})

      conn = get(ctx.conn, "/v1/client/workout_sessions")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
    end

    test "filters by state", ctx do
      {:ok, session} = Sessions.create_workout_session(ctx.business.id, ctx.client.id, %{})
      {:ok, _completed} = Sessions.complete_workout_session(session)

      {:ok, _active} = Sessions.create_workout_session(ctx.business.id, ctx.client.id, %{})

      conn = get(ctx.conn, "/v1/client/workout_sessions", %{"state" => "completed"})
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert hd(data)["state"] == "completed"
    end

    test "paginates results", ctx do
      for _ <- 1..3 do
        {:ok, session} = Sessions.create_workout_session(ctx.business.id, ctx.client.id, %{})
        Sessions.complete_workout_session(session)
      end

      conn = get(ctx.conn, "/v1/client/workout_sessions", %{"offset" => "0", "limit" => "2"})
      assert %{"data" => data, "count" => 3} = json_response(conn, 200)
      assert length(data) == 2
    end
  end

  describe "GET /v1/client/workout_sessions/:id" do
    test "shows session with performed sets", ctx do
      {:ok, session} = Sessions.create_workout_session(ctx.business.id, ctx.client.id, %{})

      conn = get(ctx.conn, "/v1/client/workout_sessions/#{session.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == session.id
      assert is_list(data["performed_sets"])
    end

    test "returns 404 for another client's session", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      {:ok, other_session} =
        Sessions.create_workout_session(ctx.business.id, other_client.id, %{})

      conn = get(ctx.conn, "/v1/client/workout_sessions/#{other_session.id}")
      assert json_response(conn, 404)
    end

    test "does not expose business_id or client_id", ctx do
      {:ok, session} = Sessions.create_workout_session(ctx.business.id, ctx.client.id, %{})

      conn = get(ctx.conn, "/v1/client/workout_sessions/#{session.id}")
      assert %{"data" => data} = json_response(conn, 200)
      refute Map.has_key?(data, "business_id")
      refute Map.has_key?(data, "client_id")
    end
  end

  describe "GET /v1/client/workout_sessions/active" do
    test "returns active session", ctx do
      {:ok, session} = Sessions.create_workout_session(ctx.business.id, ctx.client.id, %{})

      conn = get(ctx.conn, "/v1/client/workout_sessions/active")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == session.id
      assert data["state"] == "active"
    end

    test "returns 404 when no active session", ctx do
      conn = get(ctx.conn, "/v1/client/workout_sessions/active")
      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/client/workout_sessions/:id/complete" do
    test "completes session with optional rating and notes", ctx do
      {:ok, session} = Sessions.create_workout_session(ctx.business.id, ctx.client.id, %{})

      conn =
        post(ctx.conn, "/v1/client/workout_sessions/#{session.id}/complete", %{
          "soreness_rating" => 4,
          "notes" => "Great session!"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["state"] == "completed"
      assert data["ended_at"] != nil
      assert data["soreness_rating"] == 4
      assert data["notes"] == "Great session!"
    end

    test "completes session without optional fields", ctx do
      {:ok, session} = Sessions.create_workout_session(ctx.business.id, ctx.client.id, %{})

      conn = post(ctx.conn, "/v1/client/workout_sessions/#{session.id}/complete", %{})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["state"] == "completed"
      assert data["ended_at"] != nil
    end

    test "returns 404 for another client's session", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      {:ok, other_session} =
        Sessions.create_workout_session(ctx.business.id, other_client.id, %{})

      conn = post(ctx.conn, "/v1/client/workout_sessions/#{other_session.id}/complete", %{})
      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/client/workout_sessions/:id/discard" do
    test "discards session", ctx do
      {:ok, session} = Sessions.create_workout_session(ctx.business.id, ctx.client.id, %{})

      conn = post(ctx.conn, "/v1/client/workout_sessions/#{session.id}/discard")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["state"] == "discarded"
    end
  end

  describe "PATCH /v1/client/workout_sessions/:id" do
    test "updates notes and soreness_rating", ctx do
      {:ok, session} = Sessions.create_workout_session(ctx.business.id, ctx.client.id, %{})

      conn =
        patch(ctx.conn, "/v1/client/workout_sessions/#{session.id}", %{
          "notes" => "Felt tired",
          "soreness_rating" => 3
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["notes"] == "Felt tired"
      assert data["soreness_rating"] == 3
    end

    test "does not allow state or workout retargeting", ctx do
      {:ok, session} = Sessions.create_workout_session(ctx.business.id, ctx.client.id, %{})

      plan =
        insert(:training_plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: Date.add(Date.utc_today(), -1),
          end_date: Date.add(Date.utc_today(), 30)
        )

      workout = insert(:workout, plan: plan, creator: ctx.coach, business: ctx.business)

      conn =
        patch(ctx.conn, "/v1/client/workout_sessions/#{session.id}", %{
          "state" => "completed",
          "training_workout_id" => workout.id,
          "notes" => "Still active"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["state"] == "active"
      assert data["training_workout_id"] == nil
      assert data["notes"] == "Still active"
    end

    test "returns 404 for another client's session", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      {:ok, other_session} =
        Sessions.create_workout_session(ctx.business.id, other_client.id, %{})

      conn = patch(ctx.conn, "/v1/client/workout_sessions/#{other_session.id}", %{"notes" => "x"})
      assert json_response(conn, 404)
    end
  end
end
