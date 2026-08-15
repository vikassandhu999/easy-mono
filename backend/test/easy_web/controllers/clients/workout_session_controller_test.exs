defmodule EasyWeb.Clients.WorkoutSessionControllerTest do
  use Easy.ConnCase

  import OpenApiSpex.TestAssertions

  alias Easy.Ctx

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_client(client)

    ctx = %Ctx{user_id: client.user_id, business_id: coach.business_id, client_id: client.id}

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
      assert data["source_workout_id"] == nil
      assert data["prescription_snapshot"] == nil
      assert data["started_at"] != nil
    end

    test "starts a planned workout from an open-ended plan with snapshot", ctx do
      plan =
        insert(:training_plan,
          kind: :client_plan,
          creator: ctx.coach.user,
          business: ctx.business,
          client: ctx.client,
          start_date: Date.utc_today(),
          end_date: nil
        )

      workout = insert(:workout, plan: plan, business: ctx.business)
      exercise = insert(:exercise, business: ctx.business)

      _element =
        insert(:workout_element,
          workout: workout,
          exercise: exercise,
          business: ctx.business,
          prescribed_sets: [
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
      assert data["source_workout_id"] == workout.id
      assert data["prescription_snapshot"] != nil
    end

    test "rejects creating session when active session exists", ctx do
      insert(:workout_session, client: ctx.client, business: ctx.business, state: :active)

      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/client/training-sessions", Jason.encode!(%{}))

      assert %{"error_code" => "conflict"} = json_response(conn, 409)
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
          kind: :client_plan,
          creator: ctx.coach.user,
          business: ctx.business,
          client: ctx.client,
          start_date: Date.add(Date.utc_today(), -1),
          end_date: Date.add(Date.utc_today(), 30)
        )

      workout = insert(:workout, plan: plan, business: ctx.business)

      system_exercise =
        insert(:exercise, source: "system", business: nil, name: "System Squat")

      _element =
        insert(:workout_element,
          workout: workout,
          exercise: system_exercise,
          business: ctx.business,
          prescribed_sets: [
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
      assert data["prescription_snapshot"] != nil

      [exercise_snap] = data["prescription_snapshot"]["workout"]["exercises"]
      assert exercise_snap["exercise_name"] == "System Squat"
    end
  end

  describe "GET /v1/client/training-sessions" do
    test "resolves client identity once with a query count independent of session count", ctx do
      insert(:workout_session, client: ctx.client, business: ctx.business)

      {_conn, one_session_queries} =
        capture_queries(fn -> get(ctx.conn, "/v1/client/training-sessions") end)

      insert(:workout_session,
        client: ctx.client,
        business: ctx.business,
        state: :completed
      )

      {_conn, two_session_queries} =
        capture_queries(fn ->
          build_conn()
          |> authenticate_client(ctx.client)
          |> get("/v1/client/training-sessions")
        end)

      assert length(two_session_queries) == length(one_session_queries)
      assert Enum.count(one_session_queries, &client_identity_query?/1) == 1
      assert Enum.count(two_session_queries, &client_identity_query?/1) == 1
    end

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

    test "from-only filter returns sessions on/after from date", ctx do
      today = Date.utc_today()
      recent = Date.add(today, -5)
      old = Date.add(today, -40)

      insert(:workout_session, client: ctx.client, business: ctx.business, date: recent, state: :completed)
      insert(:workout_session, client: ctx.client, business: ctx.business, date: old, state: :completed)

      from = Date.add(today, -10)
      conn = get(ctx.conn, "/v1/client/training-sessions?from=#{from}")
      assert %{"data" => data, "count" => count} = json_response(conn, 200)
      assert count == 1
      assert length(data) == 1
    end

    test "to-only filter returns sessions on/before to date", ctx do
      today = Date.utc_today()
      recent = Date.add(today, -5)
      old = Date.add(today, -40)

      insert(:workout_session, client: ctx.client, business: ctx.business, date: recent, state: :completed)
      insert(:workout_session, client: ctx.client, business: ctx.business, date: old, state: :completed)

      to = Date.add(today, -20)
      conn = get(ctx.conn, "/v1/client/training-sessions?to=#{to}")
      assert %{"data" => data, "count" => count} = json_response(conn, 200)
      assert count == 1
      assert length(data) == 1
    end

    test "rejects malformed and reversed date filters", ctx do
      malformed = get(ctx.conn, "/v1/client/training-sessions?from=not-a-date")
      assert json_response(malformed, 422)

      reversed = get(ctx.conn, "/v1/client/training-sessions?from=2026-08-10&to=2026-08-01")
      assert json_response(reversed, 422)
    end

    test "paginates with offset/limit while count stays the total", ctx do
      today = Date.utc_today()

      for day <- 0..24 do
        insert(:workout_session,
          client: ctx.client,
          business: ctx.business,
          state: :completed,
          date: Date.add(today, -day),
          started_at: DateTime.add(DateTime.utc_now(:second), -day, :day)
        )
      end

      conn = get(ctx.conn, "/v1/client/training-sessions")
      assert %{"data" => page, "count" => 25} = json_response(conn, 200)
      assert length(page) == 20

      conn = get(ctx.conn, "/v1/client/training-sessions?offset=20&limit=100")
      assert %{"data" => rest, "count" => 25} = json_response(conn, 200)
      assert length(rest) == 5
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
      assert data["closed_at"] == nil
    end

    test "rejects notes on a terminal Training Session", ctx do
      session = insert(:workout_session, client: ctx.client, business: ctx.business, state: :completed)

      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> patch(
          "/v1/client/training-sessions/#{session.id}",
          Jason.encode!(%{"notes" => "Rewrite history"})
        )

      assert %{"error_code" => "conflict"} = json_response(conn, 409)
    end

    test "rejects generic state mutation", ctx do
      session = insert(:workout_session, client: ctx.client, business: ctx.business, state: :active)

      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> patch(
          "/v1/client/training-sessions/#{session.id}",
          Jason.encode!(%{"state" => "completed"})
        )

      assert json_response(conn, 422)
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

  describe "POST /v1/client/training-sessions/:id/complete" do
    test "completes an active Training Session with server closing time", ctx do
      session = insert(:workout_session, client: ctx.client, business: ctx.business, state: :active)

      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> post(
          "/v1/client/training-sessions/#{session.id}/complete",
          Jason.encode!(%{"soreness_rating" => 4, "notes" => "Great!"})
        )

      assert %{"data" => data} = response = json_response(conn, 200)
      assert_schema(response, "TrainingSessionResponse", EasyWeb.ApiSpec.spec())
      assert data["state"] == "completed"
      assert data["closed_at"] != nil
      refute Map.has_key?(data, "ended_at")
      assert data["soreness_rating"] == 4
      assert data["notes"] == "Great!"
    end

    test "completing a discarded Training Session conflicts", ctx do
      session = insert(:workout_session, client: ctx.client, business: ctx.business, state: :active)

      discarded = post(ctx.conn, "/v1/client/training-sessions/#{session.id}/discard")
      assert json_response(discarded, 200)

      completed =
        build_conn()
        |> authenticate_client(ctx.client)
        |> put_req_header("content-type", "application/json")
        |> post("/v1/client/training-sessions/#{session.id}/complete", Jason.encode!(%{}))

      assert %{"error_code" => "conflict"} = json_response(completed, 409)
    end

    test "repeating complete is idempotent", ctx do
      session = insert(:workout_session, client: ctx.client, business: ctx.business, state: :active)

      first =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/client/training-sessions/#{session.id}/complete", Jason.encode!(%{"notes" => "First"}))

      assert %{"data" => %{"closed_at" => closed_at, "notes" => "First"}} = json_response(first, 200)

      second =
        build_conn()
        |> authenticate_client(ctx.client)
        |> put_req_header("content-type", "application/json")
        |> post("/v1/client/training-sessions/#{session.id}/complete", Jason.encode!(%{"notes" => "Retry"}))

      assert %{"data" => data} = json_response(second, 200)
      assert data["state"] == "completed"
      assert data["notes"] == "First"
      assert data["closed_at"] == closed_at
    end
  end

  describe "POST /v1/client/training-sessions/:id/discard" do
    test "discards an active Training Session with server closing time", ctx do
      session = insert(:workout_session, client: ctx.client, business: ctx.business, state: :active)

      conn = post(ctx.conn, "/v1/client/training-sessions/#{session.id}/discard")
      assert %{"data" => data} = response = json_response(conn, 200)
      assert_schema(response, "TrainingSessionResponse", EasyWeb.ApiSpec.spec())
      assert data["state"] == "discarded"
      assert data["closed_at"] != nil
    end

    test "the opposite terminal command conflicts", ctx do
      session = insert(:workout_session, client: ctx.client, business: ctx.business, state: :active)

      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/client/training-sessions/#{session.id}/complete", Jason.encode!(%{}))

      assert json_response(conn, 200)

      discarded =
        build_conn()
        |> authenticate_client(ctx.client)
        |> post("/v1/client/training-sessions/#{session.id}/discard")

      assert %{"error_code" => "conflict"} = json_response(discarded, 409)
    end
  end

  defp client_identity_query?(query) do
    String.starts_with?(query, "SELECT") and String.contains?(query, ~s(FROM "clients"))
  end

  defp capture_queries(fun) do
    parent = self()
    handler_id = {__MODULE__, make_ref()}

    :telemetry.attach(
      handler_id,
      [:easy, :repo, :query],
      fn _event, _measurements, metadata, _config -> send(parent, {:query, metadata.query}) end,
      nil
    )

    try do
      {fun.(), received_queries()}
    after
      :telemetry.detach(handler_id)
    end
  end

  defp received_queries(queries \\ []) do
    receive do
      {:query, query} -> received_queries([query | queries])
    after
      0 -> Enum.reverse(queries)
    end
  end
end
