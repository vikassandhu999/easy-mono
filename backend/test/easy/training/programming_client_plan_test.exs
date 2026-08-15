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
end
