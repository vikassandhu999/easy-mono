defmodule EasyWeb.Clients.TrainingPlanControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_client(client)

    %{conn: conn, coach: coach, client: client, business: coach.business}
  end

  describe "GET /v1/client/training_plans" do
    test "lists only plans assigned to the client", ctx do
      # Assigned to this client
      insert(:training_plan,
        author: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-03-31]
      )

      # Template — should not appear
      insert(:training_plan, author: ctx.coach, business: ctx.business)

      # Assigned to another client — should not appear
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      insert(:training_plan,
        author: ctx.coach,
        business: ctx.business,
        client_id: other_client.id,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-03-31]
      )

      conn = get(ctx.conn, "/v1/client/training_plans")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
      assert hd(data)["id"] != nil
    end

    test "returns empty list when no plans assigned", ctx do
      conn = get(ctx.conn, "/v1/client/training_plans")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end

    test "filters by status", ctx do
      insert(:training_plan,
        author: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :active,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-03-31]
      )

      insert(:training_plan,
        author: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :archived,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-03-31]
      )

      conn = get(ctx.conn, "/v1/client/training_plans", %{"status" => "active"})
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert hd(data)["status"] == "active"
    end

    test "rejects unauthenticated request", _ctx do
      conn = build_conn() |> get("/v1/client/training_plans")
      assert json_response(conn, 403)
    end

    test "rejects coach-authenticated request", ctx do
      conn =
        build_conn()
        |> authenticate_coach(ctx.coach)
        |> get("/v1/client/training_plans")

      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/client/training_plans/:id" do
    test "shows plan with workouts, elements, exercises, and sets", ctx do
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

      conn = get(ctx.conn, "/v1/client/training_plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == plan.id
      assert data["name"] == plan.name
      assert data["rest_days"] == []

      [workout_data] = data["planned_workouts"]
      assert workout_data["name"] == workout.name
      assert workout_data["day_number"] == workout.day_number

      [element_data] = workout_data["workout_elements"]
      assert element_data["exercise"]["name"] == exercise.name
      assert element_data["exercise"]["images"] != nil

      [set_data] = element_data["planned_sets"]
      assert set_data["target_reps"] == "8-10"
      assert set_data["load_value"] == "80"
      assert set_data["rest_seconds"] == 120
    end

    test "returns 404 for plan assigned to another client", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: other_client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-03-31]
        )

      conn = get(ctx.conn, "/v1/client/training_plans/#{plan.id}")
      assert json_response(conn, 404)
    end

    test "returns 404 for template plans", ctx do
      plan = insert(:training_plan, author: ctx.coach, business: ctx.business)

      conn = get(ctx.conn, "/v1/client/training_plans/#{plan.id}")
      assert json_response(conn, 404)
    end

    test "does not expose coach-specific fields", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-03-31]
        )

      conn = get(ctx.conn, "/v1/client/training_plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)
      refute Map.has_key?(data, "author_id")
      refute Map.has_key?(data, "business_id")
      refute Map.has_key?(data, "client_id")
      refute Map.has_key?(data, "original_template_id")
    end
  end
end
