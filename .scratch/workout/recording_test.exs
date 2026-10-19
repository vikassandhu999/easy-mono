# Run from the repository root with the same command as measurements_test.exs.
File.read!(".scratch/workout/models.ex")
|> String.replace("Easy.", "Easy.RecordingReview.")
|> Code.compile_string()

ExUnit.start(seed: 0)

defmodule WorkoutRecordingDraftTest do
  use ExUnit.Case, async: true
  alias Ecto.Changeset

  alias Easy.RecordingReview.Workouts.{
    Exercise,
    ExerciseMetric,
    ExerciseGroup,
    ExerciseLog,
    ExerciseSet,
    Workout,
    WorkoutExercise,
    WorkoutLog,
    Recording,
    RoundTargets,
    CountTarget,
    RestTarget
  }

  @business "00000000-0000-0000-0000-000000000001"
  @client "00000000-0000-0000-0000-000000000002"
  @session "00000000-0000-0000-0000-000000000003"
  @exercise "00000000-0000-0000-0000-000000000004"
  @replacement "00000000-0000-0000-0000-000000000005"
  @workout "00000000-0000-0000-0000-000000000006"
  @entry "00000000-0000-0000-0000-000000000007"
  @other "00000000-0000-0000-0000-000000000008"
  @today ~D[2026-10-19]

  defp exercise(id \\ @exercise),
    do: %Exercise{
      id: id,
      business_id: @business,
      metrics: Enum.map([:reps, :weight, :duration, :distance], &%ExerciseMetric{key: &1})
    }

  defp session,
    do: %WorkoutLog{
      id: @session,
      business_id: @business,
      client_id: @client,
      recorded_by: :client,
      date: @today,
      sets: [],
      exercise_logs: []
    }

  defp saved(changeset) do
    assert {:ok, row} = Changeset.apply_action(changeset, changeset.action || :update)
    if is_nil(row.id), do: %{row | id: Ecto.UUID.generate()}, else: row
  end

  defp invalid(changeset, field) do
    assert {:error, failed} = Changeset.apply_action(changeset, :update)
    assert Map.has_key?(Changeset.traverse_errors(failed, fn {message, _} -> message end), field)
  end

  defp attach(session, activity),
    do: %{
      session
      | exercise_logs: Enum.reject(session.exercise_logs, &(&1.id == activity.id)) ++ [activity]
    }

  defp started do
    session = session()
    activity = saved(Recording.start_activity(session, exercise()))
    {attach(session, activity), activity}
  end

  defp prescribed(side_mode \\ :combined) do
    workout = %Workout{
      id: @workout,
      business_id: @business,
      client_id: @client,
      type: :prescribed,
      groups: [
        %ExerciseGroup{
          rounds: 3,
          exercises: [
            %WorkoutExercise{
              id: @entry,
              exercise_id: @exercise,
              side_mode: side_mode,
              targets: [
                %RoundTargets{
                  reps: %CountTarget{mode: :exact, value: 10},
                  rest: %RestTarget{mode: :exact, value_s: Decimal.new("60")}
                }
              ]
            }
          ]
        }
      ]
    }

    session = %{session() | workout_id: @workout}
    activity = saved(Recording.start_activity(session, exercise(), {workout, @entry}))
    {attach(session, activity), activity, workout}
  end

  test "start creates only the chosen active activity, never planned set rows" do
    {session, activity} = started()

    assert {activity.state, activity.position, activity.side_mode, activity.sets} ==
             {:active, 0, :combined, []}

    assert {activity.business_id, activity.workout_log_id, activity.exercise_id,
            activity.workout_exercise_id} == {@business, @session, @exercise, nil}

    next = saved(Recording.start_activity(session, exercise()))
    assert {next.position, next.sets} == {1, []}
  end

  test "prescribed entry resolves from the client's workout and supplies side mode" do
    {session, activity, workout} = prescribed(:per_side)
    assert {activity.workout_exercise_id, activity.side_mode} == {@entry, :per_side}

    invalid(
      Recording.start_activity(session, exercise(), {workout, @other}),
      :workout_exercise_id
    )

    invalid(
      Recording.start_activity(session, exercise(), {%{workout | client_id: @other}, @entry}),
      :workout_exercise_id
    )

    invalid(Recording.start_activity(session, %{exercise() | business_id: @other}), :exercise_id)
    archived = %{exercise() | archived_at: ~U[2026-10-18 00:00:00Z]}

    assert saved(Recording.start_activity(session, archived, {workout, @entry})).exercise_id ==
             @exercise

    invalid(Recording.start_activity(session, archived), :exercise_id)
  end

  test "record and skip create distinct outcomes without measurements" do
    {session, activity} = started()
    done = saved(Recording.record_set(session, activity, exercise(), %{round: 1}))
    skipped = saved(Recording.skip_set(session, activity, %{round: 2}))

    assert {done.state, done.reps, done.round, done.exercise_log_id} ==
             {:completed, nil, 1, activity.id}

    assert {skipped.state, skipped.reps, skipped.round} == {:skipped, nil, 2}
    assert {done.exercise_id, done.workout_log_id, done.workout_exercise_id} == {nil, nil, nil}
  end

  test "side validation retains unequal left/right results in one prescribed round" do
    {session, activity, _} = prescribed(:per_side)

    left =
      saved(
        Recording.record_set(session, activity, exercise(), %{round: 1, side: "left", reps: 10})
      )

    activity = %{activity | sets: [left]}
    session = attach(session, activity)

    right =
      saved(
        Recording.record_set(session, activity, exercise(), %{round: 1, side: "right", reps: 8})
      )

    assert {left.reps, right.reps, left.round, right.round} == {10, 8, 1, 1}
    invalid(Recording.record_set(session, activity, exercise(), %{round: 1}), :side)
    {combined_session, combined} = started()

    invalid(
      Recording.record_set(combined_session, combined, exercise(), %{round: 1, side: "left"}),
      :side
    )
  end

  test "a saved slot is updated explicitly and cannot be duplicated or moved" do
    {session, activity} = started()
    set = saved(Recording.record_set(session, activity, exercise(), %{round: 1, reps: 10}))
    activity = %{activity | sets: [set]}
    session = attach(session, activity)
    invalid(Recording.record_set(session, activity, exercise(), %{round: 1, reps: 12}), :round)
    changed = saved(Recording.record_set(session, activity, exercise(), %{reps: 12}, set))
    assert {changed.id, changed.round, changed.reps} == {set.id, 1, 12}
    invalid(Recording.record_set(session, activity, exercise(), %{round: 2}, set), :round)
    invalid(Recording.record_set(session, activity, exercise(), %{round: 0}), :round)
    invalid(Recording.record_set(session, activity, exercise(), %{round: 10001}), :round)
  end

  test "normal skipping cannot erase performed work, including a done-only result" do
    {session, activity} = started()
    done = saved(Recording.record_set(session, activity, exercise(), %{round: 1}))
    activity = %{activity | sets: [done]}
    session = attach(session, activity)
    invalid(Recording.skip_set(session, activity, %{}, done), :state)
    invalid(Recording.skip_activity(session, activity), :state)
    invalid(Recording.skip_set(session, activity, %{round: 2, reps: 0}), :base)
  end

  test "a deliberately skipped set can later be recorded as performed" do
    {session, activity} = started()
    skipped = saved(Recording.skip_set(session, activity, %{round: 1}))
    activity = %{activity | sets: [skipped]}
    session = attach(session, activity)
    done = saved(Recording.record_set(session, activity, exercise(), %{reps: 8}, skipped))
    assert {done.id, done.state, done.reps} == {skipped.id, :completed, 8}
  end

  test "activity completion and skipping are explicit, with no invented detail" do
    {session, activity} = started()
    done = saved(Recording.complete_activity(session, activity, exercise(), %{}))
    assert {done.state, done.reps, done.sets} == {:completed, nil, []}
    invalid(Recording.skip_activity(attach(session, done), done), :state)
    skipped = saved(Recording.skip_activity(session, activity))
    assert {skipped.state, skipped.sets} == {:skipped, []}

    resumed =
      saved(
        Recording.complete_activity(attach(session, skipped), skipped, exercise(), %{reps: 10})
      )

    assert {resumed.state, resumed.reps} == {:completed, 10}
  end

  test "a replacement reuses an untouched selection but preserves any explicit outcome" do
    {session, activity, workout} = prescribed()

    assert {:update, changeset} =
             Recording.replace_activity(
               session,
               activity,
               exercise(@replacement),
               {workout, @entry}
             )

    reused = saved(changeset)

    assert {reused.id, reused.exercise_id, reused.workout_exercise_id} ==
             {activity.id, @replacement, @entry}

    completed = saved(Recording.complete_activity(session, activity, exercise(), %{}))
    session = attach(session, completed)

    assert {:insert, changeset} =
             Recording.replace_activity(
               session,
               completed,
               exercise(@replacement),
               {workout, @entry}
             )

    replacement = saved(changeset)

    assert {replacement.exercise_id, replacement.workout_exercise_id, replacement.position} ==
             {@replacement, @entry, 1}

    assert hd(session.exercise_logs).state == :completed
    assert replacement.id != completed.id
  end

  test "a swap after one side preserves the round and cannot reuse its occupied slot" do
    {session, original, workout} = prescribed(:per_side)

    left =
      saved(
        Recording.record_set(session, original, exercise(), %{round: 1, side: "left", reps: 10})
      )

    original = %{original | sets: [left]}
    session = attach(session, original)

    assert {:insert, changeset} =
             Recording.replace_activity(
               session,
               original,
               exercise(@replacement),
               {workout, @entry}
             )

    replacement = saved(changeset)
    session = attach(session, replacement)

    invalid(
      Recording.record_set(session, replacement, exercise(@replacement), %{
        round: 1,
        side: "left",
        reps: 9
      }),
      :round
    )

    right =
      saved(
        Recording.record_set(session, replacement, exercise(@replacement), %{
          round: 1,
          side: "right",
          reps: 8
        })
      )

    assert {right.round, right.side, right.reps} == {1, :right, 8}
    assert hd(session.exercise_logs).sets == [left]
  end

  test "finishing the workout freezes unfinished records without inventing outcomes" do
    {session, activity} = started()

    set =
      saved(Recording.record_set(session, activity, exercise(), %{round: 1, duration_s: "12.45"}))

    activity = %{activity | sets: [set]}
    session = attach(session, activity)
    completed = saved(WorkoutLog.finish_changeset(session, %{}, @today, nil))

    assert {completed.state, hd(completed.exercise_logs).state,
            hd(hd(completed.exercise_logs).sets).state} == {:completed, :active, :completed}

    assert hd(completed.exercise_logs).sets == [set]
    invalid(Recording.record_set(completed, activity, exercise(), %{round: 2}), :workout_log_id)
    reopened = saved(WorkoutLog.reopen_changeset(completed))
    next = saved(Recording.record_set(reopened, activity, exercise(), %{round: 2, reps: 8}))
    assert {next.state, next.reps, reopened.recorded_by} == {:completed, 8, :client}
  end

  test "discarding preserves children and prevents later edits" do
    {session, activity} = started()
    discarded = saved(WorkoutLog.discard_changeset(session))
    assert {discarded.state, discarded.exercise_logs} == {:discarded, [activity]}
    invalid(Recording.complete_activity(discarded, activity, exercise(), %{}), :workout_log_id)
    invalid(WorkoutLog.reopen_changeset(discarded), :state)
  end

  test "explicitly removing a mistaken set is a scoped correction command" do
    {session, activity} = started()
    set = saved(Recording.record_set(session, activity, exercise(), %{round: 1, reps: 8}))
    activity = %{activity | sets: [set]}
    session = attach(session, activity)
    correction = Recording.remove_set(session, activity, set)
    assert {correction.valid?, correction.action, correction.data.id} == {true, :delete, set.id}

    invalid(
      Recording.remove_set(session, activity, %{set | exercise_log_id: @other}),
      :exercise_log_id
    )

    invalid(Recording.remove_set(%{session | state: :completed}, activity, set), :workout_log_id)
  end

  test "ownership, lookup, and immutable fields cannot be supplied through result input" do
    {session, activity} = started()

    invalid(
      Recording.update_activity(session, activity, exercise(@replacement), %{reps: 8}),
      :exercise_id
    )

    invalid(
      Recording.update_activity(session, %{activity | business_id: @other}, exercise(), %{}),
      :workout_log_id
    )

    invalid(
      Recording.record_set(session, activity, exercise(), %{round: 1, exercise_id: @replacement}),
      :base
    )

    invalid(
      Recording.update_activity(session, activity, exercise(), %{state: "completed"}),
      :base
    )
  end

  test "workout completion requires a fully loaded valid hierarchy" do
    {session, activity} = started()

    not_loaded = %Ecto.Association.NotLoaded{
      __owner__: ExerciseLog,
      __field__: :sets,
      __cardinality__: :many
    }

    invalid(
      WorkoutLog.finish_changeset(
        attach(session, %{activity | sets: not_loaded}),
        %{},
        @today,
        nil
      ),
      :exercise_logs
    )

    invalid(
      WorkoutLog.finish_changeset(
        attach(session, %{activity | workout_log_id: @other}),
        %{},
        @today,
        nil
      ),
      :exercise_logs
    )

    invalid(
      WorkoutLog.finish_changeset(
        attach(session, %{activity | state: :skipped, reps: 1}),
        %{},
        @today,
        nil
      ),
      :exercise_logs
    )

    duplicate = %{activity | id: @other}

    invalid(
      WorkoutLog.finish_changeset(
        %{session | exercise_logs: [activity, duplicate]},
        %{},
        @today,
        nil
      ),
      :exercise_logs
    )

    bad_set =
      struct!(ExerciseSet,
        id: @other,
        business_id: @business,
        exercise_log_id: activity.id,
        round: 1,
        state: :skipped,
        reps: 1
      )

    invalid(
      WorkoutLog.finish_changeset(
        attach(session, %{activity | sets: [bad_set]}),
        %{},
        @today,
        nil
      ),
      :exercise_logs
    )
  end

  test "the activity owns editable session targets and never turns them into results" do
    {session, activity, _} = prescribed()

    assert {activity.rounds, activity.targets_mode, hd(activity.targets).reps.value} ==
             {3, :same_for_all, 10}

    edited =
      saved(
        Recording.update_activity(session, activity, exercise(), %{
          rounds: 5,
          targets: [%{reps: %{mode: "exact", value: 12}, rest: %{mode: "exact", value_s: "90"}}]
        })
      )

    assert {edited.rounds, hd(edited.targets).reps.value, hd(edited.targets).rest.value_s} ==
             {5, 12, Decimal.new("90")}

    done = saved(Recording.record_set(attach(session, edited), edited, exercise(), %{round: 1}))
    assert {done.state, done.reps} == {:completed, nil}

    invalid(
      Recording.update_activity(session, activity, exercise(), %{targets_mode: "per_round"}),
      :targets
    )

    invalid(Recording.update_activity(session, activity, exercise(), %{rounds: 0}), :rounds)
  end

  test "replacement keeps the current count and rest and clears its metric targets" do
    {session, activity, workout} = prescribed()

    edited =
      saved(
        Recording.update_activity(session, activity, exercise(), %{
          rounds: 5,
          targets: [%{reps: %{mode: "exact", value: 12}, rest: %{mode: "exact", value_s: "90"}}]
        })
      )

    assert {:update, changeset} =
             Recording.replace_activity(
               attach(session, edited),
               edited,
               exercise(@replacement),
               {workout, @entry}
             )

    replacement = saved(changeset)

    assert {replacement.rounds, hd(replacement.targets).reps,
            hd(replacement.targets).rest.value_s} == {5, nil, Decimal.new("90")}
  end

  test "the planned count cannot be reduced below outcomes already recorded across a swap" do
    {session, activity, workout} = prescribed()
    set = saved(Recording.record_set(session, activity, exercise(), %{round: 3, reps: 8}))
    activity = %{activity | sets: [set]}
    session = attach(session, activity)

    assert {:insert, changeset} =
             Recording.replace_activity(
               session,
               activity,
               exercise(@replacement),
               {workout, @entry}
             )

    replacement = saved(changeset)
    session = attach(session, replacement)

    invalid(
      Recording.update_activity(session, replacement, exercise(@replacement), %{rounds: 2}),
      :rounds
    )

    assert hd(session.exercise_logs).sets == [set]
  end

  test "new recording cannot mix legacy swaps or direct set rows into the same session" do
    {session, _activity, _workout} = prescribed()

    legacy =
      struct!(Easy.RecordingReview.Workouts.ExerciseSwap,
        workout_exercise_id: @entry,
        exercise_id: @replacement
      )

    changeset =
      session
      |> Changeset.change()
      |> Changeset.put_embed(:swaps, [legacy])
      |> Recording.validate_session()

    invalid(changeset, :exercise_logs)

    invalid(
      Recording.start_activity(%{session | sets: [%ExerciseSet{}]}, exercise()),
      :workout_log_id
    )

    invalid(Recording.start_activity(%{session() | id: nil}, exercise()), :workout_log_id)
  end

  test "per-round replacement retains rest and permits explicitly supplied compatible targets" do
    {session, activity, workout} = prescribed()

    attrs = %{
      targets_mode: "per_round",
      targets: [
        %{reps: %{mode: "exact", value: 10}, rest: %{mode: "exact", value_s: "30"}},
        %{reps: %{mode: "exact", value: 8}, rest: %{mode: "exact", value_s: "45"}},
        %{reps: %{mode: "exact", value: 6}, rest: %{mode: "exact", value_s: "60"}}
      ]
    }

    activity = saved(Recording.update_activity(session, activity, exercise(), attrs))
    session = attach(session, activity)

    assert {:update, changeset} =
             Recording.replace_activity(
               session,
               activity,
               exercise(@replacement),
               {workout, @entry}
             )

    replacement = saved(changeset)
    assert replacement.targets_mode == :per_round
    assert Enum.map(replacement.targets, & &1.reps) == [nil, nil, nil]

    assert Enum.map(replacement.targets, & &1.rest.value_s) == [
             Decimal.new("30"),
             Decimal.new("45"),
             Decimal.new("60")
           ]

    copied =
      saved(
        Recording.update_activity(
          attach(session, replacement),
          replacement,
          exercise(@replacement),
          attrs
        )
      )

    assert Enum.map(copied.targets, & &1.reps.value) == [10, 8, 6]
  end

  test "a free activity can track sides and resuming the same exercise keeps its record" do
    session = session()
    activity = saved(Recording.start_activity(session, exercise(), nil, :per_side))
    session = attach(session, activity)

    done =
      saved(
        Recording.record_set(session, activity, exercise(), %{round: 1, side: "left", reps: 8})
      )

    activity = %{activity | sets: [done]}
    session = attach(session, activity)
    assert {:update, changeset} = Recording.replace_activity(session, activity, exercise())
    resumed = saved(changeset)
    assert {resumed.id, resumed.sets, resumed.side_mode} == {activity.id, [done], :per_side}
  end

  test "explicitly reopening an activity preserves all results and their swap protection" do
    {session, activity} = started()
    set = saved(Recording.record_set(session, activity, exercise(), %{round: 1, reps: 8}))
    activity = %{activity | sets: [set]}
    session = attach(session, activity)
    completed = saved(Recording.complete_activity(session, activity, exercise(), %{reps: 8}))
    reopened = saved(Recording.reopen_activity(attach(session, completed), completed))
    assert {reopened.state, reopened.reps, reopened.sets} == {:active, 8, [set]}
    session = attach(session, reopened)
    invalid(Recording.skip_activity(session, reopened), :state)

    assert {:insert, changeset} =
             Recording.replace_activity(session, reopened, exercise(@replacement))

    assert saved(changeset).exercise_id == @replacement
    invalid(Recording.reopen_activity(session, reopened), :state)
  end
end
