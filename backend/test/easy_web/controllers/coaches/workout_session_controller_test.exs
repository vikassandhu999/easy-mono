defmodule EasyWeb.Coaches.WorkoutSessionControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)
    client = insert(:client, creator: coach, business: coach.business)

    %{conn: conn, coach: coach, business: coach.business, client: client}
  end

  describe "GET /v1/coach/clients/:client_id/training-sessions" do
    test "rejects unknown query parameters", %{conn: conn, client: client} do
      conn = get(conn, "/v1/coach/clients/#{client.id}/training-sessions?unexpected=true")

      assert json_response(conn, 422)
    end

    test "lists sessions for a client", %{conn: conn, business: business, client: client} do
      insert(:workout_session, client: client, business: business, date: Date.utc_today())

      from = Date.add(Date.utc_today(), -7)
      to = Date.add(Date.utc_today(), 7)

      conn =
        get(conn, "/v1/coach/clients/#{client.id}/training-sessions?from=#{from}&to=#{to}")

      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
    end

    test "returns all sessions when no date range given", %{
      conn: conn,
      business: business,
      client: client
    } do
      insert(:workout_session, client: client, business: business)

      conn = get(conn, "/v1/coach/clients/#{client.id}/training-sessions")
      assert %{"data" => data} = json_response(conn, 200)
      assert length(data) == 1
    end

    test "paginates with offset/limit while count stays the total", %{conn: conn, business: business, client: client} do
      for day <- 0..24 do
        insert(:workout_session,
          client: client,
          business: business,
          state: :completed,
          date: Date.add(Date.utc_today(), -day),
          started_at: DateTime.add(DateTime.utc_now(:second), -day, :day)
        )
      end

      page = get(conn, "/v1/coach/clients/#{client.id}/training-sessions")
      assert %{"data" => data, "count" => 25, "next_cursor" => nil} = json_response(page, 200)
      assert length(data) == 20

      rest = get(conn, "/v1/coach/clients/#{client.id}/training-sessions?offset=20&limit=100")
      assert %{"data" => tail, "count" => 25, "next_cursor" => nil} = json_response(rest, 200)
      assert length(tail) == 5
    end

    test "pages filtered sessions by cursor", %{conn: conn, business: business, client: client} do
      search = "Frozen history #{Ecto.UUID.generate()}"
      snapshot = prescription_snapshot(search)

      sessions =
        for index <- 1..2 do
          insert(:workout_session,
            client: client,
            business: business,
            kind: :planned,
            state: :completed,
            date: Date.add(Date.utc_today(), -index),
            started_at: DateTime.add(DateTime.utc_now(:second), -index, :day),
            prescription_snapshot: snapshot,
            snapshot_version: 1,
            source_plan_id: Ecto.UUID.generate(),
            source_workout_id: Ecto.UUID.generate()
          )
        end

      insert(:workout_session,
        client: client,
        business: business,
        state: :active
      )

      params = %{
        "cursor" => "start",
        "limit" => "1",
        "state" => "completed",
        "search" => search,
        "from" => Date.add(Date.utc_today(), -7) |> Date.to_iso8601(),
        "to" => Date.utc_today() |> Date.to_iso8601()
      }

      assert %{"data" => [first], "count" => 2, "next_cursor" => cursor} =
               conn
               |> get("/v1/coach/clients/#{client.id}/training-sessions", params)
               |> json_response(200)

      assert is_binary(cursor)

      assert %{"data" => [second], "count" => 2, "next_cursor" => nil} =
               conn
               |> recycle()
               |> get("/v1/coach/clients/#{client.id}/training-sessions", %{params | "cursor" => cursor})
               |> json_response(200)

      assert Enum.sort([first["id"], second["id"]]) == Enum.sort(Enum.map(sessions, & &1.id))
    end

    test "bounds cursor pages and rejects malformed or incompatible cursor queries", %{
      conn: conn,
      business: business,
      client: client
    } do
      for index <- 1..101 do
        insert(:workout_session,
          client: client,
          business: business,
          state: :completed,
          started_at: DateTime.add(DateTime.utc_now(:second), -index, :second)
        )
      end

      assert %{"data" => sessions, "count" => 101, "next_cursor" => cursor} =
               conn
               |> get("/v1/coach/clients/#{client.id}/training-sessions", %{"cursor" => "start", "limit" => "1000"})
               |> json_response(200)

      assert length(sessions) == 100
      assert is_binary(cursor)

      for params <- [
            %{"cursor" => "not-a-cursor"},
            %{"cursor" => "start", "offset" => "1"},
            %{"cursor" => "start", "state" => "unknown"}
          ] do
        assert json_response(conn |> recycle() |> get("/v1/coach/clients/#{client.id}/training-sessions", params), 422)
      end
    end

    test "does not skip a row when a cursor anchor is deleted", %{conn: conn, business: business, client: client} do
      sessions =
        for index <- 1..2 do
          insert(:workout_session,
            client: client,
            business: business,
            state: :completed,
            started_at: DateTime.add(DateTime.utc_now(:second), -index, :second)
          )
        end

      assert %{"data" => [first], "next_cursor" => cursor} =
               conn
               |> get("/v1/coach/clients/#{client.id}/training-sessions", %{"cursor" => "start", "limit" => "1"})
               |> json_response(200)

      Easy.Repo.delete!(Easy.Repo.get!(Easy.Training.TrainingSession, first["id"]))

      assert %{"data" => [second], "count" => 1, "next_cursor" => nil} =
               conn
               |> recycle()
               |> get("/v1/coach/clients/#{client.id}/training-sessions", %{"cursor" => cursor, "limit" => "10"})
               |> json_response(200)

      assert Enum.sort([first["id"], second["id"]]) == Enum.sort(Enum.map(sessions, & &1.id))
    end

    test "does not list another trainer's client", %{conn: conn, business: business} do
      other_coach = insert(:coach, business: business)
      other_client = insert(:client, creator: other_coach, assigned_coach: other_coach, business: business)
      insert(:workout_session, client: other_client, business: business)

      assert conn
             |> get("/v1/coach/clients/#{other_client.id}/training-sessions")
             |> json_response(404)
    end

    test "returns empty list for client with no sessions", %{conn: conn, client: client} do
      conn = get(conn, "/v1/coach/clients/#{client.id}/training-sessions")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end

    test "does not expose sessions from another business", %{
      conn: conn,
      client: client
    } do
      other = insert(:coach)
      other_client = insert(:client, creator: other, business: other.business)
      insert(:workout_session, client: other_client, business: other.business)

      conn = get(conn, "/v1/coach/clients/#{client.id}/training-sessions")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end

    test "rejects malformed and reversed date filters", %{conn: conn, client: client} do
      malformed = get(conn, "/v1/coach/clients/#{client.id}/training-sessions?from=not-a-date")
      assert json_response(malformed, 422)

      reversed = get(conn, "/v1/coach/clients/#{client.id}/training-sessions?from=2026-08-10&to=2026-08-01")
      assert json_response(reversed, 422)
    end

    test "rejects malformed client and session ids", %{conn: conn, client: client} do
      assert conn
             |> get("/v1/coach/clients/not-a-uuid/training-sessions")
             |> json_response(422)

      assert conn
             |> recycle()
             |> get("/v1/coach/clients/#{client.id}/training-sessions/not-a-uuid")
             |> json_response(422)
    end
  end

  describe "GET /v1/coach/clients/:client_id/training-sessions/:id" do
    test "shows frozen prescription and performed sets", %{conn: conn, business: business, client: client} do
      session =
        insert(:workout_session,
          client: client,
          business: business,
          kind: :planned,
          state: :active,
          snapshot_version: 1,
          prescription_snapshot: prescription_snapshot("Frozen workout"),
          source_plan_id: Ecto.UUID.generate(),
          source_workout_id: Ecto.UUID.generate()
        )

      set = insert(:performed_set, session: session, business: business, exercise_name: "Frozen set")

      conn = get(conn, "/v1/coach/clients/#{client.id}/training-sessions/#{session.id}")
      response = json_response(conn, 200)
      assert %{"data" => data} = response

      assert data["id"] == session.id
      refute Map.has_key?(data, "client_id")
      assert data["prescription_snapshot"]["workout"]["name"] == "Frozen workout"
      assert %{"id" => set_id, "exercise_name" => "Frozen set"} = hd(data["performed_sets"])
      assert set_id == set.id
    end

    test "returns 404 for session belonging to different client", %{
      conn: conn,
      coach: coach,
      business: business,
      client: client
    } do
      other_client = insert(:client, creator: coach, business: business)
      session = insert(:workout_session, client: other_client, business: business)

      conn = get(conn, "/v1/coach/clients/#{client.id}/training-sessions/#{session.id}")
      assert json_response(conn, 404)
    end

    test "returns 404 for session in another business", %{conn: conn, client: client} do
      other = insert(:coach)
      other_client = insert(:client, creator: other, business: other.business)
      session = insert(:workout_session, client: other_client, business: other.business)

      conn = get(conn, "/v1/coach/clients/#{client.id}/training-sessions/#{session.id}")
      assert json_response(conn, 404)
    end
  end

  describe "coach write routes no longer exist" do
    test "POST /v1/coach/workout_sessions returns 404", %{conn: conn, client: client} do
      conn = post(conn, "/v1/coach/workout_sessions", %{"client_id" => client.id})
      assert json_response(conn, 404)
    end
  end

  defp prescription_snapshot(name) do
    %{
      "version" => 1,
      "plan" => %{"id" => Ecto.UUID.generate(), "name" => "Frozen plan", "revision" => 1},
      "workout" => %{"id" => Ecto.UUID.generate(), "name" => name, "exercises" => []}
    }
  end
end
