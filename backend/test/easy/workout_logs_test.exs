defmodule Easy.WorkoutLogsTest do
  use Easy.DataCase, async: true
  alias Easy.{Ctx, WorkoutLogs, Workouts}
  alias Easy.Workouts.{ExerciseSet, Workout, WorkoutLog, WorkoutSchedule}

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC")
    exercise = insert(:exercise, business: coach.business)
    coach_ctx = trainer_ctx(coach)
    ctx = %Ctx{business_id: coach.business_id, user_id: client.user_id, client_id: client.id}

    {:ok, %{data: workout}} =
      Workouts.create_workout_for_client(coach_ctx, client.id, %{
        name: "Lower A",
        groups: [%{rounds: 3, exercises: [%{exercise_id: exercise.id, targets: [%{"reps" => %{"mode" => "exact", "value" => 8}}]}]}]
      })

    {:ok, %{data: schedule}} = Workouts.add_schedule_for_client(coach_ctx, client.id, %{workout_id: workout.id, weekdays_mask: 127})
    %{ctx: ctx, coach_ctx: coach_ctx, client: client, exercise: exercise, workout: workout, schedule: schedule, item: hd(hd(workout.groups).exercises), today: Date.utc_today()}
  end

  defp start(f, attrs \\ %{}) do
    WorkoutLogs.start_client_workout_log(f.ctx, Map.merge(%{workout_id: f.workout.id, schedule_id: f.schedule.id, scheduled_date: f.today, date: f.today}, attrs))
  end

  defp set(f, attrs \\ %{}),
    do: Map.merge(%{workout_exercise_id: f.item.id, exercise_id: f.exercise.id, round: 1, reps: 8, weight_kg: 60, entered_units: %{"weight" => "kg"}}, attrs)

  defp finish(f, id, attrs \\ %{}), do: WorkoutLogs.finish_client_workout_log(f.ctx, id, Map.merge(%{difficulty: :just_right, pain: false}, attrs))

  @tag criticality: 10
  test "start claims the occurrence, stamps trusted identities, and has no prefilled sets", f do
    # WHY: Starting must reserve the occasion without claiming unticked targets were performed.
    spoofed = %{business_id: Ecto.UUID.generate(), client_id: Ecto.UUID.generate(), recorded_by: Ecto.UUID.generate()}
    assert {:ok, log} = start(f, spoofed)
    assert log.state == :active and log.sets == []
    assert log.business_id == f.ctx.business_id and log.client_id == f.client.id and log.recorded_by == f.ctx.user_id
    assert log.workout_id == f.workout.id and log.schedule_id == f.schedule.id and log.scheduled_date == f.today
    assert {:error, :conflict} = start(f)
    assert {:error, :conflict} = WorkoutLogs.start_client_workout_log(f.ctx, %{date: f.today})
    assert {:ok, %{count: 1, workout_logs: [listed]}} = WorkoutLogs.list_client_workout_logs(f.ctx)
    assert listed.id == log.id
  end

  @tag criticality: 10
  test "future dates, unmatched occurrences and coach-led starts are rejected", f do
    # WHY: A client cannot mark future work or record a coach-led session.
    assert {:error, :future_date} = start(f, %{date: Date.add(f.today, 1)})
    assert {:error, :future_date} = start(f, %{scheduled_date: Date.add(f.today, 1)})

    for invalid <- [nil, "not-a-date", 7] do
      assert {:error, :invalid_prescription} = start(f, %{scheduled_date: invalid})
    end

    assert {:error, :invalid_prescription} = start(f, %{workout_id: Ecto.UUID.generate()})

    assert {:error, :invalid_prescription} =
             WorkoutLogs.start_client_workout_log(f.ctx, %{date: f.today, scheduled_date: f.today})

    {:ok, %{data: led}} =
      Workouts.add_schedule_for_client(f.coach_ctx, f.client.id, %{workout_id: f.workout.id, weekdays_mask: 127, coach_id: f.coach_ctx.coach_id, time: "18:00:00"})

    assert {:error, :forbidden} = start(f, %{schedule_id: led.id})
  end

  @tag criticality: 9
  test "set corrections replace only saved ticks and Undo restores the exact values", f do
    # WHY: Unticking must remove a performed set while input typed on the device stays unsaved.
    {:ok, log} = start(f)
    assert {:ok, %{data: saved, undo_token: token}} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{sets: [set(f)]})
    assert [%{reps: 8, weight_kg: kg} = first] = saved.sets
    assert Decimal.equal?(kg, Decimal.new(60))
    assert {:ok, %{data: corrected}} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{sets: [set(f, %{id: first.id, reps: 9})]})
    assert hd(corrected.sets).id == first.id and hd(corrected.sets).reps == 9
    assert {:error, :conflict} = WorkoutLogs.restore_client_workout_log(f.ctx, %{undo_token: token})
    assert {:ok, %{data: empty, undo_token: untick}} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{sets: []})
    assert empty.sets == []
    assert {:ok, restored} = WorkoutLogs.restore_client_workout_log(f.ctx, %{undo_token: untick})
    assert hd(restored.sets).reps == 9
    assert {:error, :conflict} = WorkoutLogs.restore_client_workout_log(f.ctx, %{undo_token: untick})
  end

  @tag criticality: 9
  test "correcting a saved set clears explicit nil and omitted metric values", f do
    # WHY: Removing a performed metric must remove its saved value, not only its visible input.
    {:ok, log} = start(f)
    {:ok, %{data: saved}} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{sets: [set(f)]})
    previous = hd(saved.sets)
    cleared = %{id: previous.id, workout_exercise_id: f.item.id, exercise_id: f.exercise.id, round: 1, reps: nil}
    assert {:ok, %{data: updated, undo_token: token}} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{sets: [cleared]})
    assert [%{id: set_id, reps: nil, weight_kg: nil}] = updated.sets
    assert set_id == previous.id
    assert {:ok, reread} = WorkoutLogs.get_client_workout_log(f.ctx, log.id)
    assert [%{reps: nil, weight_kg: nil}] = reread.sets
    assert %{reps: nil, weight_kg: nil} = Repo.get!(ExerciseSet, set_id)
    assert {:ok, restored} = WorkoutLogs.restore_client_workout_log(f.ctx, %{undo_token: token})
    assert hd(restored.sets).reps == 8
    assert Decimal.equal?(hd(restored.sets).weight_kg, Decimal.new(60))
    assert {:ok, %{data: preserved}} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{text: "Corrected note"})
    assert hd(preserved.sets).reps == 8
  end

  @tag criticality: 8
  test "all log operations return not_found for malformed ids", f do
    # WHY: Invalid input must return a domain failure instead of raising a database cast error.
    feedback = %{difficulty: :just_right, pain: false}

    for id <- ["not-an-id", nil] do
      assert {:error, :not_found} = WorkoutLogs.get_client_workout_log(f.ctx, id)
      assert {:error, :not_found} = WorkoutLogs.update_client_workout_log(f.ctx, id, %{})
      assert {:error, :not_found} = WorkoutLogs.finish_client_workout_log(f.ctx, id, feedback)
      assert {:error, :not_found} = WorkoutLogs.discard_client_workout_log(f.ctx, id)
      assert {:error, :not_found} = WorkoutLogs.reopen_client_workout_log(f.ctx, id)
      assert {:error, :not_found} = WorkoutLogs.delete_client_workout_log(f.ctx, id)
    end
  end

  @tag criticality: 9
  test "finish stores only ticked sets, validates feedback and can reopen", f do
    # WHY: Finishing never turns unticked planned rounds into completed work.
    {:ok, log} = start(f)
    assert {:error, %Ecto.Changeset{}} = WorkoutLogs.finish_client_workout_log(f.ctx, log.id, %{})
    assert {:error, %Ecto.Changeset{}} = finish(f, log.id, %{pain_note: "Knee"})
    assert {:ok, %{data: done, undo_token: token}} = finish(f, log.id, %{sets: [set(f)], pain: true, pain_note: "Knee"})
    assert done.state == :completed and done.pain_note == "Knee" and length(done.sets) == 1
    assert {:error, :conflict} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{sets: []})
    assert {:error, :conflict} = start(f)
    assert {:ok, active} = WorkoutLogs.restore_client_workout_log(f.ctx, %{undo_token: token})
    assert active.state == :active and active.sets == []
    assert {:ok, %{data: _}} = finish(f, log.id)
    assert {:ok, %{data: reopened}} = WorkoutLogs.reopen_client_workout_log(f.ctx, log.id)
    assert reopened.state == :active
  end

  @tag criticality: 9
  test "discard releases the active and occurrence slots while Undo detects later claims", f do
    # WHY: Discard lets the client start again; Undo must not overwrite another session.
    {:ok, log} = start(f)
    assert {:ok, %{data: discarded, undo_token: token}} = WorkoutLogs.discard_client_workout_log(f.ctx, log.id)
    assert discarded.state == :discarded
    assert {:ok, resumed} = WorkoutLogs.restore_client_workout_log(f.ctx, %{undo_token: token})
    assert resumed.state == :active
    assert {:ok, %{undo_token: second}} = WorkoutLogs.discard_client_workout_log(f.ctx, log.id)
    assert {:ok, _} = start(f)
    assert {:error, :conflict} = WorkoutLogs.restore_client_workout_log(f.ctx, %{undo_token: second})
  end

  @tag criticality: 10
  test "delete removes log and sets and signed Undo recreates their snapshots", f do
    # WHY: A destructive client correction needs one safe inverse without a record spine.
    {:ok, log} = start(f)
    {:ok, %{data: saved}} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{sets: [set(f)]})
    assert {:ok, %{undo_token: token}} = WorkoutLogs.delete_client_workout_log(f.ctx, log.id)
    refute Repo.get(WorkoutLog, log.id)
    refute Repo.get(ExerciseSet, hd(saved.sets).id)
    assert {:error, :not_found} = WorkoutLogs.get_client_workout_log(f.ctx, log.id)
    assert {:ok, restored} = WorkoutLogs.restore_client_workout_log(f.ctx, %{undo_token: token})
    assert restored.id == log.id and hd(restored.sets).id == hd(saved.sets).id
    assert {:error, :conflict} = WorkoutLogs.restore_client_workout_log(f.ctx, %{undo_token: token})
    assert {:error, :conflict} = WorkoutLogs.restore_client_workout_log(f.ctx, %{undo_token: "invalid"})
    assert {:error, :conflict} = WorkoutLogs.restore_client_workout_log(f.ctx, %{})
  end

  @tag criticality: 10
  test "delete Undo conflicts after coach content changes but allows catalogue changes", f do
    # WHY: Recreating a log must not point its old sets at new instructions.
    {:ok, log} = start(f)
    {:ok, %{data: _}} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{sets: [set(f)]})
    {:ok, %{undo_token: token}} = WorkoutLogs.delete_client_workout_log(f.ctx, log.id)
    {:ok, _} = Workouts.update_exercise(f.coach_ctx, f.exercise.id, %{name: "Catalogue changed"})
    assert {:ok, _} = WorkoutLogs.restore_client_workout_log(f.ctx, %{undo_token: token})
    {:ok, %{undo_token: second}} = WorkoutLogs.delete_client_workout_log(f.ctx, log.id)
    {:ok, %{data: _}} = Workouts.update_workout_for_client(f.coach_ctx, f.client.id, f.workout.id, %{name: "New instructions"})
    assert {:error, :conflict} = WorkoutLogs.restore_client_workout_log(f.ctx, %{undo_token: second})
    refute Repo.get(WorkoutLog, log.id)
  end

  @tag criticality: 10
  test "delete Undo conflicts after the coach changes the same schedule in place", f do
    # WHY: A saved occurrence must keep the session details it followed.
    {:ok, log} = start(f)
    {:ok, %{undo_token: token}} = WorkoutLogs.delete_client_workout_log(f.ctx, log.id)
    {:ok, %{data: changed}} = Workouts.update_schedule_for_client(f.coach_ctx, f.client.id, f.schedule.id, %{time: "20:00:00"})
    assert changed.id == f.schedule.id
    assert {:error, :conflict} = WorkoutLogs.restore_client_workout_log(f.ctx, %{undo_token: token})
  end

  @tag criticality: 10
  test "every operation is isolated by client and business and denies coach actors", f do
    # WHY: Knowledge of a record id grants no access to another client's records.
    {:ok, log} = start(f)
    other = insert(:client, business: f.client.business)
    foreign = insert(:client)
    contexts = [f.coach_ctx, %{f.ctx | client_id: other.id}, %{f.ctx | business_id: foreign.business_id, client_id: foreign.id}]

    for ctx <- contexts do
      assert {:error, :not_found} = WorkoutLogs.get_client_workout_log(ctx, log.id)
      assert {:error, :not_found} = WorkoutLogs.update_client_workout_log(ctx, log.id, %{})
      assert {:error, :not_found} = WorkoutLogs.finish_client_workout_log(ctx, log.id, %{difficulty: :just_right, pain: false})
      assert {:error, :not_found} = WorkoutLogs.discard_client_workout_log(ctx, log.id)
      assert {:error, :not_found} = WorkoutLogs.reopen_client_workout_log(ctx, log.id)
      assert {:error, :not_found} = WorkoutLogs.delete_client_workout_log(ctx, log.id)
    end

    assert {:error, :not_found} = WorkoutLogs.list_client_workout_logs(f.coach_ctx)
    assert {:ok, %{count: 0, workout_logs: []}} = WorkoutLogs.list_client_workout_logs(%{f.ctx | client_id: other.id})
    assert {:error, :not_found} = WorkoutLogs.start_client_workout_log(%{f.ctx | client_id: other.id}, %{date: f.today, workout_id: f.workout.id})
  end

  @tag criticality: 9
  test "swaps use the performed exercise's own metrics and retain catalogue snapshots", f do
    # WHY: A substitute can have different metrics; later catalogue edits cannot rewrite saved work.
    replacement = insert(:exercise, business: f.client.business, name: "Plank", metrics: ["duration"])
    {:ok, log} = start(f)
    body = %{swaps: %{f.item.id => replacement.id}, sets: [set(f, %{exercise_id: replacement.id, reps: nil, weight_kg: nil, duration_s: 60, entered_units: %{"duration" => "s"}})]}
    assert {:ok, %{data: saved}} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, body)
    assert hd(saved.sets).duration_s == 60 and saved.swaps[f.item.id]["metrics"] == ["duration"]
    assert {:ok, _} = Workouts.update_exercise(f.coach_ctx, replacement.id, %{name: "Changed", metrics: ["reps"], unilateral: true})
    assert {:ok, %{data: corrected}} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{sets: [Map.merge(hd(body.sets), %{id: hd(saved.sets).id, duration_s: 90})]})
    assert hd(corrected.sets).exercise_snapshot["name"] == "Plank"
    assert hd(corrected.sets).exercise_snapshot["metrics"] == ["duration"]
    assert {:error, %Ecto.Changeset{}} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{sets: [Map.merge(hd(body.sets), %{reps: 8})]})
    wire = WorkoutLogs.present(corrected)
    assert wire.swaps[f.item.id] == replacement.id and hd(wire.sets).exercise["name"] == "Plank"
  end

  @tag criticality: 10
  test "foreign swaps, prescribed links, and forged set ids are rejected atomically", f do
    # WHY: A performed set can only follow this log's prescription and visible exercises.
    foreign = insert(:exercise)
    {:ok, log} = start(f)
    assert {:error, :not_found} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{swaps: %{f.item.id => foreign.id}})
    assert {:error, :invalid_prescription} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{swaps: %{Ecto.UUID.generate() => f.exercise.id}})
    assert {:error, :not_found} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{sets: [set(f, %{workout_exercise_id: Ecto.UUID.generate()})]})
    assert {:error, :invalid_set} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{sets: [set(f, %{id: Ecto.UUID.generate()})]})
    assert {:error, %Ecto.Changeset{}} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{text: "Should roll back", sets: [set(f, %{reps: -1})]})
    {:ok, unchanged} = WorkoutLogs.get_client_workout_log(f.ctx, log.id)
    assert unchanged.text == nil and unchanged.sets == []
  end

  @tag criticality: 9
  test "unilateral sets have two independent sides and all catalogue metrics are typed", f do
    # WHY: Each side must be ticked apart, and metric reports require stable base-unit columns.
    metrics = ~w(reps weight duration distance elevation_gain height calories speed incline level power cadence heart_rate effort reserve successes attempts score result grade)
    extra = insert(:exercise, business: f.client.business, metrics: metrics, grade_scale: ["V1", "V2"], unilateral: true)
    {:ok, log} = start(f)

    values = %{
      exercise_id: extra.id,
      round: 1,
      side: :left,
      reps: 1,
      weight_kg: -5,
      duration_s: 20,
      distance_m: 50,
      elevation_gain_m: 3,
      height_cm: 20,
      calories_kcal: 8,
      speed_m_s: 2,
      incline_pct: -2,
      level: 1,
      power_w: 50,
      cadence_rpm: 30,
      heart_rate_bpm: 90,
      effort: 8,
      reserve: 2,
      successes: 2,
      attempts: 3,
      score: 7,
      result: :win,
      grade: "V2"
    }

    assert {:error, %Ecto.Changeset{}} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{sets: [Map.delete(values, :side)]})
    assert {:ok, %{data: saved}} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{sets: [values, %{values | side: :right}]})
    assert length(saved.sets) == 2
    wire = WorkoutLogs.present(saved)
    assert Enum.sort(Enum.map(wire.sets, & &1.side)) == [:left, :right]
    assert Enum.all?(wire.sets, &(&1.weight_kg == -5.0 and &1.result == :win and &1.grade == "V2"))
    assert {:error, %Ecto.Changeset{}} = WorkoutLogs.update_client_workout_log(f.ctx, log.id, %{sets: [%{values | successes: 4}]})
  end

  @tag criticality: 10
  test "database active and occurrence uniqueness prevent concurrent duplicate claims", f do
    # WHY: The client lock orders app writes; unique indexes also protect other writers.
    {:ok, log} = start(f)
    cs = WorkoutLog.insert_changeset(f.ctx.business_id, f.ctx.user_id, f.client.id, DateTime.utc_now(:second), %{date: f.today})
    assert {:error, invalid} = Repo.insert(cs)
    assert "has already been taken" in errors_on(invalid).state
    assert {:ok, %{data: _}} = finish(f, log.id)
    duplicate = cs |> put_change(:schedule_id, f.schedule.id) |> put_change(:scheduled_date, f.today) |> put_change(:workout_id, f.workout.id)
    assert {:error, invalid} = Repo.insert(duplicate)
    assert "has already been taken" in errors_on(invalid).schedule_id
  end

  @tag criticality: 10
  test "today's coach edits copy only after an occurrence has been claimed", f do
    # WHY: A log must keep the exact instructions the client followed.
    assert {:ok, %{data: same}} = Workouts.update_workout_for_client(f.coach_ctx, f.client.id, f.workout.id, %{name: "Before start"})
    assert same.id == f.workout.id
    {:ok, log} = start(f)
    assert {:ok, %{data: copy, undo_token: coach_undo}} = Workouts.update_workout_for_client(f.coach_ctx, f.client.id, f.workout.id, %{name: "After start"})
    assert copy.id != f.workout.id
    assert Repo.get!(Workout, f.workout.id).name == "Before start"
    assert Repo.get!(Workout, f.workout.id).archived_at
    assert Repo.get!(WorkoutSchedule, f.schedule.id).until_date == f.today
    next = Repo.one(from(s in WorkoutSchedule, where: s.workout_id == ^copy.id))
    assert next.from_date == Date.add(f.today, 1)
    assert {:ok, %{schedules: current_rows, workouts: current_workouts}} = Workouts.read_week_for_client(f.coach_ctx, f.client.id)
    assert Enum.map(current_rows, & &1.id) == [next.id]
    assert Enum.map(current_workouts, & &1.id) == [copy.id]
    assert {:ok, retained} = WorkoutLogs.get_client_workout_log(f.ctx, log.id)
    assert retained.workout.name == "Before start"
    assert {:ok, _} = Workouts.undo_for_client(f.coach_ctx, f.client.id, coach_undo)
    assert Repo.get!(WorkoutLog, log.id).workout_id == f.workout.id
  end

  @tag criticality: 10
  test "coach schedule edits and deletes preserve today's claim", f do
    # WHY: Session details already followed are prescription facts too.
    {:ok, _} = start(f)
    assert {:ok, %{data: changed}} = Workouts.update_schedule_for_client(f.coach_ctx, f.client.id, f.schedule.id, %{time: "19:00:00"})
    assert changed.id != f.schedule.id and changed.from_date == Date.add(f.today, 1)
    assert Repo.get!(WorkoutSchedule, f.schedule.id).until_date == f.today
    assert {:ok, _} = Workouts.delete_workout_for_client(f.coach_ctx, f.client.id, f.workout.id)
    assert Repo.get!(Workout, f.workout.id).archived_at
    assert Repo.get!(WorkoutSchedule, f.schedule.id).until_date == f.today
  end

  @tag criticality: 10
  test "coach Undo cannot rewrite a workout that the client started after the edit", f do
    # WHY: Undo must preserve records created by another actor between edit and recovery.
    {:ok, %{undo_token: token}} = Workouts.update_workout_for_client(f.coach_ctx, f.client.id, f.workout.id, %{name: "Edited"})
    {:ok, _} = start(f)
    assert {:error, :conflict} = Workouts.undo_for_client(f.coach_ctx, f.client.id, token)
    assert Repo.get!(Workout, f.workout.id).name == "Edited"
  end

  @tag criticality: 9
  test "coach Undo restores reordered groups without colliding with their positions", f do
    # WHY: Adding log foreign keys must not break the coach's existing reorder recovery.
    groups = [%{rounds: 2, exercises: [%{exercise_id: f.exercise.id}]}, %{rounds: 3, exercises: [%{exercise_id: f.exercise.id}]}]
    {:ok, %{data: before}} = Workouts.update_workout_for_client(f.coach_ctx, f.client.id, f.workout.id, %{groups: groups})

    reversed =
      Enum.reverse(before.groups)
      |> Enum.map(fn group -> %{id: group.id, rounds: group.rounds, exercises: Enum.map(group.exercises, &Map.take(&1, [:id, :exercise_id, :targets, :targets_mode, :rest]))} end)

    {:ok, %{undo_token: token}} = Workouts.update_workout_for_client(f.coach_ctx, f.client.id, f.workout.id, %{groups: reversed})
    assert {:ok, _} = Workouts.undo_for_client(f.coach_ctx, f.client.id, token)
    {:ok, after_row} = Workouts.get_workout_for_client(f.coach_ctx, f.client.id, f.workout.id)
    assert Enum.map(after_row.groups, & &1.id) == Enum.map(before.groups, & &1.id)
  end

  @tag criticality: 9
  test "video and free logs allow optional extra sets without creating a shared record", f do
    # WHY: Optional tracking must work for open sessions and must not use the withdrawn spine.
    seq = f.client.last_change_seq
    changes = Repo.aggregate("record_changes", :count)
    {:ok, %{data: video}} = Workouts.create_workout_for_client(f.coach_ctx, f.client.id, %{name: "Video", type: :video, video: "https://example.com/video"})
    {:ok, log} = WorkoutLogs.start_client_workout_log(f.ctx, %{date: f.today, workout_id: video.id})
    assert {:ok, %{data: done}} = finish(f, log.id)
    assert done.sets == []
    {:ok, free} = WorkoutLogs.start_client_workout_log(f.ctx, %{date: f.today})
    assert {:ok, %{data: _}} = WorkoutLogs.update_client_workout_log(f.ctx, free.id, %{sets: [Map.put(set(f), :workout_exercise_id, nil)]})
    assert Repo.get!(Easy.Clients.Client, f.client.id).last_change_seq == seq
    assert Repo.aggregate("record_changes", :count) == changes
  end
