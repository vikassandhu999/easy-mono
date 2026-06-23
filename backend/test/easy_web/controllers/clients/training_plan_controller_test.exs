defmodule EasyWeb.Clients.TrainingPlanControllerTest do
  use Easy.ConnCase

  setup do
    unique = Ecto.UUID.generate()

    business_owner =
      insert(:user, email: "client-training-plan-owner-#{unique}@test.com")

    business =
      insert(:business,
        name: "Client Training Plan Business #{unique}",
        handle: "client-training-plan-#{unique}",
        owner: business_owner
      )

    coach_user =
      insert(:user, email: "client-training-plan-coach-#{unique}@test.com")

    coach = insert(:coach, user: coach_user, business: business)
    client_user = insert(:user, email: "client-training-plan-client-user-#{unique}@test.com")

    client =
      insert(:client,
        email: "client-training-plan-client-#{unique}@test.com",
        user: client_user,
        creator: coach,
        business: business
      )

    conn = build_conn() |> authenticate_client(client)

    %{conn: conn, coach: coach, client: client, business: business}
  end

  describe "GET /v1/client/training-plans" do
    test "lists only plans assigned to the client", ctx do
      insert(:training_plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-03-31]
      )

      insert(:training_plan, creator: ctx.coach, business: ctx.business)

      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      insert(:training_plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: other_client.id,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-03-31]
      )

      conn = get(ctx.conn, "/v1/client/training-plans")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
      assert hd(data)["id"] != nil
    end

    test "returns empty list when no plans assigned", ctx do
      conn = get(ctx.conn, "/v1/client/training-plans")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end

    test "filters by status", ctx do
      insert(:training_plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :active,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-03-31]
      )

      insert(:training_plan,
        creator: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :archived,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-03-31]
      )

      conn = get(ctx.conn, "/v1/client/training-plans", %{"status" => "active"})
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert hd(data)["status"] == "active"
    end

    test "rejects unauthenticated request", _ctx do
      conn = build_conn() |> get("/v1/client/training-plans")
      assert json_response(conn, 403)
    end

    test "rejects coach-authenticated request", ctx do
      conn =
        build_conn()
        |> authenticate_coach(ctx.coach)
        |> get("/v1/client/training-plans")

      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/client/training-plans/:id" do
    test "shows plan with workouts, elements, exercises, and sets", ctx do
      plan =
        insert(:training_plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-03-31]
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

      conn = get(ctx.conn, "/v1/client/training-plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == plan.id
      assert data["name"] == plan.name
      refute Map.has_key?(data, "rest_days")
      assert is_list(data["plan_items"])

      [workout_data] = data["workouts"]
      assert workout_data["name"] == workout.name

      [element_data] = workout_data["workout_elements"]
      assert element_data["exercise"]["name"] == exercise.name
      assert element_data["exercise"]["images"] != nil

      [set_data] = element_data["planned_sets"]
      assert set_data["set_type"] == "working"
      assert set_data["reps"] == "8-10"
      assert set_data["load_value"] == "80"
      assert set_data["rest_seconds"] == 120
    end

    test "returns 404 for plan assigned to another client", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      plan =
        insert(:training_plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: other_client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-03-31]
        )

      conn = get(ctx.conn, "/v1/client/training-plans/#{plan.id}")
      assert json_response(conn, 404)
    end

    test "returns 404 for template plans", ctx do
      plan = insert(:training_plan, creator: ctx.coach, business: ctx.business)

      conn = get(ctx.conn, "/v1/client/training-plans/#{plan.id}")
      assert json_response(conn, 404)
    end

    test "does not expose coach-specific fields", ctx do
      plan =
        insert(:training_plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-03-31]
        )

      conn = get(ctx.conn, "/v1/client/training-plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)
      refute Map.has_key?(data, "creator_id")
      refute Map.has_key?(data, "business_id")
      refute Map.has_key?(data, "client_id")
      refute Map.has_key?(data, "source_template_id")
    end
  end

  describe "GET /v1/client/training-plans/today" do
    test "returns today's active plan with scheduled workout", ctx do
      today = Date.utc_today()

      plan =
        insert(:training_plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          status: :active,
          start_date: Date.add(today, -1),
          end_date: Date.add(today, 30)
        )

      workout = insert(:workout, plan: plan, creator: ctx.coach, business: ctx.business)
      day = Easy.Utils.weekday_name(today)

      _entry =
        insert(:training_plan_item,
          plan: plan,
          business: ctx.business,
          day_of_week: day,
          workout: workout
        )

      conn = get(ctx.conn, "/v1/client/training-plans/today")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == plan.id
      assert data["day"] == day
      assert data["workout"]["id"] == workout.id
    end

    test "returns 404 when no active plan", ctx do
      conn = get(ctx.conn, "/v1/client/training-plans/today")
      assert json_response(conn, 404)
    end

    test "accepts a date param", ctx do
      today = Date.utc_today()

      plan =
        insert(:training_plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          status: :active,
          start_date: Date.add(today, -1),
          end_date: Date.add(today, 30)
        )

      conn = get(ctx.conn, "/v1/client/training-plans/today", %{"date" => Date.to_iso8601(today)})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == plan.id
    end
  end
end
