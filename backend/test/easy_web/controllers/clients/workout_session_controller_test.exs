defmodule EasyWeb.Clients.WorkoutSessionControllerTest do
  use Easy.ConnCase

  alias Easy.Training.WorkoutSession

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
      assert data["planned_workout_id"] == nil
      assert data["planned_snapshot"] == nil
      assert data["started_at"] != nil
    end

    test "starts a planned workout with snapshot", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-03-31]
        )

      workout = insert(:planned_workout, training_plan: plan, business: ctx.business)
      exercise = insert(:exercise, business: ctx.business)

      _element =
        insert(:workout_element,
          planned_workout: workout,
          exercise: exercise,
          business: ctx.business,
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
        post(ctx.conn, "/v1/client/workout_sessions", %{
          "planned_workout_id" => workout.id
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["state"] == "active"
      assert data["planned_workout_id"] == workout.id
      assert data["planned_snapshot"] != nil

      snapshot = data["planned_snapshot"]
      assert snapshot["workout_name"] == workout.name
      assert [element_snap] = snapshot["elements"]
      assert element_snap["exercise_name"] == exercise.name
      assert [set_snap] = element_snap["planned_sets"]
      assert set_snap["target_reps"] == "8-10"
    end

    test "rejects creating session when active session exists", ctx do
      {:ok, _session} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})

      conn = post(ctx.conn, "/v1/client/workout_sessions", %{})
      assert %{"error_code" => "invalid_input"} = json_response(conn, 422)
    end

    test "rejects unauthenticated request", _ctx do
      conn = build_conn() |> post("/v1/client/workout_sessions", %{})
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/client/workout_sessions" do
    test "lists only this client's sessions", ctx do
      {:ok, _session} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})

      # Other client's session
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      {:ok, _other} = WorkoutSession.create(ctx.business.id, other_client.id, %{})

      conn = get(ctx.conn, "/v1/client/workout_sessions")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
    end

    test "filters by state", ctx do
      {:ok, session} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})
      {:ok, _completed} = WorkoutSession.complete(session)

      {:ok, _active} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})

      conn = get(ctx.conn, "/v1/client/workout_sessions", %{"state" => "completed"})
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert hd(data)["state"] == "completed"
    end

    test "paginates results", ctx do
      for _ <- 1..3 do
        {:ok, session} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})
        WorkoutSession.complete(session)
      end

      conn = get(ctx.conn, "/v1/client/workout_sessions", %{"offset" => "0", "limit" => "2"})
      assert %{"data" => data, "count" => 3} = json_response(conn, 200)
      assert length(data) == 2
    end
  end

  describe "GET /v1/client/workout_sessions/:id" do
    test "shows session with performed sets", ctx do
      {:ok, session} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})

      conn = get(ctx.conn, "/v1/client/workout_sessions/#{session.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == session.id
      assert is_list(data["performed_sets"])
    end

    test "returns 404 for another client's session", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      {:ok, other_session} = WorkoutSession.create(ctx.business.id, other_client.id, %{})

      conn = get(ctx.conn, "/v1/client/workout_sessions/#{other_session.id}")
      assert json_response(conn, 404)
    end

    test "does not expose business_id or client_id", ctx do
      {:ok, session} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})

      conn = get(ctx.conn, "/v1/client/workout_sessions/#{session.id}")
      assert %{"data" => data} = json_response(conn, 200)
      refute Map.has_key?(data, "business_id")
      refute Map.has_key?(data, "client_id")
    end
  end

  describe "GET /v1/client/workout_sessions/active" do
    test "returns active session", ctx do
      {:ok, session} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})

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
      {:ok, session} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})

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
      {:ok, session} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})

      conn = post(ctx.conn, "/v1/client/workout_sessions/#{session.id}/complete", %{})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["state"] == "completed"
      assert data["ended_at"] != nil
    end

    test "returns 404 for another client's session", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      {:ok, other_session} = WorkoutSession.create(ctx.business.id, other_client.id, %{})

      conn = post(ctx.conn, "/v1/client/workout_sessions/#{other_session.id}/complete", %{})
      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/client/workout_sessions/:id/discard" do
    test "discards session", ctx do
      {:ok, session} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})

      conn = post(ctx.conn, "/v1/client/workout_sessions/#{session.id}/discard")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["state"] == "discarded"
    end
  end

  describe "PATCH /v1/client/workout_sessions/:id" do
    test "updates notes and soreness_rating", ctx do
      {:ok, session} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})

      conn =
        patch(ctx.conn, "/v1/client/workout_sessions/#{session.id}", %{
          "notes" => "Felt tired",
          "soreness_rating" => 3
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["notes"] == "Felt tired"
      assert data["soreness_rating"] == 3
    end

    test "returns 404 for another client's session", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      {:ok, other_session} = WorkoutSession.create(ctx.business.id, other_client.id, %{})

      conn = patch(ctx.conn, "/v1/client/workout_sessions/#{other_session.id}", %{"notes" => "x"})
      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/client/workout_sessions/:id/complete - mood and summary" do
    test "accepts mood field on complete", ctx do
      {:ok, session} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})

      conn =
        post(ctx.conn, "/v1/client/workout_sessions/#{session.id}/complete", %{
          "mood" => "strong",
          "notes" => "Bench felt amazing today"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["state"] == "completed"
      assert data["mood"] == "strong"
      assert data["notes"] == "Bench felt amazing today"
    end

    test "returns summary with duration, sets_count, total_volume_kg on complete", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-12-31]
        )

      workout = insert(:planned_workout, training_plan: plan, business: ctx.business)
      exercise = insert(:exercise, business: ctx.business)

      insert(:workout_element,
        planned_workout: workout,
        exercise: exercise,
        business: ctx.business,
        planned_sets: []
      )

      {:ok, session} =
        WorkoutSession.create(ctx.business.id, ctx.client.id, %{
          "planned_workout_id" => workout.id
        })

      # Log 2 sets: 10x80kg + 8x80kg = 1440 kg total
      {:ok, _} =
        Easy.Training.PerformedSet.create(session.id, ctx.business.id, %{
          "position" => 0,
          "exercise_id" => exercise.id,
          "actual_reps" => "10",
          "load_value" => "80.0",
          "load_unit" => "kg"
        })

      {:ok, _} =
        Easy.Training.PerformedSet.create(session.id, ctx.business.id, %{
          "position" => 1,
          "exercise_id" => exercise.id,
          "actual_reps" => "8",
          "load_value" => "80.0",
          "load_unit" => "kg"
        })

      conn =
        post(ctx.conn, "/v1/client/workout_sessions/#{session.id}/complete", %{
          "mood" => "solid"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["mood"] == "solid"

      summary = data["summary"]
      assert summary != nil
      assert summary["sets_count"] == 2
      assert summary["total_volume_kg"] == 1440.0
      assert summary["duration_minutes"] >= 0
      assert summary["prs"] == []
    end

    test "summary includes volume_delta_kg vs previous session of same workout", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-12-31]
        )

      workout = insert(:planned_workout, training_plan: plan, business: ctx.business)
      exercise = insert(:exercise, business: ctx.business)

      insert(:workout_element,
        planned_workout: workout,
        exercise: exercise,
        business: ctx.business,
        planned_sets: []
      )

      # Previous session: 10x70kg = 700 kg
      {:ok, prev} =
        WorkoutSession.create(ctx.business.id, ctx.client.id, %{
          "planned_workout_id" => workout.id
        })

      {:ok, _} =
        Easy.Training.PerformedSet.create(prev.id, ctx.business.id, %{
          "position" => 0,
          "exercise_id" => exercise.id,
          "actual_reps" => "10",
          "load_value" => "70.0",
          "load_unit" => "kg"
        })

      {:ok, _} = WorkoutSession.complete(prev)

      # Current session: 10x80kg = 800 kg (delta = +100)
      {:ok, current} =
        WorkoutSession.create(ctx.business.id, ctx.client.id, %{
          "planned_workout_id" => workout.id
        })

      {:ok, _} =
        Easy.Training.PerformedSet.create(current.id, ctx.business.id, %{
          "position" => 0,
          "exercise_id" => exercise.id,
          "actual_reps" => "10",
          "load_value" => "80.0",
          "load_unit" => "kg"
        })

      conn =
        post(ctx.conn, "/v1/client/workout_sessions/#{current.id}/complete", %{})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["summary"]["volume_delta_kg"] == 100.0
    end

    test "volume_delta_kg is null for freestyle sessions", ctx do
      {:ok, session} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})
      exercise = insert(:exercise, business: ctx.business)

      {:ok, _} =
        Easy.Training.PerformedSet.create(session.id, ctx.business.id, %{
          "position" => 0,
          "exercise_id" => exercise.id,
          "actual_reps" => "10",
          "load_value" => "60.0",
          "load_unit" => "kg"
        })

      conn = post(ctx.conn, "/v1/client/workout_sessions/#{session.id}/complete", %{})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["summary"]["volume_delta_kg"] == nil
      assert data["summary"]["total_volume_kg"] == 600.0
    end

    test "summary is not present on non-complete actions", ctx do
      {:ok, session} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})

      conn = get(ctx.conn, "/v1/client/workout_sessions/#{session.id}")
      assert %{"data" => data} = json_response(conn, 200)
      refute Map.has_key?(data, "summary")
    end

    test "mood is exposed on show (after being set on complete)", ctx do
      {:ok, session} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})

      post(ctx.conn, "/v1/client/workout_sessions/#{session.id}/complete", %{
        "mood" => "tough"
      })

      conn = get(ctx.conn, "/v1/client/workout_sessions/#{session.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["mood"] == "tough"
    end
  end

  describe "last_performed_by_element on workout session show" do
    test "empty when session has no planned_snapshot", ctx do
      {:ok, session} = WorkoutSession.create(ctx.business.id, ctx.client.id, %{})

      conn = get(ctx.conn, "/v1/client/workout_sessions/#{session.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["last_performed_by_element"] == %{}
    end

    test "returns per-element history when client has prior element session", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-12-31]
        )

      workout = insert(:planned_workout, training_plan: plan, business: ctx.business)
      exercise = insert(:exercise, business: ctx.business, name: "Bench Press")

      element =
        insert(:workout_element,
          planned_workout: workout,
          exercise: exercise,
          business: ctx.business,
          planned_sets: [
            %{set_type: :working, target_reps: "8-10", load_value: 80, load_unit: :kg}
          ]
        )

      # Previous completed session of this element
      {:ok, prev_session} =
        WorkoutSession.create(ctx.business.id, ctx.client.id, %{
          "planned_workout_id" => workout.id
        })

      {:ok, _} =
        Easy.Training.PerformedSet.create(prev_session.id, ctx.business.id, %{
          "position" => 0,
          "exercise_id" => exercise.id,
          "workout_element_id" => element.id,
          "actual_reps" => "9",
          "load_value" => "80.0",
          "load_unit" => "kg"
        })

      {:ok, _} = WorkoutSession.complete(prev_session)

      # Start a new session of the same workout
      {:ok, current} =
        WorkoutSession.create(ctx.business.id, ctx.client.id, %{
          "planned_workout_id" => workout.id
        })

      conn = get(ctx.conn, "/v1/client/workout_sessions/#{current.id}")
      assert %{"data" => data} = json_response(conn, 200)

      by_element = data["last_performed_by_element"]
      assert is_map(by_element)
      assert entry = by_element[element.id]
      assert entry["source"] == "element"
      assert entry["session_id"] == prev_session.id
      assert entry["exercise_id"] == exercise.id
      assert [set] = entry["sets"]
      assert set["actual_reps"] == "9"
      assert set["load_value"] == "80.0"
      assert set["load_unit"] == "kg"
    end

    test "falls back to per-exercise history when element has no history", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-12-31]
        )

      exercise = insert(:exercise, business: ctx.business, name: "Bench Press")

      # Old workout with this exercise (completed in a prior plan)
      old_workout = insert(:planned_workout, training_plan: plan, business: ctx.business)

      _old_element =
        insert(:workout_element,
          planned_workout: old_workout,
          exercise: exercise,
          business: ctx.business,
          planned_sets: []
        )

      {:ok, old_session} =
        WorkoutSession.create(ctx.business.id, ctx.client.id, %{
          "planned_workout_id" => old_workout.id
        })

      {:ok, _} =
        Easy.Training.PerformedSet.create(old_session.id, ctx.business.id, %{
          "position" => 0,
          "exercise_id" => exercise.id,
          "actual_reps" => "8",
          "load_value" => "70.0",
          "load_unit" => "kg"
        })

      {:ok, _} = WorkoutSession.complete(old_session)

      # New workout (coach edited the plan -> new element_id) with same exercise
      new_workout =
        insert(:planned_workout,
          training_plan: plan,
          business: ctx.business,
          day_number: 2
        )

      new_element =
        insert(:workout_element,
          planned_workout: new_workout,
          exercise: exercise,
          business: ctx.business,
          planned_sets: []
        )

      {:ok, current} =
        WorkoutSession.create(ctx.business.id, ctx.client.id, %{
          "planned_workout_id" => new_workout.id
        })

      conn = get(ctx.conn, "/v1/client/workout_sessions/#{current.id}")
      assert %{"data" => data} = json_response(conn, 200)

      entry = data["last_performed_by_element"][new_element.id]
      assert entry["source"] == "exercise"
      assert entry["session_id"] == old_session.id
      assert [set] = entry["sets"]
      assert set["actual_reps"] == "8"
    end

    test "excludes the current session's own performed sets from lookup", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-12-31]
        )

      workout = insert(:planned_workout, training_plan: plan, business: ctx.business)
      exercise = insert(:exercise, business: ctx.business)

      element =
        insert(:workout_element,
          planned_workout: workout,
          exercise: exercise,
          business: ctx.business,
          planned_sets: []
        )

      {:ok, current} =
        WorkoutSession.create(ctx.business.id, ctx.client.id, %{
          "planned_workout_id" => workout.id
        })

      # Log a set in the CURRENT session — this must not appear as "last time"
      {:ok, _} =
        Easy.Training.PerformedSet.create(current.id, ctx.business.id, %{
          "position" => 0,
          "exercise_id" => exercise.id,
          "workout_element_id" => element.id,
          "actual_reps" => "5",
          "load_value" => "100.0",
          "load_unit" => "kg"
        })

      conn = get(ctx.conn, "/v1/client/workout_sessions/#{current.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["last_performed_by_element"] == %{}
    end

    test "ignores discarded sessions", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-12-31]
        )

      workout = insert(:planned_workout, training_plan: plan, business: ctx.business)
      exercise = insert(:exercise, business: ctx.business)

      element =
        insert(:workout_element,
          planned_workout: workout,
          exercise: exercise,
          business: ctx.business,
          planned_sets: []
        )

      {:ok, old} =
        WorkoutSession.create(ctx.business.id, ctx.client.id, %{
          "planned_workout_id" => workout.id
        })

      {:ok, _} =
        Easy.Training.PerformedSet.create(old.id, ctx.business.id, %{
          "position" => 0,
          "exercise_id" => exercise.id,
          "workout_element_id" => element.id,
          "actual_reps" => "9",
          "load_value" => "80.0",
          "load_unit" => "kg"
        })

      {:ok, _} = WorkoutSession.discard(old)

      {:ok, current} =
        WorkoutSession.create(ctx.business.id, ctx.client.id, %{
          "planned_workout_id" => workout.id
        })

      conn = get(ctx.conn, "/v1/client/workout_sessions/#{current.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["last_performed_by_element"] == %{}
    end

    test "does not leak history from another client in the same business", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-12-31]
        )

      workout = insert(:planned_workout, training_plan: plan, business: ctx.business)
      exercise = insert(:exercise, business: ctx.business)

      element =
        insert(:workout_element,
          planned_workout: workout,
          exercise: exercise,
          business: ctx.business,
          planned_sets: []
        )

      # Another client's completed session on the same element
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      {:ok, other_session} =
        WorkoutSession.create(ctx.business.id, other_client.id, %{
          "planned_workout_id" => workout.id
        })

      {:ok, _} =
        Easy.Training.PerformedSet.create(other_session.id, ctx.business.id, %{
          "position" => 0,
          "exercise_id" => exercise.id,
          "workout_element_id" => element.id,
          "actual_reps" => "9",
          "load_value" => "80.0",
          "load_unit" => "kg"
        })

      {:ok, _} = WorkoutSession.complete(other_session)

      {:ok, current} =
        WorkoutSession.create(ctx.business.id, ctx.client.id, %{
          "planned_workout_id" => workout.id
        })

      conn = get(ctx.conn, "/v1/client/workout_sessions/#{current.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["last_performed_by_element"] == %{}
    end
  end
end
