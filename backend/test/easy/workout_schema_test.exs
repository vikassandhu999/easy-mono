defmodule Easy.WorkoutSchemaTest do
  use Easy.SchemaCase
  alias Easy.Workouts
  alias Easy.Workouts.{Exercise, ExerciseGroup, Workout, WorkoutExercise, WorkoutSchedule}

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach)
    exercise = insert(:exercise, business: coach.business)

    {:ok, workout} =
      Workouts.create_workout(trainer_ctx(coach), %{
        name: "Workout",
        groups: [%{rounds: 3, exercises: [%{exercise_id: exercise.id}]}]
      })

    %{
      coach: coach,
      client: client,
      exercise: exercise,
      workout: workout,
      group: hd(workout.groups),
      item: hd(hd(workout.groups).exercises)
    }
  end

  test "trusted identities are never cast from editable fields", f do
    foreign = insert(:client)
    attrs = %{business_id: foreign.business_id, client_id: foreign.id, name: "Own", type: "open"}
    cs = Workout.insert_changeset(f.coach.business_id, f.client.id, attrs)
    assert get_field(cs, :business_id) == f.coach.business_id
    assert get_field(cs, :client_id) == f.client.id

    group =
      ExerciseGroup.insert_changeset(f.coach.business_id, f.workout.id, %{
        business_id: foreign.business_id,
        workout_id: Ecto.UUID.generate(),
        rounds: 3,
        position: 0
      })

    assert get_field(group, :business_id) == f.coach.business_id
    assert get_field(group, :workout_id) == f.workout.id

    item =
      WorkoutExercise.insert_changeset(f.coach.business_id, f.group.id, %{
        business_id: foreign.business_id,
        exercise_group_id: Ecto.UUID.generate(),
        exercise_id: f.exercise.id,
        position: 0
      })

    assert get_field(item, :business_id) == f.coach.business_id
    assert get_field(item, :exercise_group_id) == f.group.id

    cs =
      Exercise.insert_changeset(f.coach.business_id, %{
        name: "Own",
        kind: "movement",
        goals: ["strength"],
        places: ["gym"],
        business_id: foreign.business_id
      })

    assert get_field(cs, :business_id) == f.coach.business_id
  end

  test "database rejects cross-tenant client workout and group foreign keys", f do
    foreign = insert(:client)
    assert {:error, cs} = Workout.insert_changeset(f.coach.business_id, foreign.id, %{name: "No"}) |> Repo.insert()
    assert cs.errors[:client_id]

    assert_raise Ecto.ConstraintError, fn ->
      Repo.insert!(%ExerciseGroup{business_id: foreign.business_id, workout_id: f.workout.id, rounds: 3, position: 0})
    end
  end

  test "database denies a cross-tenant exercise despite a valid UUID", f do
    foreign = insert(:exercise)

    assert_raise Ecto.ConstraintError, fn ->
      Repo.insert!(%WorkoutExercise{
        business_id: f.coach.business_id,
        exercise_group_id: f.group.id,
        exercise_id: foreign.id,
        position: 1,
        exercise_snapshot: %{"id" => foreign.id, "metrics" => ["reps"]}
      })
    end
  end

  test "database rejects malformed target bounds and percentages", f do
    assert_raise Ecto.ConstraintError, fn ->
      Repo.update!(change(f.item, targets: [%{"reps" => %{"mode" => "range", "min" => 10, "max" => 5}}]))
    end
  end

  test "database rejects duplicate and null taxonomy tags", f do
    assert_raise Ecto.ConstraintError, fn -> Repo.update!(change(f.exercise, metrics: ["reps", "reps"])) end
  end

  test "database rejects invalid video ownership shape", f do
    assert_raise Ecto.ConstraintError, fn ->
      Repo.update!(change(f.workout, type: :open, video: "https://example.com"))
    end
  end

  test "schedule workout and coach foreign keys carry the tenant and client", f do
    {:ok, %{data: own}} = Workouts.create_workout_for_client(trainer_ctx(f.coach), f.client.id, %{name: "Own"})
    foreign = insert(:client)
    attrs = %{weekdays_mask: 1, from_date: Date.utc_today()}

    assert {:error, cs} =
             WorkoutSchedule.insert_changeset(f.coach.business_id, foreign.id, own.id, attrs) |> Repo.insert()

    assert cs.errors[:client_id]

    assert {:error, cs} =
             WorkoutSchedule.insert_changeset(
               f.coach.business_id,
               f.client.id,
               own.id,
               Map.put(attrs, :coach_id, foreign.coach_id)
             )
             |> Repo.insert()

    assert cs.errors[:coach_id]
  end
end
