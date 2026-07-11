defmodule EasyWeb.Coaches.WorkoutSessionControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)
    client = insert(:client, creator: coach, business: coach.business)

    %{conn: conn, coach: coach, business: coach.business, client: client}
  end

  describe "GET /v1/coach/clients/:client_id/training-sessions" do
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
  end

  describe "GET /v1/coach/clients/:client_id/training-sessions/:id" do
    test "shows session with performed sets", %{conn: conn, business: business, client: client} do
      session = insert(:workout_session, client: client, business: business, state: :active)

      conn = get(conn, "/v1/coach/clients/#{client.id}/training-sessions/#{session.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == session.id
      assert is_list(data["performed_sets"])
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
end
