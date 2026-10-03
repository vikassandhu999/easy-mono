defmodule EasyWeb.Clients.TrainingPlanControllerTest do
  use Easy.ConnCase

  alias Easy.Clients.Client

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach)
    conn = build_conn() |> authenticate_client(client)

    %{conn: conn, coach: coach, client: client}
  end

  describe "GET /v1/client/training-plans" do
    test "lists only the authenticated client's unarchived Client Plans with lifecycle labels", ctx do
      today = Client.local_date(ctx.client, DateTime.utc_now())
      incomplete = insert_client_plan(ctx, name: "Incomplete")
      current = insert_client_plan(ctx, name: "Current", start_date: today, end_date: today)
      archived = insert_client_plan(ctx, name: "Archived", archived_at: DateTime.utc_now(:second))
      other_client = insert(:client, business: ctx.coach.business, coach: ctx.coach)

      insert(:training_plan,
        business: ctx.coach.business,
        creator: ctx.coach.user,
        client: other_client,
        kind: :client_plan,
        start_date: Date.add(today, 1)
      )

      conn = get(ctx.conn, "/v1/client/training-plans")

      assert %{"data" => plans, "count" => 2} = json_response(conn, 200)
      assert MapSet.new(Enum.map(plans, & &1["id"])) == MapSet.new([incomplete.id, current.id])
      assert %{"kind" => "client_plan", "lifecycle" => "incomplete"} = Enum.find(plans, &(&1["id"] == incomplete.id))
      assert %{"lifecycle" => "current"} = Enum.find(plans, &(&1["id"] == current.id))
      refute Enum.any?(plans, &(&1["id"] == archived.id))

      Enum.each(plans, fn plan ->
        assert plan["client_id"] == ctx.client.id
        assert plan["client"]["id"] == ctx.client.id
        assert plan["creator_id"] == ctx.coach.user.id
        assert Map.has_key?(plan, "source_template_id")
      end)
    end

    test "rejects unauthenticated and coach-authenticated requests", ctx do
      assert build_conn() |> get("/v1/client/training-plans") |> json_response(403)

      assert build_conn()
             |> authenticate_coach(ctx.coach)
             |> get("/v1/client/training-plans")
             |> json_response(403)
    end
  end

  describe "GET /v1/client/training-plans/:id" do
    test "renders the complete ordered Prescription needed by the client", ctx do
      plan = insert_client_plan(ctx, start_date: Client.local_date(ctx.client, DateTime.utc_now()))
      workout = insert(:workout, business: ctx.coach.business, plan: plan, name: "Lower", position: 7)

      exercise =
        insert(:exercise,
          business: ctx.coach.business,
          name: "Back Squat",
          tracking_type: "weight_reps",
          images: ["https://example.test/squat.jpg"]
        )

      insert(:prescribed_exercise,
        business: ctx.coach.business,
        workout: workout,
        exercise: exercise,
        position: 9,
        prescribed_sets: [
          %{
            set_type: :working,
            reps: "5",
            load_value: Decimal.new("100"),
            load_unit: :kg,
            duration_seconds: 45,
            distance_value: Decimal.new("1.5"),
            distance_unit: :km,
            rpe: Decimal.new("8.5"),
            rest_seconds: 120,
            notes: "Controlled"
          }
        ]
      )

      insert(:workout_schedule, business: ctx.coach.business, plan: plan, workout: workout, weekday: :monday)

      conn = get(ctx.conn, "/v1/client/training-plans/#{plan.id}")

      assert %{"data" => data} = json_response(conn, 200)
      assert data["kind"] == "client_plan"
      assert data["lifecycle"] == "current"
      assert data["schedule"]["monday"] == workout.id

      assert [rendered_workout] = data["workouts"]
      assert rendered_workout["position"] == 7
      assert [rendered_exercise] = rendered_workout["workout_elements"]
      assert rendered_exercise["position"] == 9
      assert rendered_exercise["exercise"]["tracking_type"] == "weight_reps"
      assert rendered_exercise["exercise"]["images"] == ["https://example.test/squat.jpg"]

      assert [rendered_set] = rendered_exercise["planned_sets"]

      assert rendered_set == %{
               "distance_unit" => "km",
               "distance_value" => "1.5",
               "duration_seconds" => 45,
               "load_unit" => "kg",
               "load_value" => "100",
               "notes" => "Controlled",
               "reps" => "5",
               "rest_seconds" => 120,
               "rpe" => "8.5",
               "set_type" => "working"
             }

      refute Map.has_key?(data, "business_id")
      assert data["client_id"] == ctx.client.id
      assert data["client"]["id"] == ctx.client.id
      assert data["creator_id"] == ctx.coach.user.id
      assert data["source_template_id"] == nil
    end

    test "conceals archived, other-client, other-business, and Template plans", ctx do
      archived = insert_client_plan(ctx, archived_at: DateTime.utc_now(:second))
      other_client = insert(:client, business: ctx.coach.business, coach: ctx.coach)

      other_client_plan =
        insert(:training_plan,
          business: ctx.coach.business,
          creator: ctx.coach.user,
          client: other_client,
          kind: :client_plan
        )

      other_coach = insert(:coach)

      other_business_client =
        insert(:client, business: other_coach.business, coach: other_coach)

      other_business_plan =
        insert(:training_plan,
          business: other_coach.business,
          creator: other_coach.user,
          client: other_business_client,
          kind: :client_plan
        )

      template = insert(:training_plan, business: ctx.coach.business, creator: ctx.coach.user)

      for plan <- [archived, other_client_plan, other_business_plan, template] do
        conn = get(ctx.conn, "/v1/client/training-plans/#{plan.id}")
        assert json_response(conn, 404)
      end
    end
  end

  describe "GET /v1/client/training-plans/coverage" do
    test "resolves one Client Plan and its scheduled workout for an explicit date", ctx do
      date = ~D[2026-08-15]
      plan = insert_client_plan(ctx, start_date: date, end_date: date)
      workout = insert(:workout, business: ctx.coach.business, plan: plan, position: 0)
      insert(:workout_schedule, business: ctx.coach.business, plan: plan, workout: workout, weekday: :saturday)

      conn = get(ctx.conn, "/v1/client/training-plans/coverage", %{"date" => Date.to_iso8601(date)})

      assert %{
               "data" => %{
                 "date" => "2026-08-15",
                 "weekday" => "saturday",
                 "plan" => %{"id" => plan_id, "kind" => "client_plan"},
                 "workout" => %{"id" => workout_id}
               }
             } = json_response(conn, 200)

      assert plan_id == plan.id
      assert workout_id == workout.id
    end

    test "returns a successful nullable result when no Client Plan supplies Coverage", ctx do
      conn = get(ctx.conn, "/v1/client/training-plans/coverage", %{"date" => "2026-08-15"})
      assert %{"data" => nil} = json_response(conn, 200)
    end

    test "rejects a malformed date instead of resolving today", ctx do
      conn = get(ctx.conn, "/v1/client/training-plans/coverage", %{"date" => "not-a-date"})

      assert %{"error_detail" => %{"fields" => %{"date" => ["is invalid"]}}} =
               json_response(conn, 422)
    end
  end

  defp insert_client_plan(ctx, attrs) do
    insert(
      :training_plan,
      Keyword.merge(
        [business: ctx.coach.business, creator: ctx.coach.user, client: ctx.client, kind: :client_plan],
        attrs
      )
    )
  end
end