end

defmodule Easy.WorkoutLogsConcurrencyTest do
  use ExUnit.Case, async: false
  import Easy.Factory
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.WorkoutLogs
  alias Easy.Workouts.WorkoutLog
  alias Ecto.Adapters.SQL.Sandbox
  import Ecto.Query

  @tag criticality: 10
  test "independent transactions racing to start leave one active log" do
    # WHY: Two devices must not both create an active workout before either sees the other.
    Sandbox.unboxed_run(Repo, fn ->
      coach = insert(:coach)
      client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC")
      ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
      parent = self()
      tasks = for _ <- 1..2, do: Task.async(fn -> race_start(parent, ctx) end)
      ready = for _ <- 1..2, do: receive(do: ({:ready, pid} -> pid))
      Enum.each(ready, &send(&1, :start))

      try do
        results = Enum.map(tasks, &Task.await(&1, 10_000))
        assert Enum.count(results, &match?({:ok, _}, &1)) == 1
        assert Enum.count(results, &(&1 == {:error, :conflict})) == 1
        assert Repo.aggregate(WorkoutLog.for_client(ctx.business_id, client.id), :count) == 1
      after
        Repo.delete_all(from(t in Easy.CoachingTerms.CoachingTerm, where: t.client_id == ^client.id))
        Repo.delete_all(from(c in Easy.Clients.Client, where: c.id == ^client.id))
        Repo.delete_all(from(c in Easy.Orgs.Coach, where: c.id == ^coach.id))
        Repo.delete_all(from(b in Easy.Orgs.Business, where: b.id == ^client.business_id))
        ids = [coach.user_id, client.user_id, coach.business.owner_user_id]
        Repo.delete_all(from(u in Easy.Identity.User, where: u.id in ^ids))
      end
    end)
  end

  defp race_start(parent, ctx) do
    Sandbox.unboxed_run(Repo, fn ->
      send(parent, {:ready, self()})

      receive do
        :start -> WorkoutLogs.start_client_workout_log(ctx, %{date: Date.utc_today()})
      end
    end)
  end
end
