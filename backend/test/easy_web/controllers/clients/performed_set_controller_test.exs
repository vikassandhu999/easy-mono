defmodule EasyWeb.Clients.PerformedSetControllerTest do
  use Easy.ConnCase

  alias Easy.Sessions

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    exercise = insert(:exercise, business: coach.business)
    conn = build_conn() |> authenticate_client(client)

    session = insert(:workout_session, client: client, business: coach.business, state: :active)

    %{
      conn: conn,
      coach: coach,
      client: client,
      business: coach.business,
      exercise: exercise,
      session: session
    }
  end

  describe "POST /v1/client/training-sessions/:session_id/performed-sets" do
    test "logs a set", ctx do
      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> post(
          "/v1/client/training-sessions/#{ctx.session.id}/performed-sets",
          Jason.encode!(%{
            "exercise_id" => ctx.exercise.id,
            "set_type" => "working",
            "position" => 0,
            "reps" => "10",
            "load_value" => 80,
            "load_unit" => "kg",
            "completed" => true
          })
        )

      assert %{"data" => data} = json_response(conn, 201)
      assert data["reps"] == "10"
      assert data["load_value"] in ["80", "80.0"]
      assert data["load_unit"] == "kg"
      assert data["completed"] == true
      assert data["exercise_id"] == ctx.exercise.id
      assert data["training_session_id"] == ctx.session.id
      assert data["exercise_name"] == ctx.exercise.name
      assert data["exercise"]["name"] == ctx.exercise.name
    end

    test "logs a skipped set (completed: false)", ctx do
      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> post(
          "/v1/client/training-sessions/#{ctx.session.id}/performed-sets",
          Jason.encode!(%{
            "exercise_id" => ctx.exercise.id,
            "set_type" => "working",
            "position" => 0,
            "reps" => "0",
            "completed" => false
          })
        )

      assert %{"data" => data} = json_response(conn, 201)
      assert data["completed"] == false
    end

    test "rejects set for another client's session", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      other_session = insert(:workout_session, client: other_client, business: ctx.business)

      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> post(
          "/v1/client/training-sessions/#{other_session.id}/performed-sets",
          Jason.encode!(%{
            "exercise_id" => ctx.exercise.id,
            "set_type" => "working",
            "position" => 0,
            "reps" => "10",
            "completed" => true
          })
        )

      assert json_response(conn, 404)
    end

    test "rejects set with exercise from another business", ctx do
      other_exercise = insert(:exercise)

      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> post(
          "/v1/client/training-sessions/#{ctx.session.id}/performed-sets",
          Jason.encode!(%{
            "exercise_id" => other_exercise.id,
            "set_type" => "working",
            "position" => 0,
            "reps" => "10",
            "completed" => true
          })
        )

      assert json_response(conn, 404)
    end

    test "does not expose business_id", ctx do
      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> post(
          "/v1/client/training-sessions/#{ctx.session.id}/performed-sets",
          Jason.encode!(%{
            "exercise_id" => ctx.exercise.id,
            "set_type" => "working",
            "position" => 0,
            "reps" => "10",
            "completed" => true
          })
        )

      assert %{"data" => data} = json_response(conn, 201)
      refute Map.has_key?(data, "business_id")
    end
  end

  describe "PATCH /v1/client/training-performed-sets/:id" do
    test "updates a logged set", ctx do
      {:ok, set} =
        Sessions.create_my_performed_set(
          %Easy.Ctx{user_id: ctx.client.user_id, business_id: ctx.business.id},
          ctx.session.id,
          %{
            "exercise_id" => ctx.exercise.id,
            "set_type" => "working",
            "position" => 0,
            "reps" => "10",
            "load_value" => 80,
            "load_unit" => "kg",
            "completed" => true
          }
        )

      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> patch(
          "/v1/client/training-performed-sets/#{set.id}",
          Jason.encode!(%{"reps" => "8", "load_value" => 75, "notes" => "Dropped weight"})
        )

      assert %{"data" => data} = json_response(conn, 200)
      assert data["reps"] == "8"
      assert data["load_value"] in ["75", "75.0"]
      assert data["notes"] == "Dropped weight"
    end

    test "rejects update of another client's set", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      other_session = insert(:workout_session, client: other_client, business: ctx.business)

      {:ok, other_set} =
        Sessions.create_my_performed_set(
          %Easy.Ctx{user_id: other_client.user_id, business_id: ctx.business.id},
          other_session.id,
          %{
            "exercise_id" => ctx.exercise.id,
            "set_type" => "working",
            "position" => 0,
            "reps" => "10",
            "completed" => true
          }
        )

      conn =
        ctx.conn
        |> put_req_header("content-type", "application/json")
        |> patch(
          "/v1/client/training-performed-sets/#{other_set.id}",
          Jason.encode!(%{"reps" => "5"})
        )

      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/client/training-performed-sets/:id" do
    test "deletes a logged set", ctx do
      {:ok, set} =
        Sessions.create_my_performed_set(
          %Easy.Ctx{user_id: ctx.client.user_id, business_id: ctx.business.id},
          ctx.session.id,
          %{
            "exercise_id" => ctx.exercise.id,
            "set_type" => "working",
            "position" => 0,
            "reps" => "10",
            "completed" => true
          }
        )

      conn = delete(ctx.conn, "/v1/client/training-performed-sets/#{set.id}")
      assert response(conn, 204)
    end

    test "rejects delete of another client's set", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      other_session = insert(:workout_session, client: other_client, business: ctx.business)

      {:ok, other_set} =
        Sessions.create_my_performed_set(
          %Easy.Ctx{user_id: other_client.user_id, business_id: ctx.business.id},
          other_session.id,
          %{
            "exercise_id" => ctx.exercise.id,
            "set_type" => "working",
            "position" => 0,
            "reps" => "10",
            "completed" => true
          }
        )

      conn = delete(ctx.conn, "/v1/client/training-performed-sets/#{other_set.id}")
      assert json_response(conn, 404)
    end
  end
end
