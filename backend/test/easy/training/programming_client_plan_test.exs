defmodule Easy.Training.ProgrammingClientPlanTest do
  use Easy.DataCase, async: true

  alias Easy.Repo
  alias Easy.Training.{Programming, TrainingPlan}

  describe "assign_template_to_client/4" do
    test "creates an independent Client Plan and advances onboarding atomically" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach, stage: :onboarding)
      template = insert(:training_plan, business: coach.business, creator: coach.user, name: "Strength Base")
      squat = insert(:exercise, business: coach.business, name: "Back Squat")
      press = insert(:exercise, business: coach.business, name: "Press")
      lower = insert(:workout, business: coach.business, plan: template, name: "Lower", position: 10)
      upper = insert(:workout, business: coach.business, plan: template, name: "Upper", position: 20)

      lower_item =
        insert(:prescribed_exercise,
          business: coach.business,
          workout: lower,
          exercise: squat,
          position: 40,
          prescribed_sets: [%{set_type: :working, reps: "5", load_value: Decimal.new("100"), load_unit: :kg}]
        )

      upper_item =
        insert(:prescribed_exercise,
          business: coach.business,
          workout: upper,
          exercise: press,
          position: 30,
          prescribed_sets: [%{set_type: :working, reps: "8-10"}]
        )

      insert(:workout_schedule, business: coach.business, plan: template, workout: lower, weekday: :monday)
      insert(:workout_schedule, business: coach.business, plan: template, workout: lower, weekday: :wednesday)
      insert(:workout_schedule, business: coach.business, plan: template, workout: upper, weekday: :friday)

      assert {:ok, assigned} =
               Programming.assign_template_to_client(
                 trainer_ctx(coach),
                 client.id,
                 template.id,
                 %{"start_date" => "2026-09-01", "end_date" => "2026-09-30"}
               )

      assert assigned.kind == :client_plan
      assert assigned.name == template.name
      assert assigned.description == template.description
      assert assigned.client_id == client.id
      assert assigned.source_template_id == template.id
      assert assigned.creator_id == coach.user_id
      assert assigned.revision == 1
      assert assigned.start_date == ~D[2026-09-01]
      assert assigned.end_date == ~D[2026-09-30]

      assert [copied_lower, copied_upper] = assigned.workouts
      assert Enum.map(assigned.workouts, &{&1.name, &1.position}) == [{"Lower", 10}, {"Upper", 20}]
      assert copied_lower.id != lower.id
      assert copied_upper.id != upper.id

      assert [%{id: copied_lower_item_id, prescribed_sets: [%{reps: "5"}]}] =
               copied_lower.prescribed_exercises

      assert [%{id: copied_upper_item_id, prescribed_sets: [%{reps: "8-10"}]}] =
               copied_upper.prescribed_exercises

      assert copied_lower_item_id != lower_item.id
      assert copied_upper_item_id != upper_item.id

      assert Enum.map(assigned.workout_schedule, &{&1.weekday, &1.training_workout_id}) == [
               {:monday, copied_lower.id},
               {:wednesday, copied_lower.id},
               {:friday, copied_upper.id}
             ]

      assert Repo.get!(Easy.Clients.Client, client.id).stage == :coaching

      assert {:ok, changed} =
               Programming.update_plan(trainer_ctx(coach), assigned.id, 1, %{"name" => "Individualized"})

      assert changed.name == "Individualized"
      assert Repo.get!(TrainingPlan, template.id).name == "Strength Base"
    end

    test "rejects invalid sources and invisible clients without advancing onboarding" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach, stage: :onboarding)
      archived = insert(:training_plan, business: coach.business, creator: coach.user, archived_at: ~U[2026-08-15 12:00:00Z])

      client_plan =
        insert(:training_plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan,
          start_date: ~D[2026-10-01]
        )

      other_coach = insert(:coach)
      hidden_template = insert(:training_plan, business: other_coach.business, creator: other_coach.user)
      hidden_client = insert(:client, business: other_coach.business, creator: other_coach, assigned_coach: other_coach)
      ctx = trainer_ctx(coach)

      for {target, source} <- [
            {client.id, archived.id},
            {client.id, client_plan.id},
            {client.id, hidden_template.id},
            {hidden_client.id, archived.id}
          ] do
        assert {:error, :not_found} = Programming.assign_template_to_client(ctx, target, source, %{})
      end

      assert Repo.get!(Easy.Clients.Client, client.id).stage == :onboarding
    end

    test "rolls onboarding back when Client Plan constraints reject Assignment" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach, stage: :onboarding)
      template = insert(:training_plan, business: coach.business, creator: coach.user)

      insert(:training_plan,
        business: coach.business,
        creator: coach.user,
        client: client,
        kind: :client_plan
      )

      assert {:error, changeset} =
               Programming.assign_template_to_client(trainer_ctx(coach), client.id, template.id, %{})

      assert %{client_id: [_]} = errors_on(changeset)
      assert Repo.get!(Easy.Clients.Client, client.id).stage == :onboarding
      assert Repo.aggregate(TrainingPlan.for_client(TrainingPlan, coach.business_id, client.id), :count, :id) == 1
    end
  end

  describe "Client Plan reads and lifecycle" do
    test "exports the canonical Client Plan lifecycle vocabulary" do
      assert TrainingPlan.lifecycles() == [:incomplete, :upcoming, :current, :ended, :archived]
    end

    test "lists visible Client Plans and derives lifecycle from Coverage dates" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      ctx = trainer_ctx(coach)

      incomplete = insert_client_plan(coach, client)
      archived = insert_client_plan(coach, client, archived_at: ~U[2026-08-15 12:00:00Z])

      assert {:ok, %{count: 1, plans: [listed]}} =
               Programming.list_plans_for_client(ctx, client.id, archived: false)

      assert listed.id == incomplete.id
      assert TrainingPlan.lifecycle(incomplete, ~D[2026-08-15]) == :incomplete
      assert TrainingPlan.lifecycle(%{incomplete | start_date: ~D[2026-08-20]}, ~D[2026-08-15]) == :upcoming

      assert TrainingPlan.lifecycle(
               %{incomplete | start_date: ~D[2026-08-01], end_date: nil},
               ~D[2026-08-15]
             ) == :current

      assert TrainingPlan.lifecycle(
               %{incomplete | start_date: ~D[2026-07-01], end_date: ~D[2026-07-31]},
               ~D[2026-08-15]
             ) == :ended

      assert TrainingPlan.lifecycle(archived, ~D[2026-08-15]) == :archived
    end

    test "conceals another coach's Client Plans" do
      owner = insert(:coach)
      colleague = insert(:coach, business: owner.business)
      client = insert(:client, business: owner.business, creator: owner, assigned_coach: owner)
      insert_client_plan(owner, client)

      assert {:error, :not_found} =
               Programming.list_plans_for_client(trainer_ctx(colleague), client.id)
    end

    test "client-self lists only its unarchived Client Plans and can inspect their Prescription" do
      today = ~D[2026-08-15]
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      other_client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      other_coach = insert(:coach)

      other_business_client =
        insert(:client, business: other_coach.business, creator: other_coach, assigned_coach: other_coach)

      incomplete = insert_client_plan(coach, client, name: "Incomplete")
      ended = insert_client_plan(coach, client, name: "Ended", start_date: ~D[2026-06-01], end_date: ~D[2026-06-30])
      current = insert_client_plan(coach, client, name: "Current", start_date: ~D[2026-08-01], end_date: today)
      upcoming = insert_client_plan(coach, client, name: "Upcoming", start_date: ~D[2026-09-01], end_date: ~D[2026-09-30])
      archived = insert_client_plan(coach, client, name: "Archived", archived_at: ~U[2026-08-15 12:00:00Z])
      insert_client_plan(coach, other_client, name: "Other client", start_date: ~D[2026-10-01])
      insert_client_plan(other_coach, other_business_client, name: "Other business", start_date: ~D[2026-10-01])

      workout = insert(:workout, business: coach.business, plan: current, name: "Lower", position: 3)
      exercise = insert(:exercise, business: coach.business, tracking_type: "weight_reps")

      insert(:prescribed_exercise,
        business: coach.business,
        workout: workout,
        exercise: exercise,
        position: 4,
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

      insert(:workout_schedule, business: coach.business, plan: current, workout: workout, weekday: :friday)
      ctx = client_ctx(client)

      assert {:ok, %{count: 4, plans: plans}} = Programming.list_client_plans(ctx)
      assert MapSet.new(Enum.map(plans, & &1.id)) == MapSet.new([incomplete.id, ended.id, current.id, upcoming.id])
      refute Enum.any?(plans, &(&1.id == archived.id))

      assert {:ok, inspected} = Programming.get_client_plan(ctx, current.id)
      assert [%{position: 3, prescribed_exercises: [%{position: 4, prescribed_sets: [set]}]}] = inspected.workouts
      assert set.notes == "Controlled"
      assert [%{weekday: :friday, training_workout_id: workout_id}] = inspected.workout_schedule
      assert workout_id == workout.id

      for hidden_id <- [archived.id, insert(:training_plan, business: coach.business, creator: coach.user).id] do
        assert {:error, :not_found} = Programming.get_client_plan(ctx, hidden_id)
      end
    end

    test "client-self reads require the trusted client id from Ctx" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      plan = insert_client_plan(coach, client)
      missing_client_ctx = %Easy.Ctx{business_id: coach.business_id, user_id: client.user_id}

      assert {:error, :not_found} = Programming.list_client_plans(missing_client_ctx)
      assert {:error, :not_found} = Programming.get_client_plan(missing_client_ctx, plan.id)
      assert {:error, :not_found} = Programming.resolve_client_coverage(missing_client_ctx, ~D[2026-08-15])
    end
  end

  describe "resolve_client_coverage/2" do
    test "resolves inclusive bounded Coverage and its scheduled workout guidance" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      plan = insert_client_plan(coach, client, start_date: ~D[2026-08-15], end_date: ~D[2026-08-15])
      workout = insert(:workout, business: coach.business, plan: plan, position: 0)
      insert(:workout_schedule, business: coach.business, plan: plan, workout: workout, weekday: :saturday)

      assert {:ok, %{plan: resolved, workout: guided, date: ~D[2026-08-15], weekday: :saturday}} =
               Programming.resolve_client_coverage(client_ctx(client), ~D[2026-08-15])

      assert resolved.id == plan.id
      assert guided.id == workout.id
    end

    test "resolves open-ended Coverage on and after its start date and returns nil on a rest day" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      plan = insert_client_plan(coach, client, start_date: ~D[2026-08-15], end_date: nil)
      insert(:workout, business: coach.business, plan: plan, position: 0)

      assert {:ok, %{plan: resolved, workout: nil, weekday: :monday}} =
               Programming.resolve_client_coverage(client_ctx(client), ~D[2026-08-17])

      assert resolved.id == plan.id
    end

    test "returns a successful nil result when no eligible Client Plan supplies Coverage" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      other_client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      other_coach = insert(:coach)

      other_business_client =
        insert(:client, business: other_coach.business, creator: other_coach, assigned_coach: other_coach)

      insert_client_plan(coach, client)
      insert_client_plan(coach, client, start_date: ~D[2026-09-01], end_date: ~D[2026-09-30])
      insert_client_plan(coach, client, start_date: ~D[2026-06-01], end_date: ~D[2026-06-30])
      insert_client_plan(coach, client, start_date: ~D[2026-08-01], archived_at: ~U[2026-08-15 12:00:00Z])
      insert_client_plan(coach, other_client, start_date: ~D[2026-08-01])
      insert_client_plan(other_coach, other_business_client, start_date: ~D[2026-08-01])

      assert {:ok, nil} = Programming.resolve_client_coverage(client_ctx(client), ~D[2026-08-15])
    end
  end

  defp insert_client_plan(coach, client, attrs \\ []) do
    insert(
      :training_plan,
      Keyword.merge(
        [business: coach.business, creator: coach.user, client: client, kind: :client_plan],
        attrs
      )
    )
  end

  defp client_ctx(client) do
    %Easy.Ctx{
      business_id: client.business_id,
      user_id: client.user_id,
      client_id: client.id
    }
  end
end
