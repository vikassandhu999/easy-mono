defmodule Easy.WorkoutSchemaTest do
  use Easy.SchemaCase

  alias Easy.Workouts.{
    Content,
    CountTarget,
    Exercise,
    ExerciseGroup,
    ExerciseMetric,
    NumericTarget,
    RestTarget,
    ResultTarget,
    RoundTargets,
    TextTarget,
    Workout,
    WorkoutExercise,
    WorkoutExerciseReference,
    WorkoutSchedule
  }

  setup do
    business_id = Ecto.UUID.generate()
    exercise = build(:exercise, id: Ecto.UUID.generate(), business_id: business_id)

    %{
      business_id: business_id,
      client_id: Ecto.UUID.generate(),
      exercise: exercise,
      lookup: %{exercise.id => exercise}
    }
  end

  describe "typed targets" do
    test "numeric modes require exactly their own fields" do
      for attrs <- [
            %{},
            %{mode: "client_chooses"},
            %{mode: "max"},
            %{mode: "exact", value: "1.25"},
            %{mode: "range", min: "1.25", max: "1.25"}
          ] do
        assert NumericTarget.changeset(%NumericTarget{}, attrs, :duration).valid?
      end

      for {attrs, field} <- [
            {%{mode: nil}, :mode},
            {%{mode: "percent", value: 75}, :mode},
            {%{mode: "exact"}, :value},
            {%{mode: "exact", value: 1, min: 0}, :min},
            {%{mode: "range", min: 1}, :max},
            {%{mode: "range", min: 1, max: 2, value: 1}, :value},
            {%{mode: "range", min: 2, max: 1}, :max},
            {%{mode: "client_chooses", value: 0}, :value},
            {%{mode: "max", max: 10}, :max}
          ] do
        assert_invalid(NumericTarget.changeset(%NumericTarget{}, attrs, :duration), field)
      end

      target = saved(NumericTarget.changeset(%NumericTarget{}, %{mode: "exact", value: "1.25"}, :duration))
      assert {target.mode, target.value} == {:exact, Decimal.new("1.25")}
    end

    test "counts are whole nonnegative values and level starts at one" do
      for metric <- [:reps, :cadence, :heart_rate, :successes, :attempts] do
        assert saved(CountTarget.changeset(%CountTarget{}, %{mode: "exact", value: 0}, metric)).value == 0
        assert_invalid(CountTarget.changeset(%CountTarget{}, %{mode: "exact", value: -1}, metric), :value)
        assert_invalid(CountTarget.changeset(%CountTarget{}, %{mode: "exact", value: "2.5"}, metric), :value)
      end

      assert saved(CountTarget.changeset(%CountTarget{}, %{mode: "exact", value: 1}, :level)).value == 1
      assert_invalid(CountTarget.changeset(%CountTarget{}, %{mode: "range", min: 0, max: 2}, :level), :min)
    end

    test "numeric bounds follow the containing metric" do
      for metric <- [:duration, :distance, :elevation_gain, :height, :calories, :speed, :power] do
        target = saved(NumericTarget.changeset(%NumericTarget{}, %{mode: "exact", value: 0}, metric))
        assert target.value == Decimal.new(0)
        assert_invalid(NumericTarget.changeset(%NumericTarget{}, %{mode: "range", min: -1, max: 1}, metric), :min)
      end

      for metric <- [:weight, :incline, :score] do
        target = saved(NumericTarget.changeset(%NumericTarget{}, %{mode: "exact", value: "-2.5"}, metric))
        assert target.value == Decimal.new("-2.5")
      end

      for {metric, minimum} <- [effort: 1, reserve: 0] do
        assert NumericTarget.changeset(%NumericTarget{}, %{mode: "range", min: minimum, max: 10}, metric).valid?
        assert_invalid(NumericTarget.changeset(%NumericTarget{}, %{mode: "exact", value: minimum - 1}, metric), :value)
        assert_invalid(NumericTarget.changeset(%NumericTarget{}, %{mode: "range", min: minimum, max: 11}, metric), :max)
      end
    end

    test "nonnumeric and nonfinite target strings fail casts" do
      for value <- ["many", "NaN", "Infinity", "-Infinity"] do
        assert_invalid(NumericTarget.changeset(%NumericTarget{}, %{mode: "exact", value: value}, :duration), :value)
      end
    end

    test "partial changes validate retained bounds and mode changes require clearing" do
      target = saved(CountTarget.changeset(%CountTarget{}, %{mode: "range", min: 8, max: 12}, :reps))
      assert_invalid(CountTarget.changeset(target, %{min: 13}, :reps), :max)
      assert_invalid(CountTarget.changeset(target, %{mode: "max"}, :reps), :min)

      changed = saved(CountTarget.changeset(target, %{mode: "max", min: nil, max: nil}, :reps))
      assert {changed.mode, changed.min, changed.max} == {:max, nil, nil}

      invalid_retained = %NumericTarget{mode: :exact, value: Decimal.new(-1)}
      assert_invalid(NumericTarget.changeset(invalid_retained, %{}, :duration), :value)
    end

    test "rest distinguishes client choice, no rest, and fractional seconds" do
      assert saved(RestTarget.changeset(%RestTarget{}, %{})).mode == :client_chooses
      assert saved(RestTarget.changeset(%RestTarget{}, %{mode: "none"})).mode == :none
      target = saved(RestTarget.changeset(%RestTarget{}, %{mode: "exact", value_s: "1.5"}))
      assert target.value_s == Decimal.new("1.5")

      for {attrs, field} <- [
            {%{mode: "none", value_s: 0}, :value_s},
            {%{mode: "client_chooses", min_s: 0}, :min_s},
            {%{mode: "exact", value_s: -1}, :value_s},
            {%{mode: "range", min_s: 20, max_s: 10}, :max_s},
            {%{mode: "max"}, :mode},
            {%{mode: nil}, :mode}
          ] do
        assert_invalid(RestTarget.changeset(%RestTarget{}, attrs), field)
      end
    end

    test "text and result targets have exact and client-choice modes only" do
      text = saved(TextTarget.changeset(%TextTarget{}, %{mode: "exact", value: " 3-1-1-0 "}))
      assert text.value == "3-1-1-0"
      assert_invalid(TextTarget.changeset(%TextTarget{}, %{mode: "exact", value: "  "}), :value)
      assert_invalid(TextTarget.changeset(text, %{mode: "client_chooses"}), :value)
      assert saved(TextTarget.changeset(text, %{mode: "client_chooses", value: nil})).value == nil

      for value <- ["win", "draw", "loss"] do
        assert ResultTarget.changeset(%ResultTarget{}, %{mode: "exact", value: value}).valid?
      end

      assert saved(ResultTarget.changeset(%ResultTarget{}, %{mode: "exact", value: "win"})).value == :win
      assert_invalid(ResultTarget.changeset(%ResultTarget{}, %{mode: "exact", value: "maybe"}), :value)
      assert_invalid(ResultTarget.changeset(%ResultTarget{}, %{mode: "exact"}), :value)
      assert_invalid(ResultTarget.changeset(%ResultTarget{}, %{value: "win"}), :value)

      for mode <- ["max", "range"] do
        assert_invalid(TextTarget.changeset(%TextTarget{}, %{mode: mode}), :mode)
        assert_invalid(ResultTarget.changeset(%ResultTarget{}, %{mode: mode}), :mode)
      end
    end
  end

  describe "round targets" do
    test "selected metrics are optional and rest does not need selected metrics", f do
      round = saved(RoundTargets.changeset(%RoundTargets{}, %{}, %{f.exercise | metrics: []}))
      assert {round.reps, round.weight, round.rest.mode} == {nil, nil, :client_chooses}

      round = saved(RoundTargets.changeset(%RoundTargets{}, %{rest: %{mode: "none"}}, %{f.exercise | metrics: []}))
      assert round.rest.mode == :none
    end

    test "nested targets receive their metric type and selection", f do
      round = saved(RoundTargets.changeset(%RoundTargets{}, %{reps: %{mode: "exact", value: 5}}, f.exercise))
      assert {round.reps.mode, round.reps.value} == {:exact, 5}
      cs = RoundTargets.changeset(%RoundTargets{}, %{reps: %{mode: "exact", value: "2.5"}}, f.exercise)
      assert errors_on(cs).reps[:value]
      assert_invalid(RoundTargets.changeset(%RoundTargets{}, %{duration: %{mode: "exact", value: 5}}, f.exercise), :duration)
      assert_invalid(RoundTargets.changeset(%RoundTargets{}, %{grade: %{mode: "exact", value: "V5"}}, f.exercise), :grade)
    end

    test "unknown keys and nonobject target values are rejected", f do
      assert_invalid(RoundTargets.changeset(%RoundTargets{}, %{unknown: %{}}, f.exercise), :base)

      for value <- [5, "10", [], [%{}]] do
        assert_invalid(RoundTargets.changeset(%RoundTargets{}, %{reps: value}, f.exercise), :reps)
      end
    end

    test "omitted targets and rest survive while explicit null clears them", f do
      attrs = %{reps: %{mode: "exact", value: 8}, rest: %{mode: "none"}}
      round = saved(RoundTargets.changeset(%RoundTargets{}, attrs, f.exercise))
      retained = saved(RoundTargets.changeset(round, %{}, f.exercise))
      assert {retained.reps.value, retained.rest.mode} == {8, :none}

      cleared = saved(RoundTargets.changeset(round, %{reps: nil, rest: nil}, f.exercise))
      assert {cleared.reps, cleared.rest.mode, cleared.rest.value_s} == {nil, :client_chooses, nil}
      assert_invalid(RoundTargets.changeset(round, %{}, %{f.exercise | metrics: []}), :reps)
      invalid_retained = %{round | reps: %{round.reps | value: -1}}
      assert errors_on(RoundTargets.changeset(invalid_retained, %{}, f.exercise)).reps[:value]
    end
  end

  describe "workout exercises and groups" do
    test "target counts follow mode and rounds, including per-side rounds", f do
      attrs = %{exercise_id: f.exercise.id, side_mode: "per_side", targets_mode: "per_round", targets: [%{}, %{}, %{}]}
      item = saved(WorkoutExercise.changeset(%WorkoutExercise{}, attrs, f.exercise, 3))
      assert {item.side_mode, item.targets_mode, length(item.targets)} == {:per_side, :per_round, 3}

      for count <- [0, 1, 6] do
        changed = %{attrs | targets: List.duplicate(%{}, count)}
        cs = WorkoutExercise.changeset(%WorkoutExercise{}, changed, f.exercise, 3)
        assert_invalid(cs, :targets)
      end

      assert_invalid(WorkoutExercise.changeset(item, %{targets_mode: "same_for_all"}, f.exercise, 3), :targets)
      shared = saved(WorkoutExercise.changeset(item, %{targets_mode: "same_for_all", targets: [%{}]}, f.exercise, 3))
      assert {shared.targets_mode, length(shared.targets)} == {:same_for_all, 1}
    end

    test "references, modes, and array element shapes must be valid", f do
      attrs = %{exercise_id: f.exercise.id, targets: [%{}]}
      item = saved(WorkoutExercise.changeset(%WorkoutExercise{}, attrs, f.exercise, 3))
      assert {item.exercise_id, item.side_mode, item.targets_mode} == {f.exercise.id, :combined, :same_for_all}
      assert_invalid(WorkoutExercise.changeset(item, %{exercise_id: Ecto.UUID.generate()}, f.exercise, 3), :exercise_id)

      invalid_values = [
        side_mode: nil,
        side_mode: "both",
        targets_mode: nil,
        targets_mode: "other",
        targets: nil,
        targets: %{},
        targets: [nil],
        targets: [1]
      ]

      for {key, value} <- invalid_values do
        assert_invalid(WorkoutExercise.changeset(item, %{key => value}, f.exercise, 3), key)
      end
    end

    test "an omitted target list retains and revalidates nested values", f do
      attrs = %{exercise_id: f.exercise.id, targets: [%{reps: %{mode: "exact", value: 8}}]}
      item = saved(WorkoutExercise.changeset(%WorkoutExercise{}, attrs, f.exercise, 3))
      assert hd(saved(WorkoutExercise.changeset(item, %{}, f.exercise, 3)).targets).reps.value == 8
      refute WorkoutExercise.changeset(item, %{}, %{f.exercise | metrics: []}, 3).valid?
      assert_invalid(WorkoutExercise.changeset(item, %{}, f.exercise, 0), :targets)
    end

    test "group names normalize and rounds stay within one through one hundred", f do
      group = saved(ExerciseGroup.changeset(%ExerciseGroup{}, %{name: "  A  ", exercises: [entry_attrs(f)]}, f.lookup))
      assert {group.name, group.rounds, length(group.exercises)} == {"A", 3, 1}
      assert saved(ExerciseGroup.changeset(group, %{name: "  ", rounds: 1}, f.lookup)).name == nil
      assert saved(ExerciseGroup.changeset(group, %{rounds: 100}, f.lookup)).rounds == 100

      for rounds <- [nil, 0, 101, "2.5"] do
        assert_invalid(ExerciseGroup.changeset(group, %{rounds: rounds}, f.lookup), :rounds)
      end
    end

    test "groups require a nonempty object array and authorized definitions", f do
      for exercises <- [[], nil, %{}, [1]] do
        assert_invalid(ExerciseGroup.changeset(%ExerciseGroup{}, %{exercises: exercises}, f.lookup), :exercises)
      end

      cs = ExerciseGroup.changeset(%ExerciseGroup{}, %{exercises: [entry_attrs(f)]}, %{})
      assert hd(errors_on(cs).exercises)[:exercise_id]
    end

    test "reordering retains occurrence ids and repeated definitions are separate occurrences", f do
      first = %WorkoutExercise{id: Ecto.UUID.generate(), exercise_id: f.exercise.id, targets: [%RoundTargets{}]}
      second = %{first | id: Ecto.UUID.generate()}
      group = %ExerciseGroup{id: Ecto.UUID.generate(), exercises: [first, second]}
      attrs = %{id: Ecto.UUID.generate(), exercises: [%{id: second.id}, %{id: first.id}]}
      reordered = saved(ExerciseGroup.changeset(group, attrs, f.lookup))
      assert reordered.id == group.id
      assert Enum.map(reordered.exercises, & &1.id) == [second.id, first.id]
      assert Enum.map(reordered.exercises, & &1.exercise_id) == [f.exercise.id, f.exercise.id]

      for ids <- [[first.id, first.id], [first.id, String.upcase(first.id)], ["bad-id"]] do
        attrs = %{exercises: Enum.map(ids, &Map.put(entry_attrs(f), :id, &1))}
        assert_invalid(ExerciseGroup.changeset(group, attrs, f.lookup), :exercises)
      end
    end

    test "changing group rounds revalidates retained per-round targets", f do
      item = %WorkoutExercise{exercise_id: f.exercise.id, targets_mode: :per_round, targets: [%RoundTargets{}, %RoundTargets{}, %RoundTargets{}]}
      group = %ExerciseGroup{rounds: 3, exercises: [item]}
      assert saved(ExerciseGroup.changeset(group, %{}, f.lookup)).rounds == 3
      cs = ExerciseGroup.changeset(group, %{rounds: 2}, f.lookup)
      assert hd(errors_on(cs).exercises)[:targets]
    end
  end

  describe "workout structure" do
    test "content comparison ignores ids and numeric scale but keeps target values", f do
      entry = Map.put(entry_attrs(f), :targets, [%{weight: %{mode: "exact", value: "8"}}])
      original = saved(workout_changeset(f, %{groups: [%{exercises: [entry]}]}))
      changed_entry = Map.put(entry, :targets, [%{weight: %{mode: "exact", value: "8.0"}}])
      equivalent = saved(Workout.update_changeset(original, %{groups: [%{exercises: [changed_entry]}]}, f.lookup))
      [group] = equivalent.groups
      [item] = group.exercises
      changed_item = %{item | id: Ecto.UUID.generate()}
      changed_group = %{group | id: Ecto.UUID.generate(), exercises: [changed_item]}
      equivalent = %{equivalent | groups: [changed_group]}
      assert Content.same?(original, equivalent)

      different_entry = Map.put(entry, :targets, [%{weight: %{mode: "exact", value: "9"}}])
      different = saved(Workout.update_changeset(original, %{groups: [%{exercises: [different_entry]}]}, f.lookup))
      refute Content.same?(original, different)
    end

    test "copy input drops group and occurrence ids while keeping content", f do
      group_id = Ecto.UUID.generate()
      entry_id = Ecto.UUID.generate()
      attrs = %{name: "Copy", groups: [%{id: group_id, rounds: 3, exercises: [Map.put(entry_attrs(f), :id, entry_id)]}]}

      assert Content.fresh_ids(attrs) == %{
               name: "Copy",
               groups: [%{rounds: 3, exercises: [%{exercise_id: f.exercise.id, targets: [%{}]}]}]
             }

      assert Content.fresh_ids(%{"groups" => [%{"id" => group_id, "exercises" => [%{"id" => entry_id, "exercise_id" => f.exercise.id}]}]}) ==
               %{"groups" => [%{"exercises" => [%{"exercise_id" => f.exercise.id}]}]}
    end

    test "trusted ownership, root id, and archive state cannot be edited", f do
      attrs = %{
        name: "  Own  ",
        description: "  Instructions  ",
        business_id: Ecto.UUID.generate(),
        client_id: Ecto.UUID.generate(),
        archived_at: DateTime.utc_now()
      }

      row = saved(Workout.insert_changeset(f.business_id, f.client_id, attrs, f.lookup))
      assert {row.business_id, row.client_id, row.name, row.description, row.type, row.archived_at} == {f.business_id, f.client_id, "Own", "Instructions", :prescribed, nil}

      original = %{row | id: Ecto.UUID.generate()}
      updated = saved(Workout.update_changeset(original, Map.put(attrs, :id, Ecto.UUID.generate()), f.lookup))
      assert {updated.id, updated.business_id, updated.client_id} == {original.id, f.business_id, f.client_id}

      exercise_cs = Exercise.insert_changeset(f.business_id, %{name: "Own", kind: "movement", business_id: Ecto.UUID.generate()})
      assert get_field(exercise_cs, :business_id) == f.business_id
    end

    test "metadata is required and references must be UUIDs", f do
      assert_invalid(workout_changeset(f, %{name: "  "}), :name)
      assert_invalid(workout_changeset(f, %{name: String.duplicate("a", 201)}), :name)
      assert_invalid(workout_changeset(f, %{type: nil}), :type)
      assert_invalid(Workout.insert_changeset("invalid", f.client_id, %{name: "Own"}, f.lookup), :business_id)
      assert_invalid(Workout.insert_changeset(f.business_id, "invalid", %{name: "Own"}, f.lookup), :client_id)
      assert saved(workout_changeset(f, %{description: "  "})).description == nil
    end

    test "empty prescribed content can save but cannot be scheduled", f do
      cs = workout_changeset(f, %{})
      assert saved(cs).groups == []
      assert_invalid(Workout.validate_content_for_schedule(cs), :groups)
      assert Workout.validate_content_for_schedule(workout_changeset(f, %{groups: [group_attrs(f)]})).valid?
      assert_invalid(workout_changeset(f, %{groups: [%{exercises: []}]}), :groups)
    end

    test "video and open types require compatible content without discarding it", f do
      video_id = Ecto.UUID.generate()
      assert saved(workout_changeset(f, %{type: "video", video_id: video_id})).video_id == video_id
      assert saved(workout_changeset(f, %{type: "open"})).type == :open
      assert_invalid(workout_changeset(f, %{type: "video"}), :video_id)
      assert_invalid(workout_changeset(f, %{video_id: video_id}), :video_id)
      assert_invalid(workout_changeset(f, %{type: "open", video_id: video_id}), :video_id)

      for type <- ["open", "video"] do
        attrs = %{type: type, video_id: if(type == "video", do: video_id), groups: [group_attrs(f)]}
        assert_invalid(workout_changeset(f, attrs), :groups)
      end

      row = saved(workout_changeset(f, %{type: "video", video_id: video_id}))
      assert_invalid(Workout.update_changeset(row, %{type: "open"}, f.lookup), :video_id)
      assert saved(Workout.update_changeset(row, %{type: "open", video_id: nil}, f.lookup)).type == :open
    end

    test "workout restricts exercise lookup to its business and built-ins", f do
      foreign = %{f.exercise | business_id: Ecto.UUID.generate()}
      attrs = %{name: "Own", groups: [group_attrs(f)]}
      cs = Workout.insert_changeset(f.business_id, f.client_id, attrs, %{foreign.id => foreign})
      assert hd(hd(errors_on(cs).groups).exercises)[:exercise_id]

      builtin = %{f.exercise | business_id: nil}
      assert Workout.insert_changeset(f.business_id, f.client_id, attrs, %{builtin.id => builtin}).valid?
    end

    test "group and occurrence ids are valid and globally unique", f do
      group_id = Ecto.UUID.generate()
      entry_id = Ecto.UUID.generate()
      group = Map.put(group_attrs(f), :id, group_id)

      for groups <- [
            [group, group],
            [group, %{group | id: String.upcase(group_id)}],
            [Map.put(group, :id, "bad-id")],
            [%{exercises: [Map.put(entry_attrs(f), :id, entry_id)]}, %{exercises: [Map.put(entry_attrs(f), :id, entry_id)]}]
          ] do
        assert_invalid(workout_changeset(f, %{groups: groups}), :groups)
      end

      for groups <- [nil, %{}, [1]] do
        assert_invalid(workout_changeset(f, %{groups: groups}), :groups)
      end
    end

    test "moving an entry preserves id and targets and checks destination rounds", f do
      targets = [%RoundTargets{reps: %CountTarget{mode: :exact, value: 5}}, %RoundTargets{}]

      entry = %WorkoutExercise{
        id: Ecto.UUID.generate(),
        exercise_id: f.exercise.id,
        targets_mode: :per_round,
        targets: targets
      }

      source = %ExerciseGroup{id: Ecto.UUID.generate(), rounds: 2, exercises: [entry]}
      other_entry = %{entry | id: Ecto.UUID.generate()}
      destination = %ExerciseGroup{id: Ecto.UUID.generate(), rounds: 2, exercises: [other_entry]}
      workout = %Workout{business_id: f.business_id, name: "Own", groups: [source, destination]}
      attrs = %{groups: [%{id: destination.id, exercises: [%{id: entry.id}, %{id: hd(destination.exercises).id}]}]}
      moved = saved(Workout.update_changeset(workout, attrs, f.lookup))
      [group] = moved.groups
      assert group.id == destination.id
      assert hd(group.exercises).id == entry.id
      assert hd(hd(group.exercises).targets).reps.value == 5

      invalid_destination = %{groups: [%{id: destination.id, rounds: 3, exercises: [%{id: entry.id}]}]}
      refute Workout.update_changeset(workout, invalid_destination, f.lookup).valid?
      retained_twice = %{groups: [%{id: source.id}, %{id: destination.id, exercises: [%{id: entry.id}]}]}
      assert_invalid(Workout.update_changeset(workout, retained_twice, f.lookup), :groups)
    end

    test "omitted groups retain and revalidate their nested targets", f do
      row = saved(workout_changeset(f, %{groups: [group_attrs(f)]}))
      retained = saved(Workout.update_changeset(row, %{description: "New"}, f.lookup))
      assert retained.groups == row.groups
      assert retained.description == "New"
      refute Workout.update_changeset(row, %{}, %{}).valid?
    end
  end

  describe "schedule validation" do
    test "creation defaults to client-local today and preserves a chosen start", f do
      today = Date.utc_today()
      future = Date.add(today, 7)
      assert saved(schedule_changeset(f, %{weekdays_mask: 127}, today)).from_date == today
      assert saved(schedule_changeset(f, %{weekdays_mask: 127, from_date: future}, today)).from_date == future
      assert_invalid(schedule_changeset(f, %{weekdays_mask: 127, from_date: nil}, today), :from_date)
    end

    test "identity and ownership fields cannot be changed by editable input", f do
      today = Date.utc_today()
      workout_id = Ecto.UUID.generate()

      attrs = %{
        weekdays_mask: 127,
        business_id: Ecto.UUID.generate(),
        client_id: Ecto.UUID.generate(),
        workout_id: Ecto.UUID.generate()
      }

      row = saved(WorkoutSchedule.insert_changeset(f.business_id, f.client_id, workout_id, attrs, today))
      assert {row.business_id, row.client_id, row.workout_id} == {f.business_id, f.client_id, workout_id}
      row = %{row | id: Ecto.UUID.generate()}
      updated = saved(WorkoutSchedule.update_changeset(row, Map.put(attrs, :id, Ecto.UUID.generate())))
      assert {updated.id, updated.business_id, updated.client_id, updated.workout_id} == {row.id, f.business_id, f.client_id, workout_id}
    end

    test "all seven single-day windows require their selected weekday", f do
      today = Date.utc_today()

      for offset <- 0..6 do
        day = Date.add(today, offset)
        mask = Integer.pow(2, Date.day_of_week(day) - 1)
        row = saved(schedule_changeset(f, %{weekdays_mask: mask, from_date: day, until_date: day}, today))
        assert {row.from_date, row.until_date, row.weekdays_mask} == {day, day, mask}
        other_mask = if mask == 64, do: 1, else: mask * 2
        invalid_window = %{weekdays_mask: other_mask, from_date: day, until_date: day}
        assert_invalid(schedule_changeset(f, invalid_window, today), :weekdays_mask)
      end
    end

    test "weekday masks and complete date windows are validated on partial updates", f do
      today = Date.utc_today()
      row = saved(schedule_changeset(f, %{weekdays_mask: 127, until_date: Date.add(today, 6)}, today))

      for mask <- [nil, 0, 128, -1, "1.5"] do
        assert_invalid(WorkoutSchedule.update_changeset(row, %{weekdays_mask: mask}), :weekdays_mask)
      end

      assert_invalid(WorkoutSchedule.update_changeset(row, %{until_date: Date.add(today, -1)}), :until_date)
      assert_invalid(WorkoutSchedule.update_changeset(row, %{from_date: Date.add(today, 7)}), :until_date)
      assert saved(WorkoutSchedule.update_changeset(row, %{until_date: nil})).until_date == nil

      for mask <- [1, 2, 4, 8, 16, 32, 64] do
        assert schedule_changeset(f, %{weekdays_mask: mask, until_date: Date.add(today, 30_000)}, today).valid?
      end
    end

    test "location text normalizes and switching requires an explicit clear", f do
      today = Date.utc_today()
      row = saved(schedule_changeset(f, %{weekdays_mask: 127, place: "  Gym  "}, today))
      assert row.place == "Gym"
      assert_invalid(WorkoutSchedule.update_changeset(row, %{meeting_url: "https://example.com/meet"}), :meeting_url)
      remote = saved(WorkoutSchedule.update_changeset(row, %{place: nil, meeting_url: "  https://example.com/meet  "}))
      assert {remote.place, remote.meeting_url} == {nil, "https://example.com/meet"}
      cleared = saved(WorkoutSchedule.update_changeset(remote, %{place: "  ", meeting_url: "  "}))
      assert {cleared.place, cleared.meeting_url} == {nil, nil}
    end

    test "meeting links require HTTP or HTTPS and a host", f do
      today = Date.utc_today()

      for url <- ["example.com/meet", "/meet", "ftp://example.com", "https://", "https://bad host"] do
        assert_invalid(schedule_changeset(f, %{weekdays_mask: 127, meeting_url: url}, today), :meeting_url)
      end

      for url <- ["http://example.com/meet", "https://example.com/meet?room=1"] do
        assert saved(schedule_changeset(f, %{weekdays_mask: 127, meeting_url: url}, today)).meeting_url == url
      end
    end

    test "midnight is distinct from no time and optional fields can be cleared", f do
      today = Date.utc_today()
      attrs = %{weekdays_mask: 127, time: "00:00:00", coach_id: Ecto.UUID.generate()}
      row = saved(schedule_changeset(f, attrs, today))
      assert row.time == ~T[00:00:00]
      retained = saved(WorkoutSchedule.update_changeset(row, %{}))
      assert {retained.from_date, retained.time, retained.coach_id} == {today, ~T[00:00:00], row.coach_id}
      cleared = saved(WorkoutSchedule.update_changeset(row, %{time: nil, coach_id: nil}))
      assert {cleared.time, cleared.coach_id} == {nil, nil}
      assert_invalid(WorkoutSchedule.update_changeset(row, %{time: "25:00"}), :time)
      assert_invalid(WorkoutSchedule.update_changeset(row, %{coach_id: "invalid"}), :coach_id)
    end
  end

  describe "database ownership and membership constraints" do
    setup do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, coach: coach)
      exercise = insert(:exercise, business: coach.business)
      workout = Repo.insert!(Workout.insert_changeset(coach.business_id, client.id, %{name: "Own"}, %{}))
      %{coach: coach, client: client, exercise: exercise, workout: workout}
    end

    test "database rejects a cross-tenant client workout", f do
      foreign = insert(:client)
      assert {:error, cs} = Repo.insert(Workout.insert_changeset(f.coach.business_id, foreign.id, %{name: "No"}, %{}))
      assert errors_on(cs)[:client_id]
    end

    test "database name checks return a name changeset error", f do
      changeset = Workout.update_changeset(f.workout, %{}, %{}) |> put_change(:name, "   ")
      assert changeset.valid?
      assert {:error, rejected} = Repo.update(changeset, mode: :savepoint)
      assert {_, metadata} = rejected.errors[:name]
      assert metadata[:constraint_name] == "workouts_name_check"
      assert Repo.get!(Workout, f.workout.id).name == "Own"
    end

    test "membership rejects a workout from another tenant", f do
      foreign = insert(:business)

      assert_raise Ecto.ConstraintError, fn ->
        Repo.insert!(%WorkoutExerciseReference{business_id: foreign.id, workout_id: f.workout.id, exercise_id: f.exercise.id})
      end
    end

    test "membership rejects an exercise from another tenant", f do
      foreign = insert(:exercise)

      assert_raise Ecto.ConstraintError, fn ->
        Repo.insert!(%WorkoutExerciseReference{business_id: f.coach.business_id, workout_id: f.workout.id, exercise_id: foreign.id})
      end
    end

    test "membership permits built-ins and permits each exercise only once per workout", f do
      builtin = insert(:exercise, business: nil, business_id: nil)
      reference = %WorkoutExerciseReference{business_id: f.coach.business_id, workout_id: f.workout.id, exercise_id: builtin.id}
      assert Repo.insert!(reference).exercise_id == builtin.id
      assert_raise Ecto.ConstraintError, fn -> Repo.insert!(reference) end
    end

    test "membership prevents deleting a referenced exercise", f do
      Repo.insert!(%WorkoutExerciseReference{business_id: f.coach.business_id, workout_id: f.workout.id, exercise_id: f.exercise.id})
      assert_raise Ecto.ConstraintError, fn -> Repo.delete!(f.exercise) end
    end

    test "copied workout input receives fresh group and occurrence ids", f do
      lookup = %{f.exercise.id => f.exercise}
      groups = [%{rounds: 3, exercises: [%{exercise_id: f.exercise.id, targets: [%{}]}]}]
      original = Repo.insert!(Workout.insert_changeset(f.coach.business_id, f.client.id, %{name: "Original", groups: groups}, lookup))
      [group] = original.groups
      [item] = group.exercises
      copied_groups = [%{id: group.id, rounds: 3, exercises: [%{id: item.id, exercise_id: f.exercise.id, targets: [%{}]}]}]
      copy = Repo.insert!(Workout.insert_changeset(f.coach.business_id, f.client.id, %{name: "Copy", groups: copied_groups}, lookup))
      [copied_group] = copy.groups
      [copied_item] = copied_group.exercises
      assert copied_group.id != group.id
      assert copied_item.id != item.id
      assert {copied_item.exercise_id, copied_group.rounds} == {f.exercise.id, 3}
      assert Ecto.UUID.cast(copied_group.id) == {:ok, copied_group.id}
      assert Ecto.UUID.cast(copied_item.id) == {:ok, copied_item.id}
    end

    test "database rejects duplicate metric selections", f do
      duplicate = [%ExerciseMetric{key: :reps}, %ExerciseMetric{key: :reps}]

      assert_raise Ecto.ConstraintError, fn ->
        f.exercise |> change() |> put_embed(:metrics, duplicate) |> Repo.update!()
      end
    end

    test "database rejects null taxonomy tags", f do
      assert_raise Ecto.ConstraintError, fn -> Repo.update!(change(f.exercise, goals: [nil])) end
    end

    test "database rejects incompatible workout content", f do
      assert_raise Ecto.ConstraintError, fn -> Repo.update!(change(f.workout, type: :video)) end
    end

    test "schedule workout and coach foreign keys carry tenant and client", f do
      foreign = insert(:client)
      attrs = %{weekdays_mask: 127}
      today = Date.utc_today()

      cs = WorkoutSchedule.insert_changeset(f.coach.business_id, foreign.id, f.workout.id, attrs, today)
      assert {:error, cs} = Repo.insert(cs, mode: :savepoint)
      assert errors_on(cs)[:client_id]

      cs = WorkoutSchedule.insert_changeset(f.coach.business_id, f.client.id, f.workout.id, Map.put(attrs, :coach_id, foreign.coach_id), today)
      assert {:error, cs} = Repo.insert(cs, mode: :savepoint)
      assert errors_on(cs)[:coach_id]

      other_client = insert(:client, business: f.coach.business, coach: f.coach)
      cs = WorkoutSchedule.insert_changeset(f.coach.business_id, other_client.id, f.workout.id, attrs, today)
      assert {:error, cs} = Repo.insert(cs, mode: :savepoint)
      assert errors_on(cs)[:workout_id]
    end

    test "database checks the schedule weekday window and meeting URL", f do
      today = Date.utc_today()
      cs = WorkoutSchedule.insert_changeset(f.coach.business_id, f.client.id, f.workout.id, %{weekdays_mask: 127}, today)
      schedule = Repo.insert!(cs)
      unselected_mask = if Date.day_of_week(today) == 1, do: 2, else: 1

      assert_raise Ecto.ConstraintError, fn ->
        Repo.update!(change(schedule, weekdays_mask: unselected_mask, until_date: today), mode: :savepoint)
      end

      assert_raise Ecto.ConstraintError, fn ->
        Repo.update!(change(schedule, meeting_url: "ftp://example.com"), mode: :savepoint)
      end
    end
  end

  defp entry_attrs(f), do: %{exercise_id: f.exercise.id, targets: [%{}]}
  defp group_attrs(f), do: %{rounds: 3, exercises: [entry_attrs(f)]}

  defp workout_changeset(f, attrs) do
    Workout.insert_changeset(f.business_id, f.client_id, Map.merge(%{name: "Own"}, attrs), f.lookup)
  end

  defp schedule_changeset(f, attrs, today) do
    WorkoutSchedule.insert_changeset(f.business_id, f.client_id, Ecto.UUID.generate(), attrs, today)
  end

  defp saved(changeset) do
    assert {:ok, row} = apply_action(changeset, :insert)
    row
  end

  defp assert_invalid(changeset, field) do
    refute changeset.valid?
    assert errors_on(changeset)[field]
  end
end
