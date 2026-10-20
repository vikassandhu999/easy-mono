defmodule Easy.Workouts.MeasurementsTest do
  use ExUnit.Case, async: true

  alias Easy.Workouts.{Exercise, ExerciseLog, ExerciseMetric, ExerciseSet}
  alias Ecto.Changeset

  defp exercise(keys) do
    %Exercise{metrics: Enum.map(keys, &%ExerciseMetric{key: &1})}
  end

  defp save(row, attrs, keys) do
    row.__struct__.measurements_changeset(row, attrs, exercise(keys))
    |> Changeset.apply_action(:update)
  end

  defp saved(row, attrs, keys) do
    assert {:ok, result} = save(row, attrs, keys)
    result
  end

  defp invalid(row, attrs, keys, field) do
    assert {:error, changeset} = save(row, attrs, keys)
    errors = Changeset.traverse_errors(changeset, fn {message, _} -> message end)
    assert Map.has_key?(errors, field)
  end

  test "a run stores a reported overall result independently of incomplete interval detail" do
    first =
      saved(%ExerciseSet{}, %{distance_m: "1000", duration_s: "360.25"}, [:distance, :duration])

    log =
      saved(%ExerciseLog{sets: [first]}, %{distance_m: "5000", duration_s: "1800.5"}, [
        :distance,
        :duration
      ])

    assert log.distance_m == Decimal.new("5000")
    assert log.duration_s == Decimal.new("1800.5")
    assert hd(log.sets).duration_s == Decimal.new("360.25")
    assert length(log.sets) == 1
  end

  test "summary-only strength does not invent sets or a load" do
    log = saved(%ExerciseLog{sets: []}, %{reps: 30}, [:reps, :weight])
    assert {log.reps, log.weight_kg, log.sets} == {30, nil, []}
  end

  test "different set loads stay separate without filling the overall result" do
    first = saved(%ExerciseSet{}, %{reps: 10, weight_kg: "40"}, [:reps, :weight])
    second = saved(%ExerciseSet{}, %{reps: 5, weight_kg: "60"}, [:reps, :weight])
    log = saved(%ExerciseLog{sets: [first, second]}, %{}, [:reps, :weight])
    assert {log.reps, log.weight_kg} == {nil, nil}

    assert Enum.map(log.sets, &{&1.reps, &1.weight_kg}) == [
             {10, Decimal.new("40")},
             {5, Decimal.new("60")}
           ]
  end

  test "a detail total above the reported run distance does not block or rewrite saving" do
    detail = saved(%ExerciseSet{}, %{distance_m: "6000"}, [:distance])
    log = saved(%ExerciseLog{sets: [detail]}, %{distance_m: "5000"}, [:distance])
    assert log.distance_m == Decimal.new("5000")
    assert hd(log.sets).distance_m == Decimal.new("6000")
  end

  test "practice counts are optional individually but successes cannot exceed known attempts" do
    for row <- [%ExerciseLog{}, %ExerciseSet{}] do
      result = saved(row, %{successes: 7, attempts: 10}, [:successes, :attempts])
      assert {result.successes, result.attempts} == {7, 10}
      assert saved(row, %{successes: 7}, [:successes]).attempts == nil
      invalid(result, %{attempts: 6}, [:successes, :attempts], :successes)
      invalid(row, %{successes: -1}, [:successes], :successes)
      invalid(row, %{attempts: "1.5"}, [:attempts], :attempts)
    end
  end

  test "fractional averages have explicit meaning at both levels" do
    attrs = %{
      avg_speed_m_s: "3.5",
      avg_power_w: "150.25",
      avg_cadence_per_min: "85.5",
      avg_heart_rate_bpm: "140.5"
    }

    for row <- [%ExerciseLog{}, %ExerciseSet{}] do
      result = saved(row, attrs, [:speed, :power, :cadence, :heart_rate])

      assert {result.avg_speed_m_s, result.avg_power_w, result.avg_cadence_per_min, result.avg_heart_rate_bpm} ==
               {Decimal.new("3.5"), Decimal.new("150.25"), Decimal.new("85.5"), Decimal.new("140.5")}
    end
  end

  test "completed activities can have no measurements, including with no selected metrics" do
    log = saved(%ExerciseLog{state: :completed, sets: []}, %{}, [])

    assert {log.state, log.distance_m, log.duration_s, log.reps, log.effort, log.sets} ==
             {:completed, nil, nil, nil, nil, []}
  end

  test "zero is a supplied result and explicit nil clears only that measurement" do
    for row <- [%ExerciseLog{}, %ExerciseSet{}] do
      result = saved(row, %{distance_m: "0", duration_s: "12.45"}, [:distance, :duration])
      assert result.distance_m == Decimal.new("0")
      result = saved(result, %{distance_m: nil}, [:distance, :duration])
      assert {result.distance_m, result.duration_s} == {nil, Decimal.new("12.45")}
    end
  end

  test "negative amounts, fractional counts, and nonfinite measurements are rejected" do
    for row <- [%ExerciseLog{}, %ExerciseSet{}] do
      for {field, metric} <- [
            reps: :reps,
            duration_s: :duration,
            distance_m: :distance,
            elevation_gain_m: :elevation_gain,
            height_cm: :height,
            calories_kcal: :calories,
            avg_speed_m_s: :speed,
            avg_power_w: :power,
            avg_cadence_per_min: :cadence,
            avg_heart_rate_bpm: :heart_rate
          ] do
        invalid(row, %{field => -1}, [metric], field)
      end

      invalid(row, %{reps: "2.5"}, [:reps], :reps)
      invalid(row, %{level: 0}, [:level], :level)

      for value <- ["NaN", "Infinity", "-Infinity", Decimal.new("NaN")] do
        invalid(row, %{duration_s: value}, [:duration], :duration_s)
      end

      invalid(%{row | duration_s: Decimal.new("NaN")}, %{}, [:duration], :duration_s)
    end
  end

  test "assistance, downhill incline, and negative scores remain representable" do
    for row <- [%ExerciseLog{}, %ExerciseSet{}] do
      result =
        saved(row, %{weight_kg: "-12.5", incline_pct: "-3", score: "-2", level: 1}, [
          :weight,
          :incline,
          :score,
          :level
        ])

      assert {result.weight_kg, result.incline_pct, result.score, result.level} ==
               {Decimal.new("-12.5"), Decimal.new("-3"), Decimal.new("-2"), 1}
    end
  end

  test "exercise effort keeps its range and reserve is set-only" do
    for row <- [%ExerciseLog{}, %ExerciseSet{}] do
      assert saved(row, %{effort: "10"}, [:effort]).effort == Decimal.new("10")
      invalid(row, %{effort: 0}, [:effort], :effort)
      invalid(row, %{effort: 11}, [:effort], :effort)
    end

    assert saved(%ExerciseSet{}, %{reserve: "0"}, [:reserve]).reserve == Decimal.new("0")
    assert saved(%ExerciseSet{}, %{reserve: "10"}, [:reserve]).reserve == Decimal.new("10")
    invalid(%ExerciseSet{}, %{reserve: 11}, [:reserve], :reserve)
    invalid(%ExerciseLog{}, %{reserve: 2}, [:reserve], :base)
  end

  test "outcomes are typed and the changeset rejects unsupported inputs" do
    for row <- [%ExerciseLog{}, %ExerciseSet{}] do
      assert saved(row, %{result: "win"}, [:result]).result == :win
      invalid(row, %{result: "maybe"}, [:result], :result)

      for attrs <- [
            %{tempo: "3-1-1-0"},
            %{accuracy: 70},
            %{max_heart_rate_bpm: 180},
            %{state: "completed"}
          ] do
        invalid(row, attrs, [:tempo, :heart_rate], :base)
      end
    end
  end

  test "metric selection controls new values but cannot erase retained results" do
    for row <- [%ExerciseLog{}, %ExerciseSet{}] do
      old = saved(row, %{reps: 10, duration_s: "12.45"}, [:reps, :duration])
      result = saved(old, %{reps: 12}, [:reps])
      assert {result.reps, result.duration_s} == {12, Decimal.new("12.45")}
      assert saved(old, %{duration_s: "12.45"}, [:reps]).duration_s == Decimal.new("12.45")
      invalid(old, %{duration_s: "15"}, [:reps], :duration_s)
      assert saved(old, %{duration_s: nil}, [:reps]).duration_s == nil
    end
  end

  test "legacy intensity and grade values are preserved without being relabeled averages" do
    old = %ExerciseSet{
      speed_m_s: Decimal.new("5"),
      power_w: Decimal.new("250"),
      cadence_rpm: 90,
      heart_rate_bpm: 170,
      grade: "old grade"
    }

    result = saved(old, %{reps: 10}, [:reps])

    assert {result.speed_m_s, result.power_w, result.cadence_rpm, result.heart_rate_bpm, result.grade} ==
             {Decimal.new("5"), Decimal.new("250"), 90, 170, "old grade"}

    assert {result.avg_speed_m_s, result.avg_power_w} == {nil, nil}
    assert {result.avg_cadence_per_min, result.avg_heart_rate_bpm} == {nil, nil}

    for attrs <- [
          %{speed_m_s: "6"},
          %{power_w: 300},
          %{cadence_rpm: 80},
          %{heart_rate_bpm: 160},
          %{grade: "new grade"}
        ] do
      invalid(old, attrs, [:speed, :power, :cadence, :heart_rate], :base)
    end
  end

  test "entered units are typed and never change the canonical recorded numbers" do
    for row <- [%ExerciseLog{}, %ExerciseSet{}] do
      result =
        saved(
          row,
          %{weight_kg: "20", duration_s: "90.5", entered_units: %{weight: "lb", duration: "min"}},
          [:weight, :duration]
        )

      assert {result.weight_kg, result.duration_s} == {Decimal.new("20"), Decimal.new("90.5")}
      assert {result.entered_units.weight, result.entered_units.duration} == {:lb, :min}
      result = saved(result, %{entered_units: %{weight: "kg"}}, [:weight, :duration])
      assert {result.entered_units.weight, result.entered_units.duration} == {:kg, :min}
      result = saved(result, %{entered_units: %{weight: nil}}, [:weight, :duration])
      assert {result.entered_units.weight, result.entered_units.duration} == {nil, :min}
      assert saved(result, %{entered_units: nil}, [:weight, :duration]).entered_units == nil

      for units <- [%{weight: "stone"}, %{unknown: "kg"}, [], "kg"] do
        invalid(row, %{entered_units: units}, [:weight], :entered_units)
      end
    end
  end

  test "removed metrics retain units but cannot receive new unit selections" do
    old = saved(%ExerciseLog{}, %{weight_kg: "20", entered_units: %{weight: "lb"}}, [:weight])
    result = saved(old, %{duration_s: "10.5"}, [:duration])

    assert {result.weight_kg, result.entered_units.weight, result.duration_s} ==
             {Decimal.new("20"), :lb, Decimal.new("10.5")}

    invalid(old, %{entered_units: %{weight: "kg"}}, [:duration], :entered_units)
    invalid(%ExerciseLog{}, %{entered_units: %{reserve: "RIR"}}, [:reserve], :entered_units)
  end

  test "skipped activity measurements must be empty and zero is not empty" do
    skipped = %ExerciseLog{state: :skipped}
    assert saved(skipped, %{}, []).state == :skipped
    invalid(skipped, %{reps: 0}, [:reps], :reps)
    invalid(skipped, %{distance_m: "1"}, [:distance], :distance_m)
  end
end
