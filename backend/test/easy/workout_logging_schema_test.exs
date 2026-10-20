defmodule Easy.WorkoutLoggingSchemaTest do
  use Easy.SchemaCase

  alias Easy.Workouts.{ExerciseLog, ExerciseSet, Recording, RoundTargets, Workout, WorkoutLog}

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach)
    exercise = insert(:exercise, business: coach.business)
    replacement = insert(:exercise, business: coach.business)
    groups = [%{rounds: 3, exercises: [%{exercise_id: exercise.id, side_mode: "per_side", targets: [%{}]}]}]
    workout = Repo.insert!(Workout.insert_changeset(coach.business_id, client.id, %{name: "Each side", groups: groups}, %{exercise.id => exercise}))

    session =
      Repo.insert!(%WorkoutLog{
        business_id: coach.business_id,
        client_id: client.id,
        workout_id: workout.id,
        recorded_by: :client,
        date: Date.utc_today(),
        exercise_logs: []
      })

    %{coach: coach, client: client, exercise: exercise, replacement: replacement, workout: workout, entry_id: hd(hd(workout.groups).exercises).id, session: session}
  end

  test "a prescribed slot is unique across replacement activities", f do
    original = activity(f, f.exercise, 0)
    replacement = activity(f, f.replacement, 1)
    session = %{f.session | exercise_logs: [original, replacement]}
    # Both commands see the same pre-write hierarchy; the database must catch the collision.
    first = Recording.record_set(session, original, f.exercise, %{round: 1, side: "left", reps: 8})
    duplicate = Recording.record_set(session, replacement, f.replacement, %{round: 1, side: "left", reps: 6})
    assert first.valid? and duplicate.valid?
    assert {:ok, saved} = Repo.insert(first)
    assert {:error, changeset} = Repo.insert(duplicate, mode: :savepoint)
    assert changeset.errors[:round]
    assert {_, metadata} = changeset.errors[:round]
    assert metadata[:constraint_name] == "exercise_sets_prescribed_slot"
    assert Repo.get!(ExerciseSet, saved.id).reps == 8

    right = Recording.record_set(session, replacement, f.replacement, %{round: 1, side: "right", reps: 6})
    assert {:ok, saved_right} = Repo.insert(right)
    assert Repo.get!(ExerciseSet, saved_right.id).side == :right
    assert Repo.aggregate(ExerciseSet, :count) == 2
  end

  test "recorder names use one total resolver for valid and unresolved recorders", f do
    client_log = %{f.session | client: %{f.client | preferred_name: "Alex"}}
    coach_log = %{f.session | recorded_by: :coach, coach: %{f.coach | preferred_name: "Sam"}}
    assert WorkoutLog.put_recorder_name(client_log).recorder_name == "Alex"
    assert WorkoutLog.put_recorder_name(coach_log).recorder_name == "Sam"

    for log <- [
          %{f.session | recorded_by: nil},
          %{f.session | recorded_by: :unknown},
          %{f.session | client: nil},
          %{f.session | recorded_by: :coach, coach: nil},
          %{f.session | client: %{f.client | preferred_name: nil, full_name: nil}},
          %WorkoutLog{recorded_by: :coach}
        ] do
      assert WorkoutLog.put_recorder_name(log).recorder_name == "Unknown recorder"
    end
  end

  test "the same added exercise twice has independent slots", f do
    first = activity(f, f.exercise, 0, %{workout_exercise_id: nil, side_mode: :combined})
    second = activity(f, f.exercise, 1, %{workout_exercise_id: nil, side_mode: :combined})
    session = %{f.session | exercise_logs: [first, second]}
    assert {:ok, one} = Repo.insert(Recording.record_set(session, first, f.exercise, %{round: 1, reps: 8}))
    assert {:ok, two} = Repo.insert(Recording.record_set(session, second, f.exercise, %{round: 1, reps: 6}))
    assert {one.exercise_log_id, two.exercise_log_id} == {first.id, second.id}
    assert {Repo.get!(ExerciseSet, one.id).reps, Repo.get!(ExerciseSet, two.id).reps} == {8, 6}

    duplicate = Recording.record_set(session, first, f.exercise, %{round: 1})
    assert {:error, changeset} = Repo.insert(duplicate, mode: :savepoint)
    assert {_, metadata} = changeset.errors[:round]
    assert metadata[:constraint_name] == "exercise_sets_activity_round_side"
  end

  test "a skipped activity cannot hold measurements", f do
    row = activity(f, f.exercise, 0)

    for measurement <- [%{reps: 1}, %{distance_m: Decimal.new(0)}, %{result: :win}] do
      changeset = row |> change(Map.put(measurement, :state, :skipped)) |> check_constraint(:state, name: :exercise_logs_values)
      assert {:error, rejected} = Repo.update(changeset, mode: :savepoint)
      assert errors_on(rejected).state
    end

    assert {:ok, skipped} = row |> change(state: :skipped) |> Repo.update()
    assert {skipped.state, skipped.reps, skipped.distance_m, skipped.result} == {:skipped, nil, nil, nil}

    set =
      Repo.insert!(%ExerciseSet{
        business_id: f.coach.business_id,
        exercise_log_id: row.id,
        state: :skipped,
        round: 1,
        side: :left
      })

    changeset = set |> change(reps: 1) |> check_constraint(:state, name: :exercise_sets_outcome_values)
    assert {:error, rejected} = Repo.update(changeset, mode: :savepoint)
    assert errors_on(rejected).state
    assert Repo.get!(ExerciseSet, set.id).reps == nil
  end

  test "a set inherits its parent's references", f do
    parent = activity(f, f.exercise, 0)

    set =
      Repo.insert!(%ExerciseSet{
        business_id: f.coach.business_id,
        exercise_log_id: parent.id,
        state: :completed,
        round: 1,
        side: :left
      })
      |> then(&Repo.get!(ExerciseSet, &1.id))

    assert {set.workout_log_id, set.workout_exercise_id, set.exercise_id} ==
             {parent.workout_log_id, parent.workout_exercise_id, parent.exercise_id}

    # Direct database writes cannot establish a second source for these references.
    Repo.update!(change(set, workout_log_id: Ecto.UUID.generate(), workout_exercise_id: Ecto.UUID.generate(), exercise_id: f.replacement.id))
    saved = Repo.get!(ExerciseSet, set.id)

    assert {saved.workout_log_id, saved.workout_exercise_id, saved.exercise_id} ==
             {parent.workout_log_id, parent.workout_exercise_id, parent.exercise_id}
  end

  test "an activity cannot move to another session or entry", f do
    row = activity(f, f.exercise, 0)

    other_session =
      Repo.insert!(%WorkoutLog{
        business_id: f.coach.business_id,
        client_id: f.client.id,
        recorded_by: :client,
        state: :completed,
        date: Date.utc_today(),
        exercise_logs: []
      })

    for changes <- [%{workout_log_id: other_session.id}, %{workout_exercise_id: Ecto.UUID.generate()}, %{workout_exercise_id: nil}] do
      assert_raise Ecto.ConstraintError, fn -> Repo.update!(change(row, changes), mode: :savepoint) end
      saved = Repo.get!(ExerciseLog, row.id)
      assert {saved.workout_log_id, saved.workout_exercise_id} == {f.session.id, f.entry_id}
    end
  end

  test "the recorder combination is enforced", f do
    for changes <- [%{recorded_by: :coach}, %{coach_id: f.coach.id}] do
      changeset = f.session |> change(changes) |> check_constraint(:recorded_by, name: :workout_logs_recorder_valid)
      assert {:error, rejected} = Repo.update(changeset, mode: :savepoint)
      assert errors_on(rejected).recorded_by
    end

    client_recorded = Repo.get!(WorkoutLog, f.session.id)
    assert {client_recorded.recorded_by, client_recorded.coach_id} == {:client, nil}
    assert {:ok, coach_recorded} = f.session |> change(recorded_by: :coach, coach_id: f.coach.id) |> Repo.update()
    assert {coach_recorded.recorded_by, coach_recorded.coach_id} == {:coach, f.coach.id}
    foreign = insert(:coach)

    changeset =
      coach_recorded
      |> change(coach_id: foreign.id)
      |> foreign_key_constraint(:coach_id, name: :workout_logs_coach_id_business_id_fkey)

    assert {:error, rejected} = Repo.update(changeset, mode: :savepoint)
    assert errors_on(rejected).coach_id
    assert Repo.get!(WorkoutLog, f.session.id).coach_id == f.coach.id
  end

  defp activity(f, exercise, position, overrides \\ %{}) do
    attrs =
      Map.merge(
        %{
          business_id: f.coach.business_id,
          workout_log_id: f.session.id,
          exercise_id: exercise.id,
          workout_exercise_id: f.entry_id,
          side_mode: :per_side,
          rounds: 3,
          position: position,
          targets: [%RoundTargets{}],
          sets: []
        },
        overrides
      )

    Repo.insert!(struct(ExerciseLog, attrs))
  end
end
