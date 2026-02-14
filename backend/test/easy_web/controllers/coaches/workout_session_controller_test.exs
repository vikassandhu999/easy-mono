defmodule EasyWeb.Coaches.WorkoutSessionControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/sessions" do
    test "creates session", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)

      conn = post(conn, "/v1/coach/sessions", %{"client_id" => client.id, "notes" => "Start"})
      assert %{"data" => data} = json_response(conn, 201)

      assert data["client_id"] == client.id
      assert data["state"] == "active"
    end

    test "returns 404 when planned workout belongs to another business", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, creator: coach, business: business)

      other = insert(:coach)
      other_plan = insert(:training_plan, author: other, business: other.business)

      other_workout =
        insert(:planned_workout, training_plan: other_plan, business: other.business)

      conn =
        post(conn, "/v1/coach/sessions", %{
          "client_id" => client.id,
          "planned_workout_id" => other_workout.id,
          "notes" => "Start"
        })

      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/sessions" do
    test "lists sessions", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)
      insert(:workout_session, client: client, business: business)

      conn = get(conn, "/v1/coach/sessions")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
    end
  end

  describe "PATCH /v1/coach/sessions/:id/complete" do
    test "completes session", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)
      session = insert(:workout_session, client: client, business: business, state: :active)

      conn = patch(conn, "/v1/coach/sessions/#{session.id}/complete", %{"notes" => "Done"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["state"] == "completed"
      assert data["notes"] == "Done"
    end
  end

  describe "PATCH /v1/coach/sessions/:id/discard" do
    test "discards session", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)
      session = insert(:workout_session, client: client, business: business, state: :active)

      conn = patch(conn, "/v1/coach/sessions/#{session.id}/discard")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["state"] == "discarded"
    end
  end
end
