defmodule EasyWeb.Clients.PerformedSetControllerTest do
  use Easy.ConnCase

  import OpenApiSpex.TestAssertions

  alias Easy.Ctx
  alias Easy.Training.Execution

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
    exercise = insert(:exercise, business: coach.business, name: "Back Squat")
    ctx = %Ctx{business_id: coach.business_id, user_id: client.user_id, client_id: client.id}
    {:ok, session} = Execution.start_client_session(ctx, nil, %{})

    %{
      client: client,
      coach: coach,
      conn: build_conn() |> authenticate_client(client),
      ctx: ctx,
      exercise: exercise,
      session: session
    }
  end

  describe "POST /v1/client/training-sessions/:session_id/performed-sets" do
    test "logs a visible exercise through the explicit response contract", ctx do
      conn =
        post_json(ctx.conn, "/v1/client/training-sessions/#{ctx.session.id}/performed-sets", %{
          exercise_id: ctx.exercise.id,
          reps: "5",
          load_value: 80,
          load_unit: "kg"
        })

      assert %{"data" => data} = response = json_response(conn, 201)
      assert data["position"] == 0
      assert data["exercise_id"] == ctx.exercise.id
      assert data["exercise_name"] == "Back Squat"
      assert data["snapshot_exercise_ref"] == nil
      assert data["training_session_id"] == ctx.session.id
      refute Map.has_key?(data, "business_id")
      refute Map.has_key?(data, "completed")
      assert_schema(response, "TrainingPerformedSetResponse", EasyWeb.ApiSpec.spec())
    end

    test "logs explicitly named work without a library reference", ctx do
      conn =
        post_json(ctx.conn, "/v1/client/training-sessions/#{ctx.session.id}/performed-sets", %{
          exercise_name: "  Hill sprint  ",
          duration_seconds: 30
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["exercise_id"] == nil
      assert data["exercise_name"] == "Hill sprint"
    end

    test "accepts a stable reference from the planned snapshot", ctx do
      %{prescribed: prescribed, session: session} = start_planned_session(ctx)

      conn =
        post_json(ctx.conn, "/v1/client/training-sessions/#{session.id}/performed-sets", %{
          exercise_id: ctx.exercise.id,
          snapshot_exercise_ref: prescribed.id,
          reps: "5"
        })

      assert %{"data" => %{"snapshot_exercise_ref" => reference}} = json_response(conn, 201)
      assert reference == prescribed.id
    end

    test "rejects invisible exercises without exposing them", ctx do
      foreign_exercise = insert(:exercise, business: insert(:business))

      conn =
        post_json(ctx.conn, "/v1/client/training-sessions/#{ctx.session.id}/performed-sets", %{
          exercise_id: foreign_exercise.id
        })

      assert json_response(conn, 404)
    end

    test "active-session reads return performed sets in append order", ctx do
      {:ok, first} =
        Execution.create_client_performed_set(ctx.ctx, ctx.session.id, %{exercise_id: ctx.exercise.id})

      {:ok, second} =
        Execution.create_client_performed_set(ctx.ctx, ctx.session.id, %{exercise_name: "Hill sprint"})

      response = ctx.conn |> get("/v1/client/training-sessions/active") |> json_response(200)

      assert %{
               "data" => %{
                 "performed_sets" => [
                   %{"id" => first_id, "snapshot_exercise_ref" => nil},
                   %{"id" => second_id, "snapshot_exercise_ref" => nil}
                 ]
               }
             } = response

      assert [first_id, second_id] == [first.id, second.id]
      assert_schema(response, "ActiveTrainingSessionResponse", EasyWeb.ApiSpec.spec())
    end
  end

  describe "PATCH /v1/client/training-performed-sets/:id" do
    test "updates measurements", ctx do
      {:ok, set} =
        Execution.create_client_performed_set(ctx.ctx, ctx.session.id, %{
          exercise_id: ctx.exercise.id,
          reps: "5"
        })

      conn = patch_json(ctx.conn, "/v1/client/training-performed-sets/#{set.id}", %{reps: "8", rpe: 9})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["reps"] == "8"
      assert data["rpe"] in ["9", "9.0"]
    end

    test "rejects identity fields at the request boundary", ctx do
      {:ok, set} =
        Execution.create_client_performed_set(ctx.ctx, ctx.session.id, %{exercise_id: ctx.exercise.id})

      conn =
        patch_json(ctx.conn, "/v1/client/training-performed-sets/#{set.id}", %{
          exercise_name: "Changed",
          snapshot_exercise_ref: Ecto.UUID.generate()
        })

      assert json_response(conn, 422)
    end
  end

  describe "DELETE /v1/client/training-performed-sets/:id" do
    test "deletes a set from the client's active session", ctx do
      {:ok, set} =
        Execution.create_client_performed_set(ctx.ctx, ctx.session.id, %{exercise_id: ctx.exercise.id})

      assert response(delete(ctx.conn, "/v1/client/training-performed-sets/#{set.id}"), 204)
    end
  end

  defp start_planned_session(ctx) do
    Easy.Repo.delete!(ctx.session)

    plan =
      insert(:training_plan,
        kind: :client_plan,
        business: ctx.coach.business,
        creator: ctx.coach.user,
        client: ctx.client,
        start_date: Date.utc_today()
      )

    workout = insert(:workout, business: ctx.coach.business, plan: plan, position: 0)

    prescribed =
      insert(:prescribed_exercise,
        business: ctx.coach.business,
        workout: workout,
        exercise: ctx.exercise,
        position: 0
      )

    {:ok, session} = Execution.start_client_session(ctx.ctx, workout.id, %{})
    %{prescribed: prescribed, session: session}
  end

  defp post_json(conn, path, body) do
    conn
    |> put_req_header("content-type", "application/json")
    |> post(path, Jason.encode!(body))
  end

  defp patch_json(conn, path, body) do
    conn
    |> put_req_header("content-type", "application/json")
    |> patch(path, Jason.encode!(body))
  end
end
