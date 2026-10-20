defmodule Easy.Workouts.ResultMeasurements do
  import Ecto.Changeset
  alias Easy.Workouts.{Exercise, ResultUnits}

  @overall [
    reps: :reps,
    weight_kg: :weight,
    duration_s: :duration,
    distance_m: :distance,
    elevation_gain_m: :elevation_gain,
    height_cm: :height,
    calories_kcal: :calories,
    avg_speed_m_s: :speed,
    incline_pct: :incline,
    level: :level,
    avg_power_w: :power,
    avg_cadence_per_min: :cadence,
    avg_heart_rate_bpm: :heart_rate,
    effort: :effort,
    successes: :successes,
    attempts: :attempts,
    score: :score,
    result: :result
  ]

  @spec present?(struct()) :: boolean()
  def present?(row) do
    fields =
      Keyword.keys(@overall) ++
        [:reserve, :speed_m_s, :power_w, :cadence_rpm, :heart_rate_bpm, :grade]

    Enum.any?(fields, &(not is_nil(Map.get(row, &1))))
  end

  @spec changeset(struct(), map(), Exercise.t(), :overall | :detail) :: Ecto.Changeset.t()
  def changeset(row, attrs, %Exercise{} = exercise, scope) when scope in [:overall, :detail] do
    fields = if scope == :detail, do: @overall ++ [reserve: :reserve], else: @overall

    selected =
      Enum.map(exercise.metrics, & &1.key) |> Enum.filter(&(&1 in Keyword.values(fields)))

    attrs =
      Map.new(attrs, fn
        {key, %Decimal{} = value} -> {key, Decimal.to_string(value)}
        pair -> pair
      end)

    row
    |> cast(attrs, Keyword.keys(fields), empty_values: [])
    |> validate_input(fields)
    |> validate_values(fields, selected)
    |> validate_attempts()
    |> cast_units(selected)
  end

  defp validate_input(changeset, fields) do
    allowed = Enum.map([:entered_units | Keyword.keys(fields)], &Atom.to_string/1)

    Enum.reduce(Map.keys(changeset.params) -- allowed, changeset, fn key, acc ->
      add_error(acc, :base, "unsupported measurement #{key}")
    end)
  end

  defp validate_values(changeset, fields, selected) do
    Enum.reduce(fields, changeset, fn {field, metric}, acc ->
      value = get_field(acc, field)

      acc =
        if match?({:ok, value} when not is_nil(value), fetch_change(acc, field)) and
             metric not in selected,
           do: add_error(acc, field, "is not selected for this exercise"),
           else: acc

      cond do
        is_nil(value) ->
          acc

        get_field(acc, :state) == :skipped ->
          add_error(acc, field, "must be empty for skipped work")

        metric == :result ->
          acc

        true ->
          validate_number_value(acc, field, metric, value)
      end
    end)
  end

  defp validate_number_value(changeset, field, metric, value) do
    {minimum, maximum} = metric_limits(metric)

    cond do
      not finite?(value) ->
        add_error(changeset, field, "must be finite")

      minimum != nil and Decimal.compare(value, minimum) == :lt ->
        add_error(changeset, field, "must be greater than or equal to #{minimum}")

      maximum != nil and Decimal.compare(value, maximum) == :gt ->
        add_error(changeset, field, "must be less than or equal to #{maximum}")

      true ->
        changeset
    end
  end

  defp metric_limits(:effort), do: {1, 10}
  defp metric_limits(:reserve), do: {0, 10}
  defp metric_limits(:level), do: {1, nil}
  defp metric_limits(metric) when metric in [:weight, :incline, :score], do: {nil, nil}
  defp metric_limits(_metric), do: {0, nil}

  defp finite?(%Decimal{coef: coefficient}), do: is_integer(coefficient)
  defp finite?(value), do: is_integer(value)

  defp validate_attempts(changeset) do
    case {get_field(changeset, :successes), get_field(changeset, :attempts)} do
      {successes, attempts}
      when is_integer(successes) and is_integer(attempts) and successes > attempts ->
        add_error(changeset, :successes, "must not exceed attempts")

      _ ->
        changeset
    end
  end

  defp cast_units(changeset, selected) do
    value = changeset.params["entered_units"]

    if is_nil(value) or (is_map(value) and not is_struct(value)) do
      cast_embed(changeset, :entered_units, with: fn units, attrs -> ResultUnits.changeset(units, attrs, selected) end)
    else
      add_error(changeset, :entered_units, "must be an object or null")
    end
  end
end
