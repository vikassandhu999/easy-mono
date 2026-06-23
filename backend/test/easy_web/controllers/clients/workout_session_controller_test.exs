defmodule EasyWeb.Clients.WorkoutSessionControllerTest do
  use Easy.ConnCase

  alias Easy.Sessions
  alias Easy.Ctx

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_client(client)

    ctx = %Ctx{user_id: client.user_id, business_id: coach.business_id}

    %{conn: conn, coach: coach, client: client, business: coach.business, ctx: ctx}
  end

  describe "POST /v1/client/training-sessions" do
    test "starts a freestyle workout (no plan)", ctx do
      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/client/training-sessions", Jason.encode!(%{}))

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
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/client/training-sessions", Jason.encode!(%{"training_workout_id" => workout.id}))

      assert %{"data" => data} = json_response(conn, 201)
      assert data["state"] == "active"
      assert data["training_workout_id"] == workout.id
      assert data["planned_snapshot"] != nil
    end

    test "rejects creating session when active session exists", ctx do
      insert(:workout_session, client: ctx.client, business: ctx.business, state: :active)

      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/client/training-sessions", Jason.encode!(%{}))

      assert %{"error_code" => "invalid_input"} = json_response(conn, 422)
    end

    test "rejects unauthenticated request", _ctx do
      conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> post("/v1/client/training-sessions", Jason.encode!(%{}))

      assert json_response(conn, 403)
    end

    test "snapshot captures name of a system exercise", ctx do
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
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/client/training-sessions", Jason.encode!(%{"training_workout_id" => workout.id}))

      assert %{"data" => data} = json_response(conn, 201)
      assert data["planned_snapshot"] != nil

      [exercise_snap] = data["planned_snapshot"]["exercises"]
      assert exercise_snap["name"] == "System Squat"
    end
  end

  describe "GET /v1/client/training-sessions" do
    test "lists only this client's sessions (no date filter)", ctx do
      insert(:workout_session, client: ctx.client, business: ctx.business)

      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      insert(:workout_session, client: other_client, business: ctx.business)

      conn = get(ctx.conn, "/v1/client/training-sessions")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
    end

    test "filters by date range", ctx do
      today = Date.utc_today()
      insert(:workout_session, client: ctx.client, business: ctx.business, date: today)
      insert(:workout_session,
        client: ctx.client,
        business: ctx.business,
        date: Date.add(today, -30),
        state: :completed
      )

      from = Date.add(today, -7)
      to = Date.add(today, 7)

      conn = get(ctx.conn, "/v1/client/training-sessions?from=#{from}&to=#{to}")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
    end
  end

  describe "GET /v1/client/training-sessions/:id" do
    test "shows session with performed sets", ctx do
      session = insert(:workout_session, client: ctx.client, business: ctx.business)

      conn = get(ctx.conn, "/v1/client/training-sessions/#{session.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == session.id
      assert is_list(data["performed_sets"])
    end

    test "returns 404 for another client's session", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      other_session = insert(:workout_session, client: other_client, business: ctx.business)

      conn = get(ctx.conn, "/v1/client/training-sessions/#{other_session.id}")
      assert json_response(conn, 404)
    end

    test "does not expose business_id or client_id", ctx do
      session = insert(:workout_session, client: ctx.client, business: ctx.business)

      conn = get(ctx.conn, "/v1/client/training-sessions/#{session.id}")
      assert %{"data" => data} = json_response(conn, 200)
      refute Map.has_key?(data, "business_id")
      refute Map.has_key?(data, "client_id")
    end
  end

  describe "PATCH /v1/client/training-sessions/:id" do
    test "completes session with state: completed", ctx do
      session = insert(:workout_session, client: ctx.client, business: ctx.business, state: :active)

      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> patch(
          "/v1/client/training-sessions/#{session.id}",
          Jason.encode!(%{"state" => "completed", "soreness_rating" => 4, "notes" => "Great!"})
        )

      assert %{"data" => data} = json_response(conn, 200)
      assert data["state"] == "completed"
      assert data["ended_at"] != nil
      assert data["soreness_rating"] == 4
      assert data["notes"] == "Great!"
    end

    test "discards session with state: discarded", ctx do
      session = insert(:workout_session, client: ctx.client, business: ctx.business, state: :active)

      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> patch(
          "/v1/client/training-sessions/#{session.id}",
          Jason.encode!(%{"state" => "discarded"})
        )

      assert %{"data" => data} = json_response(conn, 200)
      assert data["state"] == "discarded"
    end

    test "updates notes and soreness_rating without changing state", ctx do
      session = insert(:workout_session, client: ctx.client, business: ctx.business, state: :active)

      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> patch(
          "/v1/client/training-sessions/#{session.id}",
          Jason.encode!(%{"notes" => "Felt tired", "soreness_rating" => 3})
        )

      assert %{"data" => data} = json_response(conn, 200)
      assert data["notes"] == "Felt tired"
      assert data["soreness_rating"] == 3
      assert data["state"] == "active"
    end

    test "returns 404 for another client's session", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      other_session = insert(:workout_session, client: other_client, business: ctx.business)

      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> patch(
          "/v1/client/training-sessions/#{other_session.id}",
          Jason.encode!(%{"notes" => "x"})
        )

      assert json_response(conn, 404)
    end
  end
end
