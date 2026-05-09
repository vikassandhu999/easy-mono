defmodule EasyWeb.Clients.PerformedSetControllerTest do
  use Easy.ConnCase

  alias Easy.Training.{PerformedSet, WorkoutSession}

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    exercise = insert(:exercise, business: coach.business)
    conn = build_conn() |> authenticate_client(client)

    {:ok, session} = WorkoutSession.create(coach.business_id, client.id, %{})

    %{
      conn: conn,
      coach: coach,
      client: client,
      business: coach.business,
      exercise: exercise,
      session: session
    }
  end

  describe "POST /v1/client/performed_sets" do
    test "logs a set", ctx do
      conn =
        post(ctx.conn, "/v1/client/performed_sets", %{
          "workout_session_id" => ctx.session.id,
          "exercise_id" => ctx.exercise.id,
          "position" => 0,
          "actual_reps" => "10",
          "load_value" => 80,
          "load_unit" => "kg",
          "completed" => true
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["actual_reps"] == "10"
      assert data["load_value"] == "80"
      assert data["load_unit"] == "kg"
      assert data["completed"] == true
      assert data["exercise_id"] == ctx.exercise.id
      assert data["workout_session_id"] == ctx.session.id
      assert data["exercise"]["name"] == ctx.exercise.name
    end

    test "logs a set with workout_element_id", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: Date.add(Date.utc_today(), -1),
          end_date: Date.add(Date.utc_today(), 30)
        )

      workout = insert(:workout, training_plan: plan, business: ctx.business)

      element =
        insert(:workout_element,
          workout: workout,
          exercise: ctx.exercise,
          business: ctx.business,
          planned_sets: []
        )

      {:ok, planned_session} = WorkoutSession.update(ctx.session, %{"workout_id" => workout.id})

      conn =
        post(ctx.conn, "/v1/client/performed_sets", %{
          "workout_session_id" => planned_session.id,
          "exercise_id" => ctx.exercise.id,
          "workout_element_id" => element.id,
          "position" => 0,
          "actual_reps" => "8",
          "completed" => true
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["workout_element_id"] == element.id
    end

    test "logs a skipped set (completed: false)", ctx do
      conn =
        post(ctx.conn, "/v1/client/performed_sets", %{
          "workout_session_id" => ctx.session.id,
          "exercise_id" => ctx.exercise.id,
          "position" => 0,
          "actual_reps" => "0",
          "completed" => false
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["completed"] == false
    end

    test "rejects set without performance metric", ctx do
      conn =
        post(ctx.conn, "/v1/client/performed_sets", %{
          "workout_session_id" => ctx.session.id,
          "exercise_id" => ctx.exercise.id,
          "position" => 0,
          "completed" => true
        })

      assert json_response(conn, 422)
    end

    test "rejects set for another client's session", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      {:ok, other_session} = WorkoutSession.create(ctx.business.id, other_client.id, %{})

      conn =
        post(ctx.conn, "/v1/client/performed_sets", %{
          "workout_session_id" => other_session.id,
          "exercise_id" => ctx.exercise.id,
          "position" => 0,
          "actual_reps" => "10",
          "completed" => true
        })

      assert json_response(conn, 404)
    end

    test "rejects set with exercise from another business", ctx do
      other_exercise = insert(:exercise)

      conn =
        post(ctx.conn, "/v1/client/performed_sets", %{
          "workout_session_id" => ctx.session.id,
          "exercise_id" => other_exercise.id,
          "position" => 0,
          "actual_reps" => "10",
          "completed" => true
        })

      assert json_response(conn, 404)
    end

    test "does not expose business_id", ctx do
      conn =
        post(ctx.conn, "/v1/client/performed_sets", %{
          "workout_session_id" => ctx.session.id,
          "exercise_id" => ctx.exercise.id,
          "position" => 0,
          "actual_reps" => "10",
          "completed" => true
        })

      assert %{"data" => data} = json_response(conn, 201)
      refute Map.has_key?(data, "business_id")
    end
  end

  describe "PATCH /v1/client/performed_sets/:id" do
    test "updates a logged set", ctx do
      {:ok, set} =
        PerformedSet.create(ctx.session.id, ctx.business.id, %{
          "exercise_id" => ctx.exercise.id,
          "position" => 0,
          "actual_reps" => "10",
          "load_value" => 80,
          "load_unit" => "kg",
          "completed" => true
        })

      conn =
        patch(ctx.conn, "/v1/client/performed_sets/#{set.id}", %{
          "actual_reps" => "8",
          "load_value" => 75,
          "notes" => "Dropped weight"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["actual_reps"] == "8"
      assert data["load_value"] == "75"
      assert data["notes"] == "Dropped weight"
    end

    test "rejects update of another client's set", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      {:ok, other_session} = WorkoutSession.create(ctx.business.id, other_client.id, %{})

      {:ok, other_set} =
        PerformedSet.create(other_session.id, ctx.business.id, %{
          "exercise_id" => ctx.exercise.id,
          "position" => 0,
          "actual_reps" => "10",
          "completed" => true
        })

      conn = patch(ctx.conn, "/v1/client/performed_sets/#{other_set.id}", %{"actual_reps" => "5"})
      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/client/performed_sets/:id" do
    test "deletes a logged set", ctx do
      {:ok, set} =
        PerformedSet.create(ctx.session.id, ctx.business.id, %{
          "exercise_id" => ctx.exercise.id,
          "position" => 0,
          "actual_reps" => "10",
          "completed" => true
        })

      conn = delete(ctx.conn, "/v1/client/performed_sets/#{set.id}")
      assert response(conn, 204)
    end

    test "rejects delete of another client's set", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      {:ok, other_session} = WorkoutSession.create(ctx.business.id, other_client.id, %{})

      {:ok, other_set} =
        PerformedSet.create(other_session.id, ctx.business.id, %{
          "exercise_id" => ctx.exercise.id,
          "position" => 0,
          "actual_reps" => "10",
          "completed" => true
        })

      conn = delete(ctx.conn, "/v1/client/performed_sets/#{other_set.id}")
      assert json_response(conn, 404)
    end
  end
end
