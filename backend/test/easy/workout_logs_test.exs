defmodule Easy.WorkoutLogsTest do
  use Easy.DataCase, async: true

  alias Easy.Ctx
  alias Easy.WorkoutLogs
  alias Easy.Workouts
  alias Easy.Workouts.{ExerciseLog, ExerciseSet, WorkoutLog}

  setup do
    coach = insert(:coach, preferred_name: "Sam")
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC", preferred_name: "Alex")
    exercise = insert(:exercise, business: coach.business)
    replacement = insert(:exercise, business: coach.business)
    ctx = trainer_ctx(coach)

    groups = [
      %{
        name: "Main",
        rounds: 3,
        exercises: [
          %{
            exercise_id: exercise.id,
            side_mode: "combined",
            targets: [%{reps: %{mode: "exact", value: 8}, rest: %{mode: "exact", value_s: 60}}]
          }
        ]
      }
    ]

    assert {:ok, %{data: workout}} = Workouts.create_workout_for_client(ctx, client.id, %{name: "Session", groups: groups})

    %{
      coach: coach,
      client: client,
      ctx: ctx,
      client_ctx: client_ctx(client),
      exercise: exercise,
      replacement: replacement,
      workout: workout,
      entry: hd(hd(workout.groups).exercises),
      today: Date.utc_today()
    }
  end

  test "client and coach starts set the recorder and reopen keeps it", f do
    client_log = start_log(f)
    assert {client_log.recorded_by, client_log.coach_id, client_log.recorder_name} == {:client, nil, "Alex"}

    assert {:ok, edited} = WorkoutLogs.update_workout_log_for_client(f.ctx, f.client.id, client_log.id, %{text: "Coach note"})
    assert {edited.recorded_by, edited.coach_id, edited.text} == {:client, nil, "Coach note"}
    assert {:ok, _} = WorkoutLogs.finish_workout_log_for_client(f.ctx, f.client.id, client_log.id, %{})
    assert {:ok, reopened} = WorkoutLogs.reopen_client_workout_log(f.client_ctx, client_log.id)
    assert {reopened.recorded_by, reopened.coach_id, reopened.recorder_name} == {:client, nil, "Alex"}
    assert {:ok, _} = WorkoutLogs.discard_client_workout_log(f.client_ctx, reopened.id)

    assert {:ok, coach_log} =
             WorkoutLogs.start_workout_log_for_client(f.ctx, f.client.id, %{id: Ecto.UUID.generate(), workout_id: f.workout.id})

    assert {coach_log.recorded_by, coach_log.coach_id, coach_log.recorder_name} == {:coach, f.coach.id, "Sam"}
    assert {:ok, _} = WorkoutLogs.update_client_workout_log(f.client_ctx, coach_log.id, %{text: "Client note"})
    assert {:ok, _} = WorkoutLogs.finish_client_workout_log(f.client_ctx, coach_log.id, %{})
    assert {:ok, reopened} = WorkoutLogs.reopen_workout_log_for_client(f.ctx, f.client.id, coach_log.id)
    assert {reopened.recorded_by, reopened.coach_id, reopened.text} == {:coach, f.coach.id, "Client note"}
  end

  test "a coach can start a coach-led occurrence and the client reads the same active log", f do
    leader = insert(:coach, business: f.coach.business)
    schedule = schedule(f, %{coach_id: leader.id})
    attrs = %{id: Ecto.UUID.generate(), schedule_id: schedule.id, scheduled_date: f.today}
    assert {:ok, log} = WorkoutLogs.start_workout_log_for_client(f.ctx, f.client.id, attrs)
    assert {log.workout_id, log.schedule_id, log.scheduled_date} == {f.workout.id, schedule.id, f.today}
    assert {log.recorded_by, log.coach_id} == {:coach, f.coach.id}
    assert {:ok, found} = WorkoutLogs.get_client_workout_log(f.client_ctx, log.id)
    assert {found.id, found.state, found.recorder_name} == {log.id, :active, "Sam"}
    assert {:ok, %{count: 1, workout_logs: [listed]}} = WorkoutLogs.list_client_workout_logs(f.client_ctx, [])
    assert listed.id == log.id

    assert {:ok, _} = WorkoutLogs.discard_workout_log_for_client(f.ctx, f.client.id, log.id)
    assert {:ok, client_log} = WorkoutLogs.start_client_workout_log(f.client_ctx, %{attrs | id: Ecto.UUID.generate()})
    assert {client_log.recorded_by, client_log.coach_id, client_log.schedule_id} == {:client, nil, schedule.id}
  end

  test "a second active log for the client is a conflict", f do
    log = start_log(f)
    assert {:error, :conflict} = WorkoutLogs.start_client_workout_log(f.client_ctx, %{id: Ecto.UUID.generate()})

    assert {:error, :conflict} =
             WorkoutLogs.start_workout_log_for_client(f.ctx, f.client.id, %{id: Ecto.UUID.generate(), workout_id: f.workout.id})

    assert Repo.aggregate(WorkoutLog, :count) == 1
    assert Repo.get!(WorkoutLog, log.id).state == :active
  end

  test "a claimed occurrence cannot be started twice; a discarded one frees it", f do
    schedule = schedule(f)
    attrs = %{schedule_id: schedule.id, scheduled_date: f.today}
    log = start_log(f, attrs)
    assert {:ok, _} = WorkoutLogs.finish_client_workout_log(f.client_ctx, log.id, %{})
    assert {:error, :conflict} = WorkoutLogs.start_client_workout_log(f.client_ctx, Map.put(attrs, :id, Ecto.UUID.generate()))
    assert {:ok, _} = WorkoutLogs.reopen_client_workout_log(f.client_ctx, log.id)
    assert {:ok, discarded} = WorkoutLogs.discard_client_workout_log(f.client_ctx, log.id)
    assert discarded.state == :discarded
    replacement = start_log(f, attrs)
    assert replacement.id != log.id
    assert replacement.schedule_id == schedule.id
    assert Repo.get!(WorkoutLog, log.id).state == :discarded
  end

  test "a future date is rejected", f do
    future = Date.add(f.today, 1)
    attrs = %{id: Ecto.UUID.generate(), date: future}
    assert {:error, changeset} = WorkoutLogs.start_client_workout_log(f.client_ctx, attrs)
    assert errors_on(changeset).date
    schedule = schedule(f)

    assert {:error, changeset} =
             WorkoutLogs.start_workout_log_for_client(f.ctx, f.client.id, %{
               id: Ecto.UUID.generate(),
               schedule_id: schedule.id,
               scheduled_date: future
             })

    assert errors_on(changeset).scheduled_date
    assert Repo.aggregate(WorkoutLog, :count) == 0
  end

  test "starting an activity creates only that activity with the entry's targets", f do
    log = start_log(f)
    assert log.exercise_logs == []
    {log, activity} = start_activity(f, log)
    assert {activity.workout_exercise_id, activity.exercise_id, activity.position} == {f.entry.id, f.exercise.id, 0}
    assert {activity.rounds, activity.side_mode, activity.targets_mode} == {3, :combined, :same_for_all}
    assert {hd(activity.targets).reps.value, hd(activity.targets).rest.value_s} == {8, Decimal.new(60)}
    assert {activity.reps, activity.weight_kg, activity.sets} == {nil, nil, []}
    assert hd(hd(log.workout.groups).exercises).exercise.id == f.exercise.id
    assert activity.exercise.id == f.exercise.id
    assert Repo.aggregate(ExerciseLog, :count) == 1
    assert Repo.aggregate(ExerciseSet, :count) == 0
  end

  test "a replacement before saved work reuses the activity", f do
    {log, activity} = f |> start_log() |> then(&start_activity(f, &1))
    attrs = %{id: Ecto.UUID.generate(), exercise_id: f.replacement.id}
    assert {:ok, changed} = WorkoutLogs.replace_client_activity(f.client_ctx, log.id, activity.id, attrs)
    [replacement] = changed.exercise_logs

    assert {replacement.id, replacement.exercise_id, replacement.workout_exercise_id} ==
             {activity.id, f.replacement.id, f.entry.id}

    assert {replacement.rounds, replacement.targets_mode, hd(replacement.targets).reps} == {3, :same_for_all, nil}
    assert hd(replacement.targets).rest.value_s == Decimal.new(60)
    assert replacement.sets == []
    assert {:ok, repeated} = WorkoutLogs.replace_client_activity(f.client_ctx, log.id, activity.id, attrs)
    assert hd(repeated.exercise_logs).id == activity.id

    assert {:error, :conflict} =
             WorkoutLogs.replace_client_activity(f.client_ctx, log.id, activity.id, %{attrs | exercise_id: f.exercise.id})

    assert Repo.aggregate(ExerciseLog, :count) == 1
  end

  test "a replacement after a recorded set creates a new activity and keeps the set", f do
    {log, activity} = f |> start_log() |> then(&start_activity(f, &1))
    {log, set} = record_set(f, log, activity, %{round: 1, reps: 5})
    replacement_id = Ecto.UUID.generate()
    attrs = %{id: replacement_id, exercise_id: f.replacement.id}
    assert {:ok, changed} = WorkoutLogs.replace_activity_for_client(f.ctx, f.client.id, log.id, activity.id, attrs)
    [original, replacement] = changed.exercise_logs
    assert {original.id, hd(original.sets).id, hd(original.sets).reps} == {activity.id, set.id, 5}
    assert {replacement.id, replacement.exercise_id, replacement.position} == {replacement_id, f.replacement.id, 1}

    assert {replacement.rounds, hd(replacement.targets).reps, hd(replacement.targets).rest.value_s} ==
             {3, nil, Decimal.new(60)}

    assert {:ok, retried} = WorkoutLogs.replace_activity_for_client(f.ctx, f.client.id, log.id, activity.id, attrs)
    assert Enum.map(retried.exercise_logs, & &1.id) == [activity.id, replacement_id]

    assert {:error, :conflict} =
             WorkoutLogs.replace_client_activity(f.client_ctx, log.id, activity.id, %{attrs | exercise_id: f.exercise.id})

    assert Repo.aggregate(ExerciseLog, :count) == 2
    assert Repo.aggregate(ExerciseSet, :count) == 1
  end

  test "a side-specific swap keeps left on the original and right on the replacement", f do
    f = each_side(f)
    {log, activity} = f |> start_log() |> then(&start_activity(f, &1))
    {log, left} = record_set(f, log, activity, %{round: 1, side: "left", reps: 10})
    id = Ecto.UUID.generate()

    assert {:ok, log} =
             WorkoutLogs.replace_client_activity(f.client_ctx, log.id, activity.id, %{id: id, exercise_id: f.replacement.id})

    replacement = find_activity(log, id)
    {log, right} = record_set(f, log, replacement, %{round: 1, side: "right", reps: 8})
    attrs = %{id: Ecto.UUID.generate(), state: "completed", round: 1, side: "left", reps: 7}
    assert {:error, changeset} = WorkoutLogs.record_client_set(f.client_ctx, log.id, replacement.id, attrs)
    assert errors_on(changeset).round
    [original, replacement] = log.exercise_logs
    assert {hd(original.sets).id, hd(original.sets).reps, hd(original.sets).side} == {left.id, 10, :left}
    assert {hd(replacement.sets).id, hd(replacement.sets).reps, hd(replacement.sets).side} == {right.id, 8, :right}
    assert Repo.aggregate(ExerciseSet, :count) == 2
  end

  test "skipped and missing sets stay distinct through finish and reopen", f do
    {log, activity} = f |> start_log() |> then(&start_activity(f, &1))
    {log, done} = record_set(f, log, activity, %{round: 1, reps: 8})
    {log, skipped} = record_set(f, log, activity, %{round: 2, state: "skipped"})
    assert {:ok, _} = WorkoutLogs.finish_client_workout_log(f.client_ctx, log.id, %{})
    assert {:ok, _} = WorkoutLogs.reopen_client_workout_log(f.client_ctx, log.id)
    assert {:ok, finished} = WorkoutLogs.finish_workout_log_for_client(f.ctx, f.client.id, log.id, %{})
    [activity] = finished.exercise_logs
    assert {finished.state, activity.state} == {:completed, :active}
    assert Enum.map(activity.sets, &{&1.id, &1.round, &1.state}) == [{done.id, 1, :completed}, {skipped.id, 2, :skipped}]
    refute Enum.any?(activity.sets, &(&1.round == 3))
    assert Repo.aggregate(ExerciseSet, :count) == 2
  end

  test "partial intervals keep the reported overall result", f do
    assert {:ok, run} = Workouts.create_exercise(f.ctx, %{name: "Run", kind: "activity"})
    log = start_log(f, %{workout_id: nil})
    {log, activity} = start_activity(f, log, %{workout_exercise_id: nil, exercise_id: run.id})

    assert {:ok, log} =
             WorkoutLogs.update_client_activity(f.client_ctx, log.id, activity.id, %{distance_m: 5000, duration_s: "1800.5"})

    activity = find_activity(log, activity.id)
    {log, _} = record_set(f, log, activity, %{round: 1, distance_m: 1000, duration_s: "360.25"})
    {log, _} = record_set(f, log, activity, %{round: 2, distance_m: 1000, duration_s: "350.5"})
    assert {:ok, completed} = WorkoutLogs.complete_client_activity(f.client_ctx, log.id, activity.id, %{})
    [activity] = completed.exercise_logs
    assert {activity.distance_m, activity.duration_s} == {Decimal.new(5000), Decimal.new("1800.5")}
    assert Enum.map(activity.sets, & &1.distance_m) == [Decimal.new(1000), Decimal.new(1000)]
    assert activity.reps == nil
  end

  test "completing without measurements stores no numbers", f do
    {log, activity} = f |> start_log() |> then(&start_activity(f, &1))
    assert {:ok, log} = WorkoutLogs.complete_activity_for_client(f.ctx, f.client.id, log.id, activity.id, %{})
    [completed] = log.exercise_logs
    assert {completed.state, completed.reps, completed.weight_kg, completed.sets} == {:completed, nil, nil, []}
    {log, done} = record_set(f, log, completed, %{round: 1})
    assert {done.state, done.reps, done.weight_kg, done.duration_s} == {:completed, nil, nil, nil}
    assert hd(log.exercise_logs).reps == nil
    assert Repo.aggregate(ExerciseSet, :count) == 1
  end

  test "skipping recorded work is rejected", f do
    {log, activity} = f |> start_log() |> then(&start_activity(f, &1))
    {log, done} = record_set(f, log, activity, %{round: 1})
    assert {:error, changeset} = WorkoutLogs.skip_client_activity(f.client_ctx, log.id, activity.id)
    assert errors_on(changeset).state
    assert {:error, changeset} = WorkoutLogs.correct_client_set(f.client_ctx, log.id, activity.id, done.id, %{state: "skipped"})
    assert errors_on(changeset).state
    assert Repo.get!(ExerciseSet, done.id).state == :completed
  end

  test "a closed workout rejects activity and set writes", f do
    {log, activity} = f |> start_log() |> then(&start_activity(f, &1))
    {log, set} = record_set(f, log, activity, %{round: 1, reps: 8})
    assert {:ok, _} = WorkoutLogs.finish_client_workout_log(f.client_ctx, log.id, %{})

    for {name, args} <- closed_commands(f, log, activity, set) do
      assert {:error, %Ecto.Changeset{}} = apply(WorkoutLogs, name, [f.client_ctx | args]), "#{name} changed a closed workout"
    end

    assert {:ok, retained} = WorkoutLogs.get_client_workout_log(f.client_ctx, log.id)
    assert {retained.state, hd(hd(retained.exercise_logs).sets).reps} == {:completed, 8}
  end

  test "retrying start_activity with the same id returns the session; different content conflicts", f do
    log = start_log(f)
    id = Ecto.UUID.generate()
    attrs = %{id: id, exercise_id: f.exercise.id, workout_exercise_id: f.entry.id}
    assert {:ok, first} = WorkoutLogs.start_client_activity(f.client_ctx, log.id, attrs)
    assert {:ok, retried} = WorkoutLogs.start_activity_for_client(f.ctx, f.client.id, log.id, attrs)
    assert Enum.map(retried.exercise_logs, & &1.id) == [id]
    assert hd(retried.exercise_logs).updated_at == hd(first.exercise_logs).updated_at
    assert {:error, :conflict} = WorkoutLogs.start_client_activity(f.client_ctx, log.id, %{attrs | exercise_id: f.replacement.id})
    assert Repo.aggregate(ExerciseLog, :count) == 1
  end

  test "retrying record_set with the same id is idempotent", f do
    {log, activity} = f |> start_log() |> then(&start_activity(f, &1))
    attrs = %{id: Ecto.UUID.generate(), state: "completed", round: 1, reps: 8, weight_kg: "20.0", entered_units: %{weight: "lb"}}
    assert {:ok, first} = WorkoutLogs.record_client_set(f.client_ctx, log.id, activity.id, attrs)

    assert {:ok, retried} =
             WorkoutLogs.record_set_for_client(f.ctx, f.client.id, log.id, activity.id, %{attrs | weight_kg: 20})

    first_set = hd(hd(first.exercise_logs).sets)
    retried_set = hd(hd(retried.exercise_logs).sets)
    assert {retried_set.id, retried_set.reps} == {attrs.id, 8}
    assert Decimal.equal?(retried_set.weight_kg, Decimal.new(20))
    assert retried_set.updated_at == first_set.updated_at
    assert {:error, :conflict} = WorkoutLogs.record_client_set(f.client_ctx, log.id, activity.id, %{attrs | reps: 9})
    assert {:error, :conflict} = WorkoutLogs.record_client_set(f.client_ctx, log.id, activity.id, %{attrs | entered_units: %{weight: "kg"}})
    assert Repo.aggregate(ExerciseSet, :count) == 1
  end

  test "repeated transitions return the session unchanged", f do
    {log, activity} = f |> start_log() |> then(&start_activity(f, &1))
    assert {:ok, completed} = WorkoutLogs.complete_client_activity(f.client_ctx, log.id, activity.id, %{})
    assert {:ok, repeated} = WorkoutLogs.complete_client_activity(f.client_ctx, log.id, activity.id, %{})
    assert snapshot(repeated) == snapshot(completed)
    assert {:ok, reopened} = WorkoutLogs.reopen_client_activity(f.client_ctx, log.id, activity.id)
    assert {:ok, repeated} = WorkoutLogs.reopen_activity_for_client(f.ctx, f.client.id, log.id, activity.id)
    assert snapshot(repeated) == snapshot(reopened)
    assert {:ok, skipped} = WorkoutLogs.skip_client_activity(f.client_ctx, log.id, activity.id)
    assert {:ok, repeated} = WorkoutLogs.skip_activity_for_client(f.ctx, f.client.id, log.id, activity.id)
    assert snapshot(repeated) == snapshot(skipped)
    assert {:ok, finished} = WorkoutLogs.finish_client_workout_log(f.client_ctx, log.id, %{})
    assert {:ok, repeated} = WorkoutLogs.finish_workout_log_for_client(f.ctx, f.client.id, log.id, %{})
    assert snapshot(repeated) == snapshot(finished)
    assert {:ok, reopened} = WorkoutLogs.reopen_client_workout_log(f.client_ctx, log.id)
    assert {:ok, repeated} = WorkoutLogs.reopen_workout_log_for_client(f.ctx, f.client.id, log.id)
    assert snapshot(repeated) == snapshot(reopened)
    assert {:ok, discarded} = WorkoutLogs.discard_client_workout_log(f.client_ctx, log.id)
    assert {:ok, repeated} = WorkoutLogs.discard_workout_log_for_client(f.ctx, f.client.id, log.id)
    assert snapshot(repeated) == snapshot(discarded)
  end

  test "client and coach activity completion retries compare canonical measurements", f do
    {log, activity} = f |> start_log() |> then(&start_activity(f, &1))
    measurements = %{reps: 8, weight_kg: "20.0", entered_units: %{weight: "lb"}}
    assert {:ok, completed} = WorkoutLogs.complete_client_activity(f.client_ctx, log.id, activity.id, measurements)
    assert {hd(completed.exercise_logs).state, hd(completed.exercise_logs).reps} == {:completed, 8}

    for attrs <- [measurements, %{"reps" => "8", "weight_kg" => "20.00", "entered_units" => %{"weight" => "lb"}}, %{weight_kg: 20}, %{}] do
      assert {:ok, replayed} = WorkoutLogs.complete_client_activity(f.client_ctx, log.id, activity.id, attrs)
      assert snapshot(replayed) == snapshot(completed)
      assert {:ok, replayed} = WorkoutLogs.complete_activity_for_client(f.ctx, f.client.id, log.id, activity.id, attrs)
      assert snapshot(replayed) == snapshot(completed)
    end

    for attrs <- [%{reps: 9}, %{weight_kg: 21}, %{weight_kg: nil}, %{entered_units: %{weight: "kg"}}, %{reps: "8.5"}] do
      assert {:error, %Ecto.Changeset{}} = WorkoutLogs.complete_client_activity(f.client_ctx, log.id, activity.id, attrs)
      assert {:error, %Ecto.Changeset{}} = WorkoutLogs.complete_activity_for_client(f.ctx, f.client.id, log.id, activity.id, attrs)
    end

    assert {:ok, retained} = WorkoutLogs.get_client_workout_log(f.client_ctx, log.id)
    assert snapshot(retained) == snapshot(completed)

    assert {:ok, closed} = WorkoutLogs.finish_client_workout_log(f.client_ctx, log.id, %{})

    for attrs <- [measurements, %{weight_kg: 20}, %{}] do
      assert {:ok, replayed} = WorkoutLogs.complete_client_activity(f.client_ctx, log.id, activity.id, attrs)
      assert snapshot(replayed) == snapshot(closed)
      assert {:ok, replayed} = WorkoutLogs.complete_activity_for_client(f.ctx, f.client.id, log.id, activity.id, attrs)
      assert snapshot(replayed) == snapshot(closed)
    end

    assert {:error, %Ecto.Changeset{}} = WorkoutLogs.complete_client_activity(f.client_ctx, log.id, activity.id, %{reps: 9})
    assert {:error, %Ecto.Changeset{}} = WorkoutLogs.complete_activity_for_client(f.ctx, f.client.id, log.id, activity.id, %{reps: 9})
  end

  test "client and coach set removal retries keep the authorized activity and session unchanged", f do
    {log, activity} = f |> start_log() |> then(&start_activity(f, &1))
    {log, set} = record_set(f, log, activity, %{round: 1, reps: 8})
    assert {:ok, removed} = WorkoutLogs.remove_client_set(f.client_ctx, log.id, activity.id, set.id)
    assert hd(removed.exercise_logs).sets == []
    assert Repo.get(ExerciseSet, set.id) == nil

    assert {:ok, repeated} = WorkoutLogs.remove_client_set(f.client_ctx, log.id, activity.id, set.id)
    assert snapshot(repeated) == snapshot(removed)
    assert {:ok, repeated} = WorkoutLogs.remove_set_for_client(f.ctx, f.client.id, log.id, activity.id, set.id)
    assert snapshot(repeated) == snapshot(removed)

    missing_activity = Ecto.UUID.generate()
    assert {:error, :not_found} = WorkoutLogs.remove_client_set(f.client_ctx, log.id, missing_activity, set.id)
    assert {:error, :not_found} = WorkoutLogs.remove_set_for_client(f.ctx, f.client.id, log.id, missing_activity, set.id)
    assert {:error, :not_found} = WorkoutLogs.remove_client_set(f.client_ctx, log.id, activity.id, "invalid")
    assert {:error, :not_found} = WorkoutLogs.remove_set_for_client(f.ctx, f.client.id, log.id, activity.id, "invalid")

    {log, other_activity} = start_activity(f, removed, %{exercise_id: f.replacement.id, workout_exercise_id: nil})
    {log, other_set} = record_set(f, log, other_activity, %{round: 1, reps: 5})
    assert {:error, :not_found} = WorkoutLogs.remove_client_set(f.client_ctx, log.id, activity.id, other_set.id)
    assert {:error, :not_found} = WorkoutLogs.remove_set_for_client(f.ctx, f.client.id, log.id, activity.id, other_set.id)
    assert Repo.get!(ExerciseSet, other_set.id).reps == 5

    foreign_coach = insert(:coach)
    assert {:error, :not_found} = WorkoutLogs.remove_set_for_client(trainer_ctx(foreign_coach), f.client.id, log.id, activity.id, set.id)
    assert {:error, :not_found} = WorkoutLogs.remove_client_set(client_ctx(insert(:client)), log.id, activity.id, set.id)
  end

  test "finish accepts no feedback and stores effort from 1 to 5", f do
    log = start_log(f)
    assert {:ok, empty} = WorkoutLogs.finish_client_workout_log(f.client_ctx, log.id, %{})
    assert {empty.state, empty.effort, empty.pain, empty.text} == {:completed, nil, nil, nil}
    assert {:ok, _} = WorkoutLogs.reopen_client_workout_log(f.client_ctx, log.id)

    for effort <- [0, 6] do
      assert {:error, changeset} = WorkoutLogs.finish_client_workout_log(f.client_ctx, log.id, %{effort: effort})
      assert errors_on(changeset).effort
    end

    for effort <- 1..5 do
      assert {:ok, saved} = WorkoutLogs.finish_client_workout_log(f.client_ctx, log.id, %{effort: effort})
      assert saved.effort == effort
      assert {:ok, _} = WorkoutLogs.reopen_client_workout_log(f.client_ctx, log.id)
    end

    assert {:ok, saved} = WorkoutLogs.finish_client_workout_log(f.client_ctx, log.id, %{pain: false, text: "  Felt good\nNo pain  "})
    assert {saved.pain, saved.text} == {false, "Felt good\nNo pain"}
  end

  test "an archived prescribed exercise can still be logged; an archived replacement cannot be newly chosen", f do
    assert {:ok, _} = Workouts.archive_exercise(f.ctx, f.exercise.id)
    assert {:ok, _} = Workouts.archive_exercise(f.ctx, f.replacement.id)
    {log, activity} = f |> start_log() |> then(&start_activity(f, &1))
    assert activity.exercise_id == f.exercise.id
    attrs = %{id: Ecto.UUID.generate(), exercise_id: f.replacement.id}
    assert {:error, changeset} = WorkoutLogs.replace_client_activity(f.client_ctx, log.id, activity.id, attrs)
    assert errors_on(changeset).exercise_id

    assert {:error, changeset} =
             WorkoutLogs.start_client_activity(f.client_ctx, log.id, %{
               id: Ecto.UUID.generate(),
               exercise_id: f.exercise.id
             })

    assert errors_on(changeset).exercise_id
    {_, done} = record_set(f, log, activity, %{round: 1, reps: 8})
    assert done.reps == 8
  end

  test "finish retries compare normalized feedback without changing the completed session", f do
    log = start_log(f)
    feedback = %{effort: 4, pain: false, text: "  Felt good  "}
    assert {:ok, finished} = WorkoutLogs.finish_client_workout_log(f.client_ctx, log.id, feedback)

    for attrs <- [feedback, %{"effort" => "4", "pain" => false, "text" => "Felt good"}, %{pain: false}, %{}] do
      assert {:ok, replayed} = WorkoutLogs.finish_client_workout_log(f.client_ctx, log.id, attrs)
      assert snapshot(replayed) == snapshot(finished)
      assert {:ok, replayed} = WorkoutLogs.finish_workout_log_for_client(f.ctx, f.client.id, log.id, attrs)
      assert snapshot(replayed) == snapshot(finished)
    end

    for attrs <- [%{effort: 3}, %{pain: true}, %{text: nil}, %{effort: 6}, %{text: "Different"}] do
      assert {:error, %Ecto.Changeset{}} = WorkoutLogs.finish_client_workout_log(f.client_ctx, log.id, attrs)
      assert {:error, %Ecto.Changeset{}} = WorkoutLogs.finish_workout_log_for_client(f.ctx, f.client.id, log.id, attrs)
    end

    assert {:ok, retained} = WorkoutLogs.get_client_workout_log(f.client_ctx, log.id)
    assert snapshot(retained) == snapshot(finished)
  end

  test "state and scheduled date filters scope counts and rows to the authorized client", f do
    schedule = schedule(f)
    yesterday = Date.add(f.today, -1)
    completed = start_log(f, %{schedule_id: schedule.id, scheduled_date: f.today, date: yesterday})
    assert {:ok, _} = WorkoutLogs.finish_client_workout_log(f.client_ctx, completed.id, %{})
    discarded = start_log(f)
    assert {:ok, _} = WorkoutLogs.discard_client_workout_log(f.client_ctx, discarded.id)
    active = start_log(f, %{date: yesterday})

    for client <- [insert(:client, business: f.coach.business, coach: f.coach), insert(:client)] do
      Repo.insert!(%WorkoutLog{business_id: client.business_id, client_id: client.id, recorded_by: :client, date: yesterday})
    end

    lists = [
      &WorkoutLogs.list_client_workout_logs(f.client_ctx, &1),
      &WorkoutLogs.list_workout_logs_for_client(f.ctx, f.client.id, &1)
    ]

    for list <- lists do
      for {state, id} <- [{:active, active.id}, {:completed, completed.id}, {:discarded, discarded.id}] do
        assert {:ok, %{count: 1, workout_logs: [found]}} = list.(state: state, limit: 1)
        assert found.id == id
      end

      assert {:ok, %{count: 1, workout_logs: [found]}} = list.(state: "active", date: yesterday)
      assert found.id == active.id
      assert {:ok, %{count: 1, workout_logs: [found]}} = list.(scheduled_date: f.today, state: :completed)
      assert {found.id, found.date, found.scheduled_date} == {completed.id, yesterday, f.today}
      assert {:ok, %{count: 0, workout_logs: []}} = list.(scheduled_date: yesterday)
      assert {:ok, %{count: 0, workout_logs: []}} = list.(scheduled_date: f.today, date: f.today)

      for {field, value} <- [state: "unknown", state: 1, scheduled_date: "invalid"] do
        assert {:error, changeset} = list.([{field, value}])
        assert errors_on(changeset)[field]
      end
    end

    foreign = insert(:business)
    assert {:error, :not_found} = WorkoutLogs.list_client_workout_logs(%{f.client_ctx | business_id: foreign.id}, state: :active)
    assert {:error, :not_found} = WorkoutLogs.list_workout_logs_for_client(trainer_ctx(insert(:coach)), f.client.id, scheduled_date: f.today)
  end

  test "retrying start uses its original id and a different prescription conflicts", f do
    id = Ecto.UUID.generate()
    attrs = %{id: id, workout_id: f.workout.id}
    assert {:ok, first} = WorkoutLogs.start_client_workout_log(f.client_ctx, attrs)
    assert {:ok, repeated} = WorkoutLogs.start_workout_log_for_client(f.ctx, f.client.id, attrs)

    assert {repeated.id, repeated.recorded_by, repeated.inserted_at, repeated.updated_at} ==
             {id, :client, first.inserted_at, first.updated_at}

    assert {:ok, %{data: another}} = Workouts.create_workout_for_client(f.ctx, f.client.id, %{name: "Another", type: "open"})
    assert {:error, :conflict} = WorkoutLogs.start_client_workout_log(f.client_ctx, %{attrs | workout_id: another.id})
    assert Repo.aggregate(WorkoutLog, :count) == 1
  end

  test "set corrections preserve slots and explicit removal removes only the selected row", f do
    {log, activity} = f |> start_log() |> then(&start_activity(f, &1))
    {log, first} = record_set(f, log, activity, %{round: 1, reps: 8})
    {log, second} = record_set(f, log, activity, %{round: 2, state: "skipped"})

    assert {:ok, changed} =
             WorkoutLogs.correct_set_for_client(f.ctx, f.client.id, log.id, activity.id, first.id, %{reps: 9})

    corrected = hd(hd(changed.exercise_logs).sets)
    assert {corrected.id, corrected.round, corrected.reps} == {first.id, 1, 9}
    assert {:ok, performed} = WorkoutLogs.correct_client_set(f.client_ctx, log.id, activity.id, second.id, %{state: "completed", reps: 5})

    assert Enum.map(hd(performed.exercise_logs).sets, &{&1.id, &1.state, &1.reps}) ==
             [{first.id, :completed, 9}, {second.id, :completed, 5}]

    assert {:ok, removed} = WorkoutLogs.remove_set_for_client(f.ctx, f.client.id, log.id, activity.id, first.id)
    assert Enum.map(hd(removed.exercise_logs).sets, & &1.id) == [second.id]
    assert Repo.get(ExerciseSet, first.id) == nil
    assert Repo.get!(ExerciseSet, second.id).reps == 5
  end

  test "lists filter dates, count before pagination, and order equal dates by id", f do
    first = start_log(f, %{date: Date.add(f.today, -1)})
    assert {:ok, _} = WorkoutLogs.finish_client_workout_log(f.client_ctx, first.id, %{})
    second = start_log(f)
    assert {:ok, _} = WorkoutLogs.finish_client_workout_log(f.client_ctx, second.id, %{})
    third = start_log(f)
    ids = Enum.sort([second.id, third.id], :desc)
    assert {:ok, %{count: 3, workout_logs: [latest]}} = WorkoutLogs.list_client_workout_logs(f.client_ctx, limit: 1)
    assert latest.id == hd(ids)

    assert {:ok, %{count: 2, workout_logs: [next]}} =
             WorkoutLogs.list_workout_logs_for_client(f.ctx, f.client.id, date: f.today, offset: 1, limit: 1)

    assert next.id == List.last(ids)

    assert {:ok, %{count: 1, workout_logs: [past]}} =
             WorkoutLogs.list_client_workout_logs(f.client_ctx, date: Date.add(f.today, -1))

    assert past.id == first.id
  end

  test "another business's coach and a coach without client access cannot call any operation", f do
    {log, activity} = f |> start_log() |> then(&start_activity(f, &1))
    {log, set} = record_set(f, log, activity, %{round: 1, reps: 8})
    inaccessible = insert(:coach, business: f.coach.business)
    foreign = insert(:coach)

    for coach <- [inaccessible, foreign] do
      assert_coach_denied(trainer_ctx(coach), f, log, activity, set)
    end

    assert Repo.get!(WorkoutLog, log.id).state == :active
    assert Repo.get!(ExerciseSet, set.id).reps == 8
  end

  test "another client cannot reach any recording operation on this client's records", f do
    {log, activity} = f |> start_log() |> then(&start_activity(f, &1))
    {log, set} = record_set(f, log, activity, %{round: 1, reps: 8})
    another = insert(:client, business: f.coach.business, coach: f.coach, timezone: "Etc/UTC")
    ctx = client_ctx(another)
    assert_client_denied(ctx, f, log, activity, set, except: [:list_client_workout_logs])
    assert {:ok, %{count: 0, workout_logs: []}} = WorkoutLogs.list_client_workout_logs(ctx, [])
    assert Repo.aggregate(WorkoutLog, :count) == 1
  end

  test "every client operation rejects a client identity outside its business", f do
    {log, activity} = f |> start_log() |> then(&start_activity(f, &1))
    {log, set} = record_set(f, log, activity, %{round: 1, reps: 8})
    foreign = insert(:business)
    ctx = %{f.client_ctx | business_id: foreign.id}
    assert_client_denied(ctx, f, log, activity, set)
    assert Repo.get!(ExerciseSet, set.id).reps == 8
  end

  test "child ids outside the requested session return not found", f do
    {first, first_activity} = f |> start_log() |> then(&start_activity(f, &1))
    {first, first_set} = record_set(f, first, first_activity, %{round: 1, reps: 8})
    assert {:ok, _} = WorkoutLogs.finish_client_workout_log(f.client_ctx, first.id, %{})
    {second, second_activity} = f |> start_log() |> then(&start_activity(f, &1))
    {second, _} = record_set(f, second, second_activity, %{round: 1, reps: 5})
    assert {:error, :not_found} = WorkoutLogs.update_client_activity(f.client_ctx, second.id, first_activity.id, %{reps: 10})

    assert {:error, :not_found} =
             WorkoutLogs.correct_set_for_client(f.ctx, f.client.id, second.id, second_activity.id, first_set.id, %{reps: 10})

    assert {:error, :not_found} = WorkoutLogs.remove_client_set(f.client_ctx, second.id, second_activity.id, first_set.id)
    assert Repo.get!(ExerciseSet, first_set.id).reps == 8
  end

  defp client_ctx(client), do: %{Ctx.new(client.business_id, client.user_id) | client_id: client.id}

  defp start_log(f, overrides \\ %{}) do
    attrs = Map.merge(%{id: Ecto.UUID.generate(), workout_id: f.workout.id}, overrides)
    assert {:ok, log} = WorkoutLogs.start_client_workout_log(f.client_ctx, attrs)
    log
  end

  defp start_activity(f, log, overrides \\ %{}) do
    attrs = Map.merge(%{id: Ecto.UUID.generate(), exercise_id: f.exercise.id, workout_exercise_id: f.entry.id}, overrides)
    assert {:ok, log} = WorkoutLogs.start_client_activity(f.client_ctx, log.id, attrs)
    {log, find_activity(log, attrs.id)}
  end

  defp record_set(f, log, activity, overrides) do
    attrs = Map.merge(%{id: Ecto.UUID.generate(), state: "completed", round: 1}, overrides)
    assert {:ok, log} = WorkoutLogs.record_client_set(f.client_ctx, log.id, activity.id, attrs)
    set = Enum.find(find_activity(log, activity.id).sets, &(&1.id == attrs.id))
    {log, set}
  end

  defp find_activity(log, id), do: Enum.find(log.exercise_logs, &(&1.id == id))

  defp schedule(f, overrides \\ %{}) do
    attrs = Map.merge(%{workout_id: f.workout.id, weekdays_mask: 127}, overrides)
    assert {:ok, %{data: schedule}} = Workouts.add_schedule_for_client(f.ctx, f.client.id, attrs)
    schedule
  end

  defp each_side(f) do
    group = hd(f.workout.groups)
    entry = hd(group.exercises)
    attrs = %{groups: [%{id: group.id, rounds: group.rounds, exercises: [%{id: entry.id, side_mode: "per_side"}]}]}
    assert {:ok, %{data: workout}} = Workouts.update_workout_for_client(f.ctx, f.client.id, f.workout.id, attrs)
    %{f | workout: workout, entry: hd(hd(workout.groups).exercises)}
  end

  defp snapshot(log) do
    Map.take(log, [:id, :state, :date, :time, :effort, :pain, :text, :recorded_by, :coach_id, :updated_at, :exercise_logs])
  end

  defp closed_commands(f, log, activity, set) do
    [
      {:start_client_activity, [log.id, %{id: Ecto.UUID.generate(), exercise_id: f.exercise.id}]},
      {:update_client_activity, [log.id, activity.id, %{reps: 9}]},
      {:complete_client_activity, [log.id, activity.id, %{}]},
      {:skip_client_activity, [log.id, activity.id]},
      {:replace_client_activity, [log.id, activity.id, %{id: Ecto.UUID.generate(), exercise_id: f.replacement.id}]},
      {:record_client_set, [log.id, activity.id, %{id: Ecto.UUID.generate(), state: "completed", round: 2}]},
      {:correct_client_set, [log.id, activity.id, set.id, %{reps: 9}]},
      {:remove_client_set, [log.id, activity.id, set.id]}
    ]
  end

  defp commands(f, log, activity, set) do
    [
      {:start_client_workout_log, :start_workout_log_for_client, [%{id: Ecto.UUID.generate(), workout_id: f.workout.id}]},
      {:get_client_workout_log, :get_workout_log_for_client, [log.id]},
      {:list_client_workout_logs, :list_workout_logs_for_client, [[]]},
      {:update_client_workout_log, :update_workout_log_for_client, [log.id, %{text: "No"}]},
      {:finish_client_workout_log, :finish_workout_log_for_client, [log.id, %{}]},
      {:discard_client_workout_log, :discard_workout_log_for_client, [log.id]},
      {:reopen_client_workout_log, :reopen_workout_log_for_client, [log.id]},
      {:start_client_activity, :start_activity_for_client, [log.id, %{id: Ecto.UUID.generate(), exercise_id: f.exercise.id}]},
      {:update_client_activity, :update_activity_for_client, [log.id, activity.id, %{reps: 9}]},
      {:complete_client_activity, :complete_activity_for_client, [log.id, activity.id, %{}]},
      {:skip_client_activity, :skip_activity_for_client, [log.id, activity.id]},
      {:reopen_client_activity, :reopen_activity_for_client, [log.id, activity.id]},
      {:replace_client_activity, :replace_activity_for_client, [log.id, activity.id, %{id: Ecto.UUID.generate(), exercise_id: f.replacement.id}]},
      {:record_client_set, :record_set_for_client, [log.id, activity.id, %{id: Ecto.UUID.generate(), state: "completed", round: 2}]},
      {:correct_client_set, :correct_set_for_client, [log.id, activity.id, set.id, %{reps: 9}]},
      {:remove_client_set, :remove_set_for_client, [log.id, activity.id, set.id]}
    ]
  end

  defp assert_coach_denied(ctx, f, log, activity, set) do
    for {_client_name, coach_name, args} <- commands(f, log, activity, set) do
      assert {:error, :not_found} = apply(WorkoutLogs, coach_name, [ctx, f.client.id | args]), "#{coach_name} leaked access"
    end
  end

  defp assert_client_denied(ctx, f, log, activity, set, opts \\ []) do
    excluded = Keyword.get(opts, :except, [])

    for {name, _coach_name, args} <- commands(f, log, activity, set), name not in excluded do
      assert {:error, :not_found} = apply(WorkoutLogs, name, [ctx | args]), "#{name} leaked access"
    end
  end
end
