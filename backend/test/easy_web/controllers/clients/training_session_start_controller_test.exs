defmodule EasyWeb.Clients.TrainingSessionStartControllerTest do
  use Easy.ConnCase

  import OpenApiSpex.TestAssertions

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
    conn = build_conn() |> authenticate_client(client)

    %{conn: conn, coach: coach, client: client}
  end

  describe "POST /v1/client/training-sessions" do
    test "starts freestyle without a plan using the generated contract", ctx do
      conn = post_json(ctx.conn, "/v1/client/training-sessions", %{})

      assert %{"data" => data} = response = json_response(conn, 201)
      assert data["kind"] == "freestyle"
      assert data["state"] == "active"
      assert data["snapshot_version"] == nil
      assert data["prescription_snapshot"] == nil
      assert_schema(response, "TrainingSessionResponse", EasyWeb.ApiSpec.spec())
    end

    test "starts any workout in current Coverage and renders its typed snapshot", ctx do
      plan = insert_client_plan(ctx, name: "Strength", start_date: Date.utc_today())
      guided = insert(:workout, business: ctx.coach.business, plan: plan, name: "Guided", position: 0)
      selected = insert(:workout, business: ctx.coach.business, plan: plan, name: "Selected", position: 1)
      exercise = insert(:exercise, business: ctx.coach.business, name: "Deadlift", tracking_type: "weight_reps")

      insert(:prescribed_exercise,
        business: ctx.coach.business,
        workout: selected,
        exercise: exercise,
        position: 0,
        prescribed_sets: [%{reps: "5", rest_seconds: 90, notes: "Reset"}]
      )

      insert(:workout_schedule,
        business: ctx.coach.business,
        plan: plan,
        workout: guided,
        weekday: weekday(Date.utc_today())
      )

      conn =
        post_json(ctx.conn, "/v1/client/training-sessions", %{
          training_workout_id: selected.id
        })

      assert %{"data" => data} = response = json_response(conn, 201)
      assert data["kind"] == "planned"
      assert data["source_plan_id"] == plan.id
      assert data["source_workout_id"] == selected.id
      assert data["snapshot_version"] == 1

      assert %{
               "plan" => %{"id" => plan_id, "name" => "Strength"},
               "workout" => %{
                 "id" => workout_id,
                 "name" => "Selected",
                 "exercises" => [
                   %{
                     "exercise_name" => "Deadlift",
                     "tracking_type" => "weight_reps",
                     "sets" => [%{"rest_seconds" => 90, "notes" => "Reset"}]
                   }
                 ]
               }
             } = data["prescription_snapshot"]

      assert plan_id == plan.id
      assert workout_id == selected.id
      assert_schema(response, "TrainingSessionResponse", EasyWeb.ApiSpec.spec())
    end

    test "returns conflict when a Training Session is already active", ctx do
      insert(:workout_session, client: ctx.client, business: ctx.coach.business)

      conn = post_json(ctx.conn, "/v1/client/training-sessions", %{})

      assert %{"error_code" => "conflict"} = json_response(conn, 409)
    end
  end

  describe "GET /v1/client/training-sessions/active" do
    test "returns nullable active state through the generated contract", ctx do
      conn = get(ctx.conn, "/v1/client/training-sessions/active")
      assert %{"data" => nil} = empty_response = json_response(conn, 200)
      assert_schema(empty_response, "ActiveTrainingSessionResponse", EasyWeb.ApiSpec.spec())

      session = insert(:workout_session, client: ctx.client, business: ctx.coach.business)
      conn = get(ctx.conn, "/v1/client/training-sessions/active")

      assert %{"data" => %{"id" => session_id}} = response = json_response(conn, 200)
      assert session_id == session.id
      assert_schema(response, "ActiveTrainingSessionResponse", EasyWeb.ApiSpec.spec())
    end

    test "does not expose another client's active Training Session", ctx do
      other_client = insert(:client, business: ctx.coach.business, creator: ctx.coach, assigned_coach: ctx.coach)
      insert(:workout_session, client: other_client, business: ctx.coach.business)

      conn = get(ctx.conn, "/v1/client/training-sessions/active")
      assert %{"data" => nil} = json_response(conn, 200)
    end
  end

  defp insert_client_plan(ctx, attrs) do
    insert(
      :training_plan,
      Keyword.merge(
        [
          kind: :client_plan,
          business: ctx.coach.business,
          creator: ctx.coach.user,
          client: ctx.client
        ],
        attrs
      )
    )
  end

  defp post_json(conn, path, body) do
    conn
    |> put_req_header("content-type", "application/json")
    |> post(path, Jason.encode!(body))
  end

  defp weekday(date) do
    [:monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday]
    |> Enum.at(Date.day_of_week(date) - 1)
  end
end
