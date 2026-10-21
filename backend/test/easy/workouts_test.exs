defmodule Easy.WorkoutsTest do
  use Easy.DataCase, async: true
  alias Easy.Attachments.Attachment
  alias Easy.Clients.Client
  alias Easy.{Ctx, Workouts}
  alias Easy.Workouts.{Exercise, Timing, Undo, Workout, WorkoutSchedule}

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC")
    exercise = insert(:exercise, business: coach.business)
    %{ctx: trainer_ctx(coach), client: client, exercise: exercise, today: Date.utc_today()}
  end

  defp attrs(f, overrides \\ %{}) do
    Map.merge(
      %{
        name: "Lower A",
        type: "prescribed",
        groups: [
          %{
            name: "Main",
            rounds: 3,
            exercises: [
              %{
                exercise_id: f.exercise.id,
                targets_mode: "same_for_all",
                targets: [%{reps: %{mode: "exact", value: 8}, rest: %{mode: "range", min_s: 60, max_s: 90}}]
              }
            ]
          }
        ]
      },
      overrides
    )
  end

  defp client_workout(f, overrides \\ %{}) do
    {:ok, %{data: row}} = Workouts.create_workout_for_client(f.ctx, f.client.id, attrs(f, overrides))
    row
  end

  defp scheduled(f, row, overrides \\ %{}) do
    {:ok, %{data: schedule}} =
      Workouts.add_schedule_for_client(
        f.ctx,
        f.client.id,
        Map.merge(%{workout_id: row.id, weekdays_mask: 127}, overrides)
      )

    schedule
  end

  defp past(f, row, mask \\ 127) do
    schedule = scheduled(f, row, %{weekdays_mask: mask})
    Repo.update!(change(schedule, from_date: Date.add(f.today, -30)))
  end

  defp entry_attrs(entry) do
    entry
    |> Ecto.embedded_dump(:json)
    |> Map.take([:id, :exercise_id, :side_mode, :targets_mode, :targets])
  end

  defp content_attrs(workout) do
    %{
      name: workout.name,
      description: workout.description,
      type: workout.type,
      groups: Enum.map(workout.groups, &Ecto.embedded_dump(&1, :json))
    }
  end

  defp reference_ids(workout) do
    Repo.all(
      from r in "workout_exercises",
        where: r.workout_id == type(^workout.id, :binary_id),
        select: type(r.exercise_id, :binary_id),
        order_by: r.exercise_id
    )
  end

  # Insert directly while the recording writer is retired until Task 5.
  defp insert_workout_log(f, workout) do
    now = DateTime.utc_now(:second)

    {1, nil} =
      Repo.insert_all("workout_logs", [
        %{
          id: Ecto.UUID.dump!(Ecto.UUID.generate()),
          business_id: Ecto.UUID.dump!(f.ctx.business_id),
          client_id: Ecto.UUID.dump!(f.client.id),
          workout_id: Ecto.UUID.dump!(workout.id),
          recorded_by: "client",
          state: "active",
          date: f.today,
          inserted_at: now,
          updated_at: now
        }
      ])
  end

  test "every exercise read/write is scoped and built-ins are shared read-only", f do
    foreign = insert(:exercise)
    assert {:error, :not_found} = Workouts.get_exercise(f.ctx, foreign.id)
    assert {:error, :not_found} = Workouts.update_exercise(f.ctx, foreign.id, %{name: "No"})
    assert {:error, :not_found} = Workouts.delete_exercise(f.ctx, foreign.id)
    assert {:error, :not_found} = Workouts.copy_exercise(f.ctx, foreign.id)
    assert {:error, :not_found} = Workouts.archive_exercise(f.ctx, foreign.id)
    assert {:error, :not_found} = Workouts.restore_exercise(f.ctx, foreign.id)
    assert {:ok, %{count: 1, data: [mine]}} = Workouts.list_exercises(f.ctx, search: f.exercise.name)
    assert mine.id == f.exercise.id

    assert {:ok, new} =
             Workouts.create_exercise(f.ctx, %{
               name: "Own",
               kind: "practice",
               goals: ["recovery"],
               places: ["home"],
               business_id: foreign.business_id
             })

    assert new.business_id == f.ctx.business_id
    assert Enum.map(new.metrics, & &1.key) == [:duration]

    assert {:ok, edited} =
             Workouts.update_exercise(f.ctx, new.id, %{
               kind: "activity",
               metrics: [%{key: "distance"}, %{key: "duration", label: "Time"}]
             })

    assert Enum.map(edited.metrics, &{&1.key, &1.label}) == [{:distance, nil}, {:duration, "Time"}]
    assert {:ok, copy} = Workouts.copy_exercise(f.ctx, new.id)
    assert copy.id != new.id and copy.business_id == f.ctx.business_id
    assert {:ok, _} = Workouts.delete_exercise(f.ctx, copy.id)
    builtin = Repo.one!(from(e in Exercise, where: is_nil(e.business_id) and e.name == "Plank"))
    assert {:ok, _} = Workouts.get_exercise(f.ctx, builtin.id)
    assert {:error, :not_found} = Workouts.update_exercise(f.ctx, builtin.id, %{name: "No"})
    assert {:error, :not_found} = Workouts.delete_exercise(f.ctx, builtin.id)
    assert {:ok, own} = Workouts.copy_exercise(f.ctx, builtin.id)
    assert own.business_id == f.ctx.business_id
  end

  test "taxonomy and full metric catalogue validate values and order", f do
    metrics =
      ~w(reps weight duration distance elevation_gain height calories speed incline level power cadence heart_rate effort reserve successes attempts score result tempo)

    assert {:ok, exercise} =
             Workouts.create_exercise(f.ctx, %{
               name: "All",
               kind: "sport",
               goals: ["skill"],
               places: ["court/field"],
               metrics: Enum.map(metrics, &%{key: &1})
             })

    assert Enum.map(exercise.metrics, &to_string(&1.key)) == metrics

    for patch <- [
          %{goals: ["unknown"]},
          %{places: ["court_field"]},
          %{metrics: [%{key: "custom"}]},
          %{metrics: [%{key: "reps"}, %{key: "reps"}]},
          %{metrics: [%{key: "grade"}]},
          %{goals: ["skill", "skill"]}
        ] do
      assert {:error, %Ecto.Changeset{}} = Workouts.update_exercise(f.ctx, exercise.id, patch)
    end
  end

  test "library reads and each mutation cannot reach a foreign workout", f do
    other = insert(:coach)
    {:ok, foreign} = Workouts.create_workout(trainer_ctx(other), %{name: "Foreign"})
    assert {:error, :not_found} = Workouts.get_workout(f.ctx, foreign.id)
    assert {:error, :not_found} = Workouts.update_workout(f.ctx, foreign.id, %{name: "No"})
    assert {:error, :not_found} = Workouts.delete_workout(f.ctx, foreign.id)
    assert {:error, :not_found} = Workouts.copy_workout(f.ctx, foreign.id)
    assert {:ok, %{data: [], count: 0}} = Workouts.list_workouts(f.ctx)
    assert {:ok, library} = Workouts.create_workout(f.ctx, Map.put(attrs(f), :business_id, foreign.business_id))
    assert library.business_id == f.ctx.business_id and is_nil(library.client_id)
    assert {:ok, copy} = Workouts.copy_workout(f.ctx, library.id)
    assert copy.id != library.id and hd(copy.groups).id != hd(library.groups).id
    assert {:ok, edited} = Workouts.update_workout(f.ctx, copy.id, %{name: "Copy"})
    assert edited.id == copy.id and edited.name == "Copy"
    assert {:ok, _} = Workouts.delete_workout(f.ctx, copy.id)
  end

  test "all client reads and writes deny foreign clients and foreign row ids", f do
    foreign_client = insert(:client)
    foreign_ctx = trainer_ctx(foreign_client.coach)
    {:ok, %{data: foreign}} = Workouts.create_workout_for_client(foreign_ctx, foreign_client.id, %{name: "Foreign", type: "open"})

    {:ok, %{data: schedule, undo_token: token}} =
      Workouts.add_schedule_for_client(foreign_ctx, foreign_client.id, %{workout_id: foreign.id, weekdays_mask: 127})

    for client_id <- [foreign_client.id, f.client.id] do
      assert {:error, :not_found} = Workouts.get_workout_for_client(f.ctx, client_id, foreign.id)
      assert {:error, :not_found} = Workouts.update_workout_for_client(f.ctx, client_id, foreign.id, %{name: "No"})
      assert {:error, :not_found} = Workouts.delete_workout_for_client(f.ctx, client_id, foreign.id)
      assert {:error, :not_found} = Workouts.copy_workout_for_client(f.ctx, client_id, foreign.id)

      assert {:error, :not_found} =
               Workouts.add_schedule_for_client(f.ctx, client_id, %{workout_id: foreign.id, weekdays_mask: 1})

      assert {:error, :not_found} =
               Workouts.update_schedule_for_client(f.ctx, client_id, schedule.id, %{weekdays_mask: 1})

      assert {:error, :not_found} = Workouts.remove_schedule_for_client(f.ctx, client_id, schedule.id)
    end

    assert {:error, :not_found} = Workouts.list_workouts_for_client(f.ctx, foreign_client.id)
    assert {:error, :not_found} = Workouts.read_week_for_client(f.ctx, foreign_client.id)
    assert {:error, :not_found} = Workouts.create_workout_for_client(f.ctx, foreign_client.id, attrs(f))
    assert {:error, :not_found} = Workouts.undo_for_client(f.ctx, foreign_client.id, token)
    assert {:error, :conflict} = Workouts.undo_for_client(f.ctx, f.client.id, token)
    assert {:ok, %{count: 0}} = Workouts.list_workouts_for_client(f.ctx, f.client.id)
    assert {:ok, %{workouts: [], schedules: []}} = Workouts.read_week_for_client(f.ctx, f.client.id)
    {:ok, foreign_library} = Workouts.create_workout(foreign_ctx, %{name: "Foreign library"})
    assert {:error, :not_found} = Workouts.assign_workout_to_client(f.ctx, f.client.id, foreign_library.id)
    {:ok, library} = Workouts.create_workout(f.ctx, attrs(f))
    assert {:error, :not_found} = Workouts.assign_workout_to_client(f.ctx, foreign_client.id, library.id)
  end

  test "assigning copies content, groups and exercises with new ids and no link", f do
    {:ok, library} = Workouts.create_workout(f.ctx, attrs(f))
    assert {:ok, %{data: copy}} = Workouts.assign_workout_to_client(f.ctx, f.client.id, library.id)
    assert copy.client_id == f.client.id and copy.id != library.id
    assert hd(copy.groups).id != hd(library.groups).id
    assert hd(hd(copy.groups).exercises).id != hd(hd(library.groups).exercises).id
    assert {:ok, _} = Workouts.update_workout(f.ctx, library.id, %{name: "Changed library", groups: []})
    assert {:ok, saved} = Workouts.get_workout_for_client(f.ctx, f.client.id, copy.id)
    assert saved.name == "Lower A" and length(saved.groups) == 1
    assert {:ok, %{data: another}} = Workouts.copy_workout_for_client(f.ctx, f.client.id, copy.id)
    assert another.id != copy.id
    assert {:error, :in_use} = Workouts.delete_exercise(f.ctx, f.exercise.id)
  end

  test "same-day and never-applicable edits remain in place", f do
    row = client_workout(f)
    schedule = scheduled(f, row)
    assert {:ok, %{data: edited}} = Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, %{name: "Today"})
    assert edited.id == row.id

    assert {:ok, %{data: changed}} =
             Workouts.update_schedule_for_client(f.ctx, f.client.id, schedule.id, %{weekdays_mask: 1})

    assert changed.id == schedule.id
    assert {:ok, _} = Workouts.delete_workout_for_client(f.ctx, f.client.id, row.id)
    refute Repo.get(Workout, row.id)
    refute Repo.get(WorkoutSchedule, schedule.id)
    unused = client_workout(f)
    tomorrow = Date.add(f.today, 1)
    future = scheduled(f, unused, %{weekdays_mask: Timing.bit(Date.day_of_week(tomorrow))})
    Repo.update!(change(future, from_date: f.today))
    assert {:ok, %{data: edited}} = Workouts.update_workout_for_client(f.ctx, f.client.id, unused.id, %{name: "Unused"})
    assert edited.id == unused.id
  end

  test "a past applicable date creates new content ids and splits every active schedule", f do
    row = client_workout(f)
    old = past(f, row)
    future = scheduled(f, row, %{time: "18:30:00"})

    assert {:ok, %{data: copy}} =
             Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, %{name: "Today onward"})

    assert copy.id != row.id and hd(copy.groups).id != hd(row.groups).id
    assert hd(hd(copy.groups).exercises).id != hd(hd(row.groups).exercises).id
    assert Repo.get!(Workout, row.id).archived_at
    assert Repo.get!(Workout, row.id).name == "Lower A"
    assert Repo.get!(WorkoutSchedule, old.id).until_date == Date.add(f.today, -1)
    assert Repo.get!(WorkoutSchedule, future.id).workout_id == copy.id

    assert {:ok, %{workouts: [historical], schedules: [historical_schedule]}} =
             Workouts.read_week_for_client(f.ctx, f.client.id, on: Date.add(f.today, -1))

    assert historical.id == row.id and historical_schedule.id == old.id

    assert {:ok, %{workouts: [current], schedules: current_schedules}} =
             Workouts.read_week_for_client(f.ctx, f.client.id)

    assert current.id == copy.id and length(current_schedules) == 2
  end

  test "an identical save changes nothing", f do
    row = client_workout(f)
    row = Repo.update!(change(row, updated_at: DateTime.add(row.updated_at, -60)))
    old = past(f, row)
    future = scheduled(f, row, %{time: "18:30:00"})
    equivalent = attrs(f, %{name: "  Lower A  "})
    equivalent = put_in(equivalent, [:groups, Access.at(0), :rounds], "3")
    equivalent = put_in(equivalent, [:groups, Access.at(0), :exercises, Access.at(0), :targets, Access.at(0), :reps, :value], "8")

    for input <- [%{}, %{name: row.name}, equivalent, content_attrs(row)] do
      assert {:ok, %{data: saved}} = Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, input)
      assert saved.id == row.id
      assert saved.groups == row.groups
      assert saved.updated_at == row.updated_at
      assert saved.archived_at == nil
      assert Repo.get!(WorkoutSchedule, old.id) == old
      assert Repo.get!(WorkoutSchedule, future.id) == future
      assert Repo.aggregate(Workout, :count) == 1
    end
  end

  test "unchanged library and future-only workouts retain their nested identities", f do
    assert {:ok, library} = Workouts.create_workout(f.ctx, attrs(f))
    assert {:ok, saved} = Workouts.update_workout(f.ctx, library.id, attrs(f))
    assert saved.groups == library.groups

    row = client_workout(f)
    schedule = scheduled(f, row)
    assert {:ok, %{data: saved}} = Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, attrs(f))
    assert {saved.id, saved.groups, saved.archived_at} == {row.id, row.groups, nil}
    assert Repo.get!(WorkoutSchedule, schedule.id) == schedule
  end

  test "changes to rounds, targets, or rest still preserve the earlier prescription", f do
    inputs = [
      put_in(attrs(f), [:groups, Access.at(0), :rounds], 4),
      put_in(attrs(f), [:groups, Access.at(0), :exercises, Access.at(0), :targets, Access.at(0), :reps, :value], 10),
      put_in(attrs(f), [:groups, Access.at(0), :exercises, Access.at(0), :targets, Access.at(0), :rest], %{mode: "exact", value_s: 120})
    ]

    for input <- inputs do
      row = client_workout(f)
      schedule = past(f, row)
      assert {:ok, %{data: copy}} = Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, input)
      assert copy.id != row.id
      assert Repo.get!(Workout, row.id).archived_at
      assert Repo.get!(WorkoutSchedule, schedule.id).workout_id == row.id
      assert {:ok, retained} = Workouts.get_workout_for_client(f.ctx, f.client.id, row.id)

      assert hd(retained.groups).rounds == 3
      target = hd(hd(hd(retained.groups).exercises).targets)
      assert {target.reps.mode, target.reps.value} == {:exact, 8}
      assert {target.rest.mode, target.rest.min_s, target.rest.max_s} == {:range, Decimal.new(60), Decimal.new(90)}
    end
  end

  test "an otherwise unchanged historical workout still rejects invalid content", f do
    row = client_workout(f)
    schedule = past(f, row)

    invalid_inputs = [
      %{name: "   "},
      %{name: nil},
      put_in(attrs(f), [:groups, Access.at(0), :rounds], 0),
      put_in(attrs(f), [:groups, Access.at(0), :exercises], []),
      put_in(attrs(f), [:groups, Access.at(0), :exercises, Access.at(0), :targets, Access.at(0), :reps, :value], 1.5)
    ]

    for input <- invalid_inputs do
      assert {:error, _} = Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, input)
      assert Repo.get!(Workout, row.id).archived_at == nil
      assert Repo.get!(WorkoutSchedule, schedule.id) == schedule
      assert Repo.aggregate(Workout, :count) == 1
    end
  end

  test "a past range without an applicable weekday does not freeze content", f do
    row = client_workout(f)
    next_day = Date.add(f.today, 1)
    schedule = scheduled(f, row, %{weekdays_mask: Timing.bit(Date.day_of_week(next_day))})
    Repo.update!(change(schedule, from_date: Date.add(f.today, -1)))

    assert {:ok, %{data: changed}} =
             Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, %{name: "Still editable"})

    assert changed.id == row.id
  end

  test "delete archives only facts and removes future-only schedule rows", f do
    row = client_workout(f)
    old = past(f, row, Timing.bit(Date.day_of_week(Date.add(f.today, -3))))
    future = scheduled(f, row, %{time: "19:00:00"})

    assert {:ok, %{data: %{workouts: [], schedules: []}, undo_token: token}} =
             Workouts.delete_workout_for_client(f.ctx, f.client.id, row.id)

    assert Repo.get!(WorkoutSchedule, old.id).until_date == Date.add(f.today, -3)
    refute Repo.get(WorkoutSchedule, future.id)
    assert Repo.get!(Workout, row.id).archived_at

    assert {:ok, %{workouts: [restored], schedules: restored_rows}} =
             Workouts.undo_for_client(f.ctx, f.client.id, token)

    assert restored.id == row.id and length(restored_rows) == 2
  end

  test "catalogue edits appear through current exercise references while targets and side mode stay fixed", f do
    row = client_workout(f)
    past(f, row)

    assert {:ok, _} =
             Workouts.update_exercise(f.ctx, f.exercise.id, %{
               name: "New movement",
               metrics: [%{key: "reps", label: "Count"}, %{key: "weight"}]
             })

    assert {:ok, %{data: copy}} =
             Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, %{name: "New instructions"})

    for id <- [row.id, copy.id] do
      {:ok, saved} = Workouts.get_workout_for_client(f.ctx, f.client.id, id)
      item = hd(hd(saved.groups).exercises)
      assert item.exercise.name == "New movement"
      assert Enum.map(item.exercise.metrics, &{&1.key, &1.label}) == [{:reps, "Count"}, {:weight, nil}]
      assert item.side_mode == :combined
      assert hd(item.targets).reps.value == 8
    end
  end

  test "schedules merge identical occasions but keep other session details separate", f do
    row = client_workout(f)
    first = scheduled(f, row, %{weekdays_mask: 1})
    merged = scheduled(f, row, %{weekdays_mask: 8})
    assert merged.id == first.id and merged.weekdays_mask == 9
    timed = scheduled(f, row, %{weekdays_mask: 1, time: "18:30:00", place: "Gym", coach_id: f.ctx.coach_id})
    assert timed.id != first.id

    assert {:error, %Ecto.Changeset{}} =
             Workouts.update_schedule_for_client(f.ctx, f.client.id, timed.id, %{meeting_url: "https://meet.example"})

    foreign_coach = insert(:coach)

    assert {:error, :coach_not_active} =
             Workouts.update_schedule_for_client(f.ctx, f.client.id, timed.id, %{coach_id: foreign_coach.id})

    assert {:error, %Ecto.Changeset{}} =
             Workouts.add_schedule_for_client(f.ctx, f.client.id, %{workout_id: row.id, weekdays_mask: 0})

    assert {:error, :invalid_date} = Workouts.remove_schedule_for_client(f.ctx, f.client.id, first.id, 8)

    assert {:ok, %{data: %{schedules: remaining}}} =
             Workouts.remove_schedule_for_client(f.ctx, f.client.id, first.id, 1)

    assert Enum.find(remaining, &(&1.id == first.id)).weekdays_mask == 8
  end

  test "sparse facts end at the last actual weekday and old rules cannot be changed", f do
    row = client_workout(f)
    three_days_ago = Date.add(f.today, -3)
    old = past(f, row, Timing.bit(Date.day_of_week(three_days_ago)))

    assert {:ok, %{data: changed}} =
             Workouts.update_schedule_for_client(f.ctx, f.client.id, old.id, %{weekdays_mask: 127})

    assert changed.id != old.id and changed.from_date == f.today
    assert Repo.get!(WorkoutSchedule, old.id).until_date == three_days_ago
    assert {:error, :not_found} = Workouts.update_schedule_for_client(f.ctx, f.client.id, old.id, %{weekdays_mask: 1})
    assert {:error, :not_found} = Workouts.remove_schedule_for_client(f.ctx, f.client.id, old.id)
  end

  test "Undo is signed scoped single-use and conflicts after another write or local day", f do
    row = client_workout(f)
    old = past(f, row)
    before = Undo.snapshot(f.ctx, f.client.id)

    assert {:ok, %{undo_token: token}} =
             Workouts.update_schedule_for_client(f.ctx, f.client.id, old.id, %{weekdays_mask: 1})

    assert {:ok, _} = Workouts.undo_for_client(f.ctx, f.client.id, token)
    assert Undo.snapshot(f.ctx, f.client.id) == before
    assert {:error, :conflict} = Workouts.undo_for_client(f.ctx, f.client.id, token)
    assert {:error, :conflict} = Workouts.undo_for_client(f.ctx, f.client.id, "bad token")

    assert {:ok, %{undo_token: token}} =
             Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, %{name: "Changed"})

    assert {:ok, _} = Workouts.create_workout_for_client(f.ctx, f.client.id, %{name: "Other"})
    assert {:error, :conflict} = Workouts.undo_for_client(f.ctx, f.client.id, token)
    assert {:error, :conflict} = Undo.restore(f.ctx, f.client.id, token, Date.add(f.today, 1))
  end

  test "Undo conflicts safely if an external exercise reference was deleted", f do
    row = client_workout(f)
    {:ok, %{undo_token: token}} = Workouts.delete_workout_for_client(f.ctx, f.client.id, row.id)
    assert {:ok, _} = Workouts.delete_exercise(f.ctx, f.exercise.id)
    assert {:error, :conflict} = Workouts.undo_for_client(f.ctx, f.client.id, token)
    assert {:ok, %{workouts: [], schedules: []}} = Workouts.read_week_for_client(f.ctx, f.client.id)
    refute Repo.get(Workout, row.id)
  end

  test "per-round targets and rest match rounds and use only selected metrics", f do
    valid = [
      %{reps: %{mode: "exact", value: 5}, rest: %{mode: "none"}},
      %{weight: %{mode: "exact", value: -10}, rest: %{mode: "exact", value_s: 60}},
      %{rest: %{mode: "client_chooses"}}
    ]

    group = %{rounds: 3, exercises: [%{exercise_id: f.exercise.id, targets_mode: "per_round", targets: valid}]}
    assert {:ok, row} = Workouts.create_workout(f.ctx, attrs(f, %{groups: [group]}))
    targets = hd(hd(row.groups).exercises).targets
    assert Enum.map(targets, & &1.rest.mode) == [:none, :exact, :client_chooses]
    assert hd(targets).reps.value == 5
    assert Decimal.equal?(Enum.at(targets, 1).weight.value, -10)

    for target <- [
          %{unknown: %{mode: "exact", value: 5}},
          %{reps: %{mode: "exact", value: 1.5}},
          %{weight: %{mode: "percent", value: 75}},
          %{reps: %{mode: "range", min: 10, max: 5}},
          %{duration: %{mode: "exact", value: 30}}
        ] do
      invalid = put_in(group, [:exercises], [%{exercise_id: f.exercise.id, targets: [target]}])
      assert {:error, %Ecto.Changeset{}} = Workouts.create_workout(f.ctx, attrs(f, %{groups: [invalid]}))
    end

    assert {:error, %Ecto.Changeset{}} =
             Workouts.create_workout(f.ctx, attrs(f, %{groups: [%{rounds: 3, exercises: []}]}))

    assert {:ok, _} = Workouts.create_workout(f.ctx, %{name: "Empty draft", groups: []})
    assert {:error, %Ecto.Changeset{}} = Workouts.create_workout(f.ctx, %{name: "Video", type: "video"})

    assert {:error, %Ecto.Changeset{}} =
             Workouts.create_workout(f.ctx, %{name: "Open", type: "open", video_url: "https://example.com/v.mp4"})

    assert {:ok, _} =
             Workouts.create_workout(f.ctx, %{name: "Video", type: "video", video_url: "https://example.com/v.mp4"})
  end

  test "an identical save after logging starts creates no copy", f do
    row = client_workout(f)
    row = Repo.update!(change(row, updated_at: DateTime.add(row.updated_at, -60)))
    schedule = scheduled(f, row)
    insert_workout_log(f, row)

    for input <- [attrs(f), content_attrs(row)] do
      assert {:ok, %{data: saved}} = Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, input)

      assert {saved.id, saved.groups, saved.updated_at, saved.archived_at} ==
               {row.id, row.groups, row.updated_at, nil}

      assert Repo.get!(WorkoutSchedule, schedule.id) == schedule
      assert Repo.aggregate(Workout, :count) == 1
      assert reference_ids(saved) == [f.exercise.id]
    end
  end

  test "an edit after a log references the workout copies it", f do
    row = client_workout(f)
    schedule = scheduled(f, row)
    insert_workout_log(f, row)
    input = put_in(attrs(f), [:groups, Access.at(0), :exercises, Access.at(0), :targets, Access.at(0), :reps, :value], 12)

    assert {:ok, %{data: copy}} = Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, input)
    assert copy.id != row.id
    assert hd(hd(hd(copy.groups).exercises).targets).reps.value == 12
    original = Repo.get!(Workout, row.id)
    assert original.archived_at
    assert content_attrs(original).groups == content_attrs(row).groups
    assert Repo.get!(WorkoutSchedule, schedule.id).workout_id == copy.id
    assert reference_ids(copy) == [f.exercise.id]
    assert reference_ids(original) == [f.exercise.id]
  end

  test "editing after an unlogged past occurrence keeps the old content for that date", f do
    row = client_workout(f)
    past_date = Date.add(f.today, -7)
    schedule = scheduled(f, row, %{weekdays_mask: Timing.bit(Date.day_of_week(past_date))})
    Repo.update!(change(schedule, from_date: past_date))
    input = put_in(attrs(f), [:groups, Access.at(0), :exercises, Access.at(0), :targets, Access.at(0), :reps, :value], 12)

    assert {:ok, %{data: copy}} = Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, input)
    assert copy.id != row.id
    assert Repo.get!(Workout, row.id).archived_at
    assert Repo.get!(WorkoutSchedule, schedule.id).until_date == past_date
    assert {:ok, %{workouts: [historical]}} = Workouts.read_week_for_client(f.ctx, f.client.id, on: past_date)
    assert historical.id == row.id
    assert hd(hd(hd(historical.groups).exercises).targets).reps.value == 8
    assert {:ok, %{workouts: [current]}} = Workouts.read_week_for_client(f.ctx, f.client.id)
    assert current.id == copy.id
    assert hd(hd(hd(current.groups).exercises).targets).reps.value == 12
  end

  test "a future-only workout is edited in place", f do
    row = client_workout(f)
    schedule = scheduled(f, row, %{from_date: Date.add(f.today, 7)})
    assert {:ok, %{data: saved}} = Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, %{name: "Next week"})
    assert {saved.id, saved.name, saved.archived_at} == {row.id, "Next week", nil}
    assert hd(saved.groups).id == hd(row.groups).id
    assert Repo.get!(WorkoutSchedule, schedule.id) == schedule
  end

  test "copying a workout generates fresh embedded ids", f do
    assert {:ok, row} = Workouts.create_workout(f.ctx, attrs(f))
    assert {:ok, copy} = Workouts.copy_workout(f.ctx, row.id)
    assert copy.id != row.id
    assert hd(copy.groups).id != hd(row.groups).id
    original = hd(hd(row.groups).exercises)
    copied = hd(hd(copy.groups).exercises)
    assert copied.id != original.id

    assert {copied.exercise_id, copied.side_mode, copied.targets} ==
             {original.exercise_id, original.side_mode, original.targets}

    assert reference_ids(copy) == [f.exercise.id]
  end

  test "membership rows follow content and block exercise deletion", f do
    second = insert(:exercise, business: f.client.business)

    group = %{
      rounds: 3,
      exercises: [
        %{exercise_id: f.exercise.id, targets: [%{}]},
        %{exercise_id: f.exercise.id, targets: [%{}]},
        %{exercise_id: second.id, targets: [%{}]}
      ]
    }

    assert {:ok, row} = Workouts.create_workout(f.ctx, attrs(f, %{groups: [group]}))
    assert reference_ids(row) == Enum.sort([f.exercise.id, second.id])
    assert {:error, :in_use} = Workouts.delete_exercise(f.ctx, f.exercise.id)
    assert {:error, :in_use} = Workouts.delete_exercise(f.ctx, second.id)
    assert {:ok, saved} = Workouts.update_workout(f.ctx, row.id, attrs(f))
    assert reference_ids(saved) == [f.exercise.id]
    assert {:ok, _} = Workouts.delete_exercise(f.ctx, second.id)
    assert {:ok, saved} = Workouts.update_workout(f.ctx, row.id, %{groups: []})
    assert reference_ids(saved) == []
    assert {:ok, _} = Workouts.delete_exercise(f.ctx, f.exercise.id)
  end

  test "a scheduled workout cannot lose its last group", f do
    row = client_workout(f)
    schedule = scheduled(f, row)
    assert {:error, changeset} = Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, %{groups: []})
    assert errors_on(changeset).groups == ["must contain exercises before scheduling"]
    assert content_attrs(Repo.get!(Workout, row.id)).groups == content_attrs(row).groups
    assert Repo.get!(WorkoutSchedule, schedule.id) == schedule

    assert {:ok, %{data: draft}} = Workouts.create_workout_for_client(f.ctx, f.client.id, %{name: "Draft"})
    assert {:error, changeset} = Workouts.add_schedule_for_client(f.ctx, f.client.id, %{workout_id: draft.id, weekdays_mask: 127})
    assert errors_on(changeset).groups == ["must contain exercises before scheduling"]
    assert {:ok, %{data: filled}} = Workouts.update_workout_for_client(f.ctx, f.client.id, draft.id, attrs(f))
    assert scheduled(f, filled).workout_id == filled.id
  end

  test "a new archived exercise is rejected but a retained one saves", f do
    row = client_workout(f)
    assert {:ok, _} = Workouts.archive_exercise(f.ctx, f.exercise.id)
    assert {:ok, %{data: saved}} = Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, %{name: "Retained"})
    assert hd(hd(saved.groups).exercises).exercise.archived_at
    assert reference_ids(saved) == [f.exercise.id]
    assert {:error, changeset} = Workouts.create_workout(f.ctx, attrs(f))
    assert %Ecto.Changeset{} = changeset
    assert Map.has_key?(errors_on(changeset), :groups)

    second = insert(:exercise, business: f.client.business)
    assert {:ok, _} = Workouts.archive_exercise(f.ctx, second.id)
    input = put_in(attrs(f), [:groups, Access.at(0), :exercises, Access.at(0), :exercise_id], second.id)
    assert {:error, changeset} = Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, input)
    assert Map.has_key?(errors_on(changeset), :groups)
    assert reference_ids(row) == [f.exercise.id]
  end

  test "per_side keeps one target entry per round", f do
    input = attrs(f)
    input = put_in(input, [:groups, Access.at(0), :exercises, Access.at(0), :side_mode], "per_side")
    input = put_in(input, [:groups, Access.at(0), :exercises, Access.at(0), :targets_mode], "per_round")
    targets = for count <- [5, 6, 7], do: %{reps: %{mode: "exact", value: count}, rest: %{mode: "none"}}
    input = put_in(input, [:groups, Access.at(0), :exercises, Access.at(0), :targets], targets)
    assert {:ok, row} = Workouts.create_workout(f.ctx, input)
    entry = hd(hd(row.groups).exercises)
    assert {entry.side_mode, length(entry.targets)} == {:per_side, 3}
    assert Enum.map(entry.targets, & &1.reps.value) == [5, 6, 7]
    doubled = put_in(input, [:groups, Access.at(0), :exercises, Access.at(0), :targets], targets ++ targets)
    assert {:error, %Ecto.Changeset{}} = Workouts.update_workout(f.ctx, row.id, doubled)
  end

  test "a blank name returns a changeset error", f do
    row = client_workout(f)
    past(f, row)
    assert {:error, changeset} = Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, %{name: "   "})
    assert [_ | _] = errors_on(changeset).name
    assert Repo.get!(Workout, row.id).archived_at == nil
    assert Repo.aggregate(Workout, :count) == 1
  end

  test "undo restores content, schedules and membership", f do
    row = client_workout(f)
    schedule = past(f, row)
    second = insert(:exercise, business: f.client.business)
    input = put_in(attrs(f), [:groups, Access.at(0), :exercises, Access.at(0), :exercise_id], second.id)
    assert {:ok, %{data: copy, undo_token: token}} = Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, input)
    assert reference_ids(copy) == [second.id]
    assert {:ok, %{workouts: [restored], schedules: [restored_schedule]}} = Workouts.undo_for_client(f.ctx, f.client.id, token)
    assert {restored.id, restored.groups, restored.archived_at} == {row.id, row.groups, nil}
    assert restored_schedule.id == schedule.id
    assert Repo.get!(WorkoutSchedule, schedule.id) == schedule
    assert reference_ids(restored) == [f.exercise.id]
    refute Repo.get(Workout, copy.id)
    assert reference_ids(copy) == []
    assert {:ok, _} = Workouts.delete_exercise(f.ctx, second.id)
    assert {:error, :in_use} = Workouts.delete_exercise(f.ctx, f.exercise.id)
  end

  test "video_url creates one attachment and an unchanged url keeps it", f do
    url = "https://example.com/v.mp4"
    assert {:ok, row} = Workouts.create_workout(f.ctx, %{name: "Video", type: "video", video_url: url})
    attachment = Repo.get!(Attachment, row.video_id)
    assert {attachment.source, attachment.external_url, attachment.client_id} == {:external_link, url, nil}
    assert attachment.business_id == f.ctx.business_id
    assert {:ok, saved} = Workouts.update_workout(f.ctx, row.id, %{video_url: url})
    assert {saved.video_id, saved.updated_at} == {row.video_id, row.updated_at}
    assert Repo.aggregate(from(a in Attachment, where: a.business_id == ^f.ctx.business_id), :count) == 1
    assert {:ok, copy} = Workouts.copy_workout(f.ctx, row.id)
    assert copy.video_id != row.video_id
    assert Repo.get!(Attachment, copy.video_id).external_url == url
    assert {:ok, cleared} = Workouts.update_workout(f.ctx, copy.id, %{type: "open", video_url: nil})
    assert cleared.video_id == nil
    assert Repo.get!(Attachment, copy.video_id).external_url == url
  end

  test "a chosen future start date is kept and a past one is rejected", f do
    row = client_workout(f)
    future = Date.add(f.today, 7)
    schedule = scheduled(f, row, %{from_date: future})
    assert schedule.from_date == future

    assert {:error, changeset} =
             Workouts.add_schedule_for_client(f.ctx, f.client.id, %{
               workout_id: row.id,
               weekdays_mask: 127,
               from_date: Date.add(f.today, -1)
             })

    assert %Ecto.Changeset{} = changeset
    assert Map.has_key?(errors_on(changeset), :from_date)
    assert Repo.get!(WorkoutSchedule, schedule.id) == schedule
  end

  test "exercise and workout cursors retain literal searches timestamp ties and deleted anchors", f do
    timestamp = DateTime.utc_now(:second)

    rows =
      for n <- 1..4, do: insert(:exercise, business: f.client.business, name: "Literal_% #{n}", inserted_at: timestamp)

    insert(:exercise, name: "Literal_% foreign")
    expected = rows |> Enum.map(& &1.id) |> Enum.sort(:desc)

    assert {:ok, %{count: 4, data: first, next_cursor: cursor}} =
             Workouts.list_exercises(f.ctx, search: "Literal_%", limit: 2)

    assert Enum.map(first, & &1.id) == Enum.take(expected, 2)
    Repo.delete!(List.last(first))

    assert {:ok, %{count: 3, data: rest, next_cursor: nil}} =
             Workouts.list_exercises(f.ctx, search: "Literal_%", limit: 2, cursor: cursor)

    assert Enum.map(rest, & &1.id) == Enum.drop(expected, 2)
    assert {:error, :invalid_cursor} = Workouts.list_exercises(f.ctx, cursor: "bad")
    assert {:error, :cursor_incompatible} = Workouts.list_workouts(f.ctx, offset: 1)
    assert {:error, :invalid_date} = Workouts.read_week_for_client(f.ctx, f.client.id, on: "bad")
  end

  test "two occasions converge into one rule and preserve both prior histories", f do
    row = client_workout(f)
    first = scheduled(f, row, %{weekdays_mask: 1, time: "18:00:00"})
    second = scheduled(f, row, %{weekdays_mask: 8, time: "19:00:00"})

    assert {:ok, %{data: same_day}} =
             Workouts.update_schedule_for_client(f.ctx, f.client.id, second.id, %{time: "18:00:00"})

    assert same_day.id == first.id and same_day.weekdays_mask == 9
    refute Repo.get(WorkoutSchedule, second.id)
    historical_first = Repo.update!(change(same_day, from_date: Date.add(f.today, -30)))

    historical_second =
      scheduled(f, row, %{weekdays_mask: 2, time: "19:00:00"})
      |> then(&Repo.update!(change(&1, from_date: Date.add(f.today, -30))))

    assert {:ok, %{data: merged}} =
             Workouts.update_schedule_for_client(f.ctx, f.client.id, historical_second.id, %{time: "18:00:00"})

    assert merged.id not in [historical_first.id, historical_second.id]
    assert merged.weekdays_mask == 11 and merged.from_date == f.today
    assert Repo.get!(WorkoutSchedule, historical_first.id).until_date == Timing.last_fact(historical_first, f.today)
    assert Repo.get!(WorkoutSchedule, historical_second.id).until_date == Timing.last_fact(historical_second, f.today)
    assert {:ok, %{schedules: [live]}} = Workouts.read_week_for_client(f.ctx, f.client.id)
    assert live.id == merged.id
  end

  test "moving an entry between groups keeps its id", f do
    second = insert(:exercise, business: f.client.business)

    groups = [
      %{rounds: 3, exercises: [%{exercise_id: f.exercise.id, targets: [%{rest: %{mode: "none"}}]}]},
      %{rounds: 3, exercises: [%{exercise_id: second.id, targets: [%{rest: %{mode: "none"}}]}]}
    ]

    {:ok, row} = Workouts.create_workout(f.ctx, attrs(f, %{groups: groups}))

    {:ok, _} =
      Workouts.update_exercise(f.ctx, f.exercise.id, %{
        name: "Changed catalogue",
        metrics: [%{key: "reps", label: "Count"}, %{key: "weight"}]
      })

    first = hd(row.groups)
    last = List.last(row.groups)
    item = hd(first.exercises)
    other = hd(last.exercises)

    body = %{
      groups: [
        %{
          id: last.id,
          rounds: 3,
          exercises: [
            entry_attrs(other),
            entry_attrs(item)
          ]
        }
      ]
    }

    assert {:ok, saved} = Workouts.update_workout(f.ctx, row.id, body)
    moved = List.last(hd(saved.groups).exercises)
    assert moved.id == item.id
    assert moved.exercise.name == "Changed catalogue"
    assert Enum.map(moved.exercise.metrics, & &1.key) == [:reps, :weight]
    assert moved.side_mode == :combined
  end

  test "group and exercise order follows the saved arrays after a reorder", f do
    second = insert(:exercise, business: f.client.business)

    groups = [
      %{name: "Second", rounds: 2, exercises: [%{exercise_id: second.id, targets: [%{rest: %{mode: "none"}}]}, %{exercise_id: f.exercise.id, targets: [%{rest: %{mode: "none"}}]}]},
      %{name: "First", rounds: 3, exercises: [%{exercise_id: f.exercise.id, targets: [%{rest: %{mode: "none"}}]}]}
    ]

    assert {:ok, row} = Workouts.create_workout(f.ctx, attrs(f, %{groups: groups}))
    assert Enum.map(row.groups, & &1.name) == ["Second", "First"]
    assert Enum.map(hd(row.groups).exercises, & &1.exercise_id) == [second.id, f.exercise.id]
    wire = EasyWeb.Types.Workout.take(row)

    reordered =
      Enum.reverse(wire.groups)
      |> Enum.map(fn group ->
        Map.update!(group, :exercises, fn items -> Enum.reverse(items) |> Enum.map(&Map.delete(&1, :exercise)) end)
      end)

    assert {:ok, saved} = Workouts.update_workout(f.ctx, row.id, %{groups: reordered})
    assert Enum.map(saved.groups, & &1.name) == ["First", "Second"]
    assert Enum.map(List.last(saved.groups).exercises, & &1.exercise_id) == [f.exercise.id, second.id]
  end

  test "local today uses the client's timezone instead of the server date", f do
    client = Repo.update!(change(f.client, timezone: "Pacific/Kiritimati"))
    expected = Client.local_date(Repo.preload(client, :business), DateTime.utc_now())
    assert {:ok, %{today: ^expected}} = Workouts.read_week_for_client(f.ctx, client.id)
    row = client_workout(f)
    schedule = scheduled(%{f | client: client}, row)
    assert schedule.from_date == expected
  end

  test "every public operation rejects client actors", f do
    client_ctx = %Ctx{business_id: f.ctx.business_id, client_id: f.client.id, user_id: f.client.user_id}
    id = Ecto.UUID.generate()

    operations = [
      fn -> Workouts.list_exercises(client_ctx) end,
      fn -> Workouts.get_exercise(client_ctx, id) end,
      fn -> Workouts.create_exercise(client_ctx, %{}) end,
      fn -> Workouts.update_exercise(client_ctx, id, %{}) end,
      fn -> Workouts.copy_exercise(client_ctx, id) end,
      fn -> Workouts.delete_exercise(client_ctx, id) end,
      fn -> Workouts.archive_exercise(client_ctx, id) end,
      fn -> Workouts.restore_exercise(client_ctx, id) end,
      fn -> Workouts.list_workouts(client_ctx) end,
      fn -> Workouts.get_workout(client_ctx, id) end,
      fn -> Workouts.create_workout(client_ctx, %{}) end,
      fn -> Workouts.update_workout(client_ctx, id, %{}) end,
      fn -> Workouts.copy_workout(client_ctx, id) end,
      fn -> Workouts.delete_workout(client_ctx, id) end,
      fn -> Workouts.list_workouts_for_client(client_ctx, f.client.id) end,
      fn -> Workouts.get_workout_for_client(client_ctx, f.client.id, id) end,
      fn -> Workouts.create_workout_for_client(client_ctx, f.client.id, %{}) end,
      fn -> Workouts.update_workout_for_client(client_ctx, f.client.id, id, %{}) end,
      fn -> Workouts.copy_workout_for_client(client_ctx, f.client.id, id) end,
      fn -> Workouts.delete_workout_for_client(client_ctx, f.client.id, id) end,
      fn -> Workouts.assign_workout_to_client(client_ctx, f.client.id, id) end,
      fn -> Workouts.read_week_for_client(client_ctx, f.client.id) end,
      fn -> Workouts.add_schedule_for_client(client_ctx, f.client.id, %{}) end,
      fn -> Workouts.update_schedule_for_client(client_ctx, f.client.id, id, %{}) end,
      fn -> Workouts.remove_schedule_for_client(client_ctx, f.client.id, id) end,
      fn -> Workouts.undo_for_client(client_ctx, f.client.id, "bad") end
    ]

    for operation <- operations, do: assert({:error, :not_found} = operation.())
  end
end
