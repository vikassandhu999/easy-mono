defmodule Easy.Workouts.Targets do
  @counts ~w(reps level cadence heart_rate successes attempts)
  @nonnegative ~w(reps duration distance elevation_gain height calories speed level power cadence heart_rate successes attempts)
  @spec valid?(map(), map(), pos_integer()) :: boolean()
  def valid?(row, exercise, rounds) do
    expected = if row.targets_mode == :same_for_all, do: 1, else: rounds

    length(row.targets) == expected and length(row.rest) in [0, expected] and
      Enum.all?(row.targets, &metrics?(&1, exercise)) and
      Enum.all?(row.rest, &(is_nil(&1) or target?(&1, "duration", exercise, [:exact, :range])))
  end

  defp metrics?(values, exercise) when is_map(values),
    do:
      Enum.all?(values, fn {metric, value} ->
        metric in exercise["metrics"] and target?(value, metric, exercise, [:exact, :range, :max])
      end)

  defp metrics?(_, _), do: false

  defp target?(%{"mode" => "max"} = target, metric, _exercise, modes),
    do: :max in modes and map_size(target) == 1 and metric not in ~w(result grade tempo)

  defp target?(%{"mode" => "exact", "value" => value} = target, metric, exercise, modes),
    do: :exact in modes and map_size(target) == 2 and value?(value, metric, exercise)

  defp target?(%{"mode" => "range", "min" => lo, "max" => hi} = target, metric, exercise, modes),
    do:
      :range in modes and map_size(target) == 3 and is_number(lo) and is_number(hi) and lo <= hi and
        value?(lo, metric, exercise) and value?(hi, metric, exercise)

  defp target?(_, _, _, _), do: false
  defp value?(value, "result", _), do: value in ~w(win draw loss)
  defp value?(value, "grade", exercise), do: value in exercise["grade_scale"]
  defp value?(value, "tempo", _), do: is_binary(value) and byte_size(value) in 1..100

  defp value?(value, metric, _) when is_number(value) do
    finite = value < 1.0e15 and value > -1.0e15
    integer = metric not in @counts or is_integer(value) or trunc(value) == value

    finite and integer and bounded?(value, metric)
  end

  defp value?(_, _, _), do: false

  defp bounded?(value, "effort"), do: value >= 1 and value <= 10
  defp bounded?(value, "reserve"), do: value >= 0 and value <= 10
  defp bounded?(value, "level"), do: value >= 1
  defp bounded?(value, metric), do: metric not in @nonnegative or value >= 0
end
