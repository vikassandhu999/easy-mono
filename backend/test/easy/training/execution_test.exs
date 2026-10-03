defmodule Easy.Training.ExecutionTest do
  use Easy.DataCase, async: true

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Training.{Execution, PlanReader}

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach)
    ctx = %Ctx{business_id: coach.business_id, user_id: client.user_id, client_id: client.id}

    %{coach: coach, client: client, ctx: ctx}
  end

  describe "resolve_client_startable_prescription/3" do
    test "resolves any workout in the Client Plan supplying Coverage, regardless of schedule", ctx do
      plan =
        insert_client_plan(ctx,
          start_date: Client.local_date(ctx.client, DateTime.utc_now()),
          end_date: Client.local_date(ctx.client, DateTime.utc_now())
        )

      guided = insert(:workout, business: ctx.coach.business, plan: plan, name: "Guided", position: 0)
      selected = insert(:workout, business: ctx.coach.business, plan: plan, name: "Selected", position: 1)

      insert(:workout_schedule,
        business: ctx.coach.business,
        plan: plan,
        workout: guided,
        weekday: weekday(Client.local_date(ctx.client, DateTime.utc_now()))
      )

      assert {:ok, %{plan: resolved_plan, workout: resolved_workout}} =
               PlanReader.resolve_client_startable_prescription(ctx.ctx, selected.id, Client.local_date(ctx.client, DateTime.utc_now()))

      assert resolved_plan.id == plan.id
      assert resolved_workout.id == selected.id
    end

    test "conceals workouts outside eligible Coverage", ctx do
      current = insert_client_plan(ctx, start_date: Client.local_date(ctx.client, DateTime.utc_now()))
      other_client = insert(:client, business: ctx.coach.business, coach: ctx.coach)

      other_plan =
        insert(:training_plan,
          kind: :client_plan,
          business: ctx.coach.business,
          creator: ctx.coach.user,
          client: other_client,
          start_date: Client.local_date(ctx.client, DateTime.utc_now())
        )

      current_workout = insert(:workout, business: ctx.coach.business, plan: current, position: 0)
      other_workout = insert(:workout, business: ctx.coach.business, plan: other_plan, position: 0)

      assert {:error, :not_found} =
               PlanReader.resolve_client_startable_prescription(ctx.ctx, current_workout.id, Date.add(Client.local_date(ctx.client, DateTime.utc_now()), -1))

      assert {:error, :not_found} =
               PlanReader.resolve_client_startable_prescription(ctx.ctx, other_workout.id, Client.local_date(ctx.client, DateTime.utc_now()))
    end
  end

  describe "start_client_session/3" do
    test "starts freestyle without a Client Plan or snapshot", ctx do
      assert {:ok, session} = Execution.start_client_session(ctx.ctx, nil, %{notes: "Unplanned work"})

      assert session.kind == :freestyle
      assert session.state == :active
      assert session.date == Client.local_date(ctx.client, session.started_at)
      assert session.notes == "Unplanned work"
      assert session.snapshot_version == nil
      assert session.prescription_snapshot == nil
      assert session.source_plan_id == nil
      assert session.source_workout_id == nil
    end

    test "freezes the complete ordered planned Prescription", ctx do
      plan =
        insert_client_plan(ctx,
          name: "Strength Block",
          revision: 7,
          start_date: Client.local_date(ctx.client, DateTime.utc_now()),
          end_date: Client.local_date(ctx.client, DateTime.utc_now())
        )

      workout = insert(:workout, business: ctx.coach.business, plan: plan, name: "Lower", position: 4)
      first = insert(:exercise, business: ctx.coach.business, name: "Back Squat", tracking_type: "weight_reps")
      second = insert(:exercise, business: ctx.coach.business, name: "Plank", tracking_type: "duration")

      second_prescription =
        insert(:prescribed_exercise,
          business: ctx.coach.business,
          workout: workout,
          exercise: second,
          position: 9,
          prescribed_sets: [%{set_type: :warmup, duration_seconds: 45, notes: "Brace"}]
        )

      first_prescription =
        insert(:prescribed_exercise,
          business: ctx.coach.business,
          workout: workout,
          exercise: first,
          position: 2,
          prescribed_sets: [
            %{
              set_type: :working,
              reps: "5",
              load_value: Decimal.new("100.5"),
              load_unit: :kg,
              duration_seconds: 30,
              distance_value: Decimal.new("1.25"),
              distance_unit: :km,
              rpe: Decimal.new("8.5"),
              rest_seconds: 120,
              notes: "Controlled"
            }
          ]
        )

      assert {:ok, started} = Execution.start_client_session(ctx.ctx, workout.id, %{})
      assert {:ok, active} = Execution.get_client_active_session(ctx.ctx)
      assert active.id == started.id
      assert active.snapshot_version == 1
      assert active.source_plan_id == plan.id
      assert active.source_workout_id == workout.id

      assert %{
               "version" => 1,
               "plan" => %{"id" => plan_id, "name" => "Strength Block", "revision" => 7},
               "workout" => %{"id" => workout_id, "name" => "Lower", "exercises" => exercises}
             } = active.prescription_snapshot

      assert plan_id == plan.id
      assert workout_id == workout.id

      assert [
               %{
                 "ref" => first_ref,
                 "position" => 2,
                 "exercise_id" => first_id,
                 "exercise_name" => "Back Squat",
                 "tracking_type" => "weight_reps",
                 "sets" => [set]
               },
               %{"ref" => second_ref, "position" => 9, "exercise_name" => "Plank"}
             ] = exercises

      assert first_ref == first_prescription.id
      assert first_id == first.id
      assert second_ref == second_prescription.id

      assert set == %{
               "set_type" => "working",
               "reps" => "5",
               "load_value" => "100.5",
               "load_unit" => "kg",
               "duration_seconds" => 30,
               "distance_value" => "1.25",
               "distance_unit" => "km",
               "rpe" => 8.5,
               "rest_seconds" => 120,
               "notes" => "Controlled"
             }
    end

    test "rejects a second active session", ctx do
      assert {:ok, _session} = Execution.start_client_session(ctx.ctx, nil, %{})
      assert {:error, :conflict} = Execution.start_client_session(ctx.ctx, nil, %{})
    end
  end

  describe "get_client_active_session/1" do
    test "returns nil when inactive and scopes the read to the trusted client", ctx do
      assert {:ok, nil} = Execution.get_client_active_session(ctx.ctx)

      other_client = insert(:client, business: ctx.coach.business, coach: ctx.coach)
      %Ctx{} = client_ctx = ctx.ctx
      other_ctx = %{client_ctx | user_id: other_client.user_id, client_id: other_client.id}
      assert {:ok, other_session} = Execution.start_client_session(other_ctx, nil, %{})

      assert {:ok, nil} = Execution.get_client_active_session(ctx.ctx)
      assert {:ok, loaded} = Execution.get_client_active_session(other_ctx)
      assert loaded.id == other_session.id
    end

    test "keeps the frozen snapshot readable after the plan is deleted", ctx do
      plan = insert_client_plan(ctx, start_date: Client.local_date(ctx.client, DateTime.utc_now()))
      workout = insert(:workout, business: ctx.coach.business, plan: plan, name: "Original", position: 0)

      assert {:ok, started} = Execution.start_client_session(ctx.ctx, workout.id, %{})
      assert {:ok, _deleted} = Repo.delete(plan)
      assert {:ok, active} = Execution.get_client_active_session(ctx.ctx)

      assert active.id == started.id
      assert active.prescription_snapshot["workout"]["name"] == "Original"
    end

    test "requires a trusted client identity", ctx do
      missing_client = %Ctx{business_id: ctx.coach.business_id, user_id: ctx.client.user_id}
      assert {:error, :not_found} = Execution.get_client_active_session(missing_client)
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

  defp weekday(date) do
    [:monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday]
    |> Enum.at(Date.day_of_week(date) - 1)
  end
end
