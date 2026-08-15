defmodule Easy.Training.CanonicalSchemaTest do
  use Easy.DataCase, async: true

  describe "canonical Training constraints" do
    test "canonical factories persist valid planning and execution records" do
      coach = insert(:coach)
      plan = insert(:training_plan, business: coach.business, creator: coach.user)
      workout = insert(:workout, business: coach.business, plan: plan, position: 0)
      exercise = insert(:exercise, business: coach.business)

      prescribed =
        insert(:prescribed_exercise,
          business: coach.business,
          workout: workout,
          exercise: exercise,
          position: 0
        )

      schedule =
        insert(:workout_schedule,
          business: coach.business,
          plan: plan,
          workout: workout,
          weekday: :monday
        )

      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      session = insert(:workout_session, business: coach.business, client: client)
      performed = insert(:performed_set, business: coach.business, session: session)

      assert prescribed.training_workout_id == workout.id
      assert schedule.training_plan_id == plan.id
      assert session.kind == :freestyle
      assert performed.exercise_name == "Freestyle exercise"
    end

    test "the database rejects client-plan fields on a template" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_plans", [
          plan_row(coach,
            kind: "template",
            client_id: dump_uuid(client.id),
            start_date: ~D[2026-08-15]
          )
        ])
      end
    end

    test "the database rejects an unknown plan kind" do
      coach = insert(:coach)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_plans", [plan_row(coach, kind: "program")])
      end
    end

    test "workout positions are nonnegative" do
      coach = insert(:coach)
      plan = insert(:training_plan, business: coach.business, creator: coach.user)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_workouts", [
          timestamps(%{
            id: dump_uuid(),
            name: "Invalid",
            position: -1,
            business_id: dump_uuid(coach.business_id),
            training_plan_id: dump_uuid(plan.id)
          })
        ])
      end
    end

    test "workout positions are unique within a plan" do
      coach = insert(:coach)
      plan = insert(:training_plan, business: coach.business, creator: coach.user)
      insert(:workout, business: coach.business, plan: plan, position: 0)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_workouts", [workout_row(coach, plan, position: 0)])
      end
    end

    test "prescribed exercise positions are unique within a workout" do
      coach = insert(:coach)
      plan = insert(:training_plan, business: coach.business, creator: coach.user)
      workout = insert(:workout, business: coach.business, plan: plan, position: 0)
      exercise = insert(:exercise, business: coach.business)

      insert(:prescribed_exercise,
        business: coach.business,
        workout: workout,
        exercise: exercise,
        position: 0
      )

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_prescribed_exercises", [
          prescribed_row(coach, workout, exercise, position: 0)
        ])
      end
    end

    test "a schedule row cannot point at a workout from another plan" do
      coach = insert(:coach)
      first = insert(:training_plan, business: coach.business, creator: coach.user)
      second = insert(:training_plan, business: coach.business, creator: coach.user)
      workout = insert(:workout, business: coach.business, plan: first, position: 0)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_workout_schedule", [
          timestamps(%{
            id: dump_uuid(),
            weekday: "monday",
            business_id: dump_uuid(coach.business_id),
            training_plan_id: dump_uuid(second.id),
            training_workout_id: dump_uuid(workout.id)
          })
        ])
      end
    end

    test "a plan has at most one workout per weekday" do
      coach = insert(:coach)
      plan = insert(:training_plan, business: coach.business, creator: coach.user)
      first = insert(:workout, business: coach.business, plan: plan, position: 0)
      second = insert(:workout, business: coach.business, plan: plan, position: 1)

      insert(:workout_schedule,
        business: coach.business,
        plan: plan,
        workout: first,
        weekday: :monday
      )

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_workout_schedule", [
          schedule_row(coach, plan, second, weekday: "monday")
        ])
      end
    end

    test "a schedule accepts only canonical weekdays" do
      coach = insert(:coach)
      plan = insert(:training_plan, business: coach.business, creator: coach.user)
      workout = insert(:workout, business: coach.business, plan: plan, position: 0)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_workout_schedule", [
          schedule_row(coach, plan, workout, weekday: "funday")
        ])
      end
    end

    test "an active client has at most one incomplete plan" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      insert(:training_plan,
        business: coach.business,
        creator: coach.user,
        client: client,
        kind: :client_plan,
        start_date: nil,
        end_date: nil
      )

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_plans", [
          plan_row(coach,
            kind: "client_plan",
            client_id: dump_uuid(client.id),
            start_date: nil,
            end_date: nil
          )
        ])
      end
    end

    test "active client plan coverage cannot overlap" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      insert(:training_plan,
        business: coach.business,
        creator: coach.user,
        client: client,
        kind: :client_plan,
        start_date: ~D[2026-08-01],
        end_date: ~D[2026-08-31]
      )

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_plans", [
          plan_row(coach,
            kind: "client_plan",
            client_id: dump_uuid(client.id),
            start_date: ~D[2026-08-15],
            end_date: nil
          )
        ])
      end
    end

    test "a source template must belong to the same business" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      other_coach = insert(:coach)

      source =
        insert(:training_plan,
          business: other_coach.business,
          creator: other_coach.user,
          kind: :template
        )

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_plans", [
          plan_row(coach,
            kind: "client_plan",
            client_id: dump_uuid(client.id),
            source_template_id: dump_uuid(source.id),
            start_date: ~D[2026-09-01]
          )
        ])
      end
    end

    test "a planned session requires its versioned Prescription snapshot" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_sessions", [
          timestamps(%{
            id: dump_uuid(),
            kind: "planned",
            state: "active",
            date: ~D[2026-08-15],
            started_at: ~U[2026-08-15 09:00:00Z],
            business_id: dump_uuid(coach.business_id),
            client_id: dump_uuid(client.id)
          })
        ])
      end
    end

    test "a planned session snapshot version is positive" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_sessions", [
          session_row(coach, client,
            kind: "planned",
            snapshot_version: 0,
            prescription_snapshot: %{},
            source_plan_id: dump_uuid(),
            source_workout_id: dump_uuid()
          )
        ])
      end
    end

    test "a client has at most one active session" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      insert(:workout_session, business: coach.business, client: client)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_sessions", [session_row(coach, client)])
      end
    end

    test "terminal sessions require a close time" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_sessions", [
          session_row(coach, client, state: "completed", closed_at: nil)
        ])
      end
    end

    test "a session cannot close before it starts" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_sessions", [
          session_row(coach, client,
            state: "discarded",
            started_at: ~U[2026-08-15 10:00:00Z],
            closed_at: ~U[2026-08-15 09:59:59Z]
          )
        ])
      end
    end

    test "performed history requires a frozen nonblank exercise name" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      session = insert(:workout_session, business: coach.business, client: client)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("training_performed_sets", [
          timestamps(%{
            id: dump_uuid(),
            position: 0,
            exercise_name: "   ",
            set_type: "working",
            business_id: dump_uuid(session.business_id),
            training_session_id: dump_uuid(session.id)
          })
        ])
      end
    end
  end

  defp plan_row(coach, overrides) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          kind: "template",
          name: "Constraint probe",
          revision: 1,
          business_id: dump_uuid(coach.business_id),
          creator_id: dump_uuid(coach.user_id)
        },
        Map.new(overrides)
      )
    )
  end

  defp workout_row(coach, plan, overrides) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          name: "Constraint workout",
          position: 0,
          business_id: dump_uuid(coach.business_id),
          training_plan_id: dump_uuid(plan.id)
        },
        Map.new(overrides)
      )
    )
  end

  defp prescribed_row(coach, workout, exercise, overrides) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          position: 0,
          prescribed_sets: [],
          business_id: dump_uuid(coach.business_id),
          training_workout_id: dump_uuid(workout.id),
          exercise_id: dump_uuid(exercise.id)
        },
        Map.new(overrides)
      )
    )
  end

  defp schedule_row(coach, plan, workout, overrides) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          weekday: "monday",
          business_id: dump_uuid(coach.business_id),
          training_plan_id: dump_uuid(plan.id),
          training_workout_id: dump_uuid(workout.id)
        },
        Map.new(overrides)
      )
    )
  end

  defp session_row(coach, client, overrides \\ []) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          kind: "freestyle",
          state: "active",
          date: ~D[2026-08-15],
          started_at: ~U[2026-08-15 09:00:00Z],
          business_id: dump_uuid(coach.business_id),
          client_id: dump_uuid(client.id)
        },
        Map.new(overrides)
      )
    )
  end

  defp timestamps(row) do
    now = DateTime.utc_now(:second)
    Map.merge(row, %{inserted_at: now, updated_at: now})
  end

  defp dump_uuid(uuid \\ Ecto.UUID.generate()), do: Ecto.UUID.dump!(uuid)
end
