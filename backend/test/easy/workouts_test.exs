defmodule Easy.WorkoutsTest do
  use Easy.DataCase, async: true
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
                targets: [%{"reps" => %{"mode" => "exact", "value" => 8}}],
                rest: [%{"mode" => "range", "min" => 60, "max" => 90}]
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

  test "every exercise read/write is scoped and built-ins are shared read-only", f do
    foreign = insert(:exercise)
    assert {:error, :not_found} = Workouts.get_exercise(f.ctx, foreign.id)
    assert {:error, :not_found} = Workouts.update_exercise(f.ctx, foreign.id, %{name: "No"})
    assert {:error, :not_found} = Workouts.delete_exercise(f.ctx, foreign.id)
    assert {:error, :not_found} = Workouts.copy_exercise(f.ctx, foreign.id)
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
    assert new.metrics == ["duration"]

    assert {:ok, edited} =
             Workouts.update_exercise(f.ctx, new.id, %{
               kind: "activity",
               metrics: ["distance", "duration"],
               unilateral: true
             })

    assert edited.unilateral and edited.metrics == ["distance", "duration"]
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
      ~w(reps weight duration distance elevation_gain height calories speed incline level power cadence heart_rate effort reserve successes attempts score result grade tempo)

    assert {:ok, exercise} =
             Workouts.create_exercise(f.ctx, %{
               name: "All",
               kind: "sport",
               goals: ["skill"],
               places: ["court/field"],
               metrics: metrics,
               grade_scale: ["V0", "V1"]
             })

    assert exercise.metrics == metrics

    for patch <- [
          %{goals: []},
          %{goals: ["unknown"]},
          %{places: ["court_field"]},
          %{metrics: ["custom"]},
          %{metrics: ["reps", "reps"]},
          %{metrics: ["grade"], grade_scale: []},
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
    {:ok, %{data: foreign}} = Workouts.create_workout_for_client(foreign_ctx, foreign_client.id, %{name: "Foreign"})

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

  test "catalogue edits never rewrite exercise names metrics or sides in prescriptions", f do
    row = client_workout(f)
    past(f, row)

    assert {:ok, _} =
             Workouts.update_exercise(f.ctx, f.exercise.id, %{
               name: "New movement",
               metrics: ["duration"],
               unilateral: true
             })

    assert {:ok, %{data: copy}} =
             Workouts.update_workout_for_client(f.ctx, f.client.id, row.id, %{name: "New instructions"})

    for id <- [row.id, copy.id] do
      {:ok, saved} = Workouts.get_workout_for_client(f.ctx, f.client.id, id)
      item = hd(hd(saved.groups).exercises)
      assert item.exercise_snapshot["name"] == f.exercise.name
      assert item.exercise_snapshot["metrics"] == ["reps", "weight"]
      refute item.exercise_snapshot["unilateral"]
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
    valid = [%{"reps" => %{"mode" => "exact", "value" => 5}}, %{"weight" => %{"mode" => "exact", "value" => -10}}, %{}]

    group = %{
      rounds: 3,
      exercises: [
        %{
          exercise_id: f.exercise.id,
          targets_mode: "per_round",
          targets: valid,
          rest: [nil, %{"mode" => "exact", "value" => 60}, nil]
        }
      ]
    }

    assert {:ok, row} = Workouts.create_workout(f.ctx, attrs(f, %{groups: [group]}))
    assert hd(hd(row.groups).exercises).targets == valid

    for target <- [
          %{"unknown" => %{"mode" => "exact", "value" => 5}},
          %{"reps" => %{"mode" => "exact", "value" => 1.5}},
          %{"weight" => %{"mode" => "percent", "value" => 75}},
          %{"reps" => %{"mode" => "range", "min" => 10, "max" => 5}}
        ] do
      invalid = put_in(group, [:exercises], [%{exercise_id: f.exercise.id, targets: [target]}])
      assert {:error, :invalid_prescription} = Workouts.create_workout(f.ctx, attrs(f, %{groups: [invalid]}))
    end

    assert {:error, :invalid_prescription} =
             Workouts.create_workout(f.ctx, attrs(f, %{groups: [%{rounds: 3, exercises: []}]}))

    assert {:ok, _} = Workouts.create_workout(f.ctx, %{name: "Empty draft", groups: []})
    assert {:error, %Ecto.Changeset{}} = Workouts.create_workout(f.ctx, %{name: "Video", type: "video"})

    assert {:error, %Ecto.Changeset{}} =
             Workouts.create_workout(f.ctx, %{name: "Open", type: "open", video: "https://example.com"})

    assert {:ok, _} = Workouts.create_workout(f.ctx, %{name: "Video", type: "video", video: "https://example.com"})
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

  test "moving an existing exercise between cards retains its frozen catalogue values", f do
    second = insert(:exercise, business: f.client.business)

    groups = [
      %{rounds: 3, exercises: [%{exercise_id: f.exercise.id}]},
      %{rounds: 3, exercises: [%{exercise_id: second.id}]}
    ]

    {:ok, row} = Workouts.create_workout(f.ctx, attrs(f, %{groups: groups}))

    {:ok, _} =
      Workouts.update_exercise(f.ctx, f.exercise.id, %{
        name: "Changed catalogue",
        metrics: ["duration"],
        unilateral: true
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
            Map.take(other, [:id, :exercise_id, :targets_mode, :targets, :rest]),
            Map.take(item, [:id, :exercise_id, :targets_mode, :targets, :rest])
          ]
        }
      ]
    }

    assert {:ok, saved} = Workouts.update_workout(f.ctx, row.id, body)
    moved = List.last(hd(saved.groups).exercises)
    assert moved.id == item.id
    assert moved.exercise_snapshot["name"] == f.exercise.name
    assert moved.exercise_snapshot["metrics"] == ["reps", "weight"]
    refute moved.exercise_snapshot["unilateral"]
  end

  test "group and exercise order follows the saved arrays after a reorder", f do
    second = insert(:exercise, business: f.client.business)

    groups = [
      %{name: "Second", rounds: 2, exercises: [%{exercise_id: second.id}, %{exercise_id: f.exercise.id}]},
      %{name: "First", rounds: 3, exercises: [%{exercise_id: f.exercise.id}]}
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
