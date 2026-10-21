defmodule Easy.Workouts.TargetRules do
  import Ecto.Changeset

  @value_fields [:value, :min, :max]

  @spec validate(Ecto.Changeset.t(), atom(), [atom()]) :: Ecto.Changeset.t()
  def validate(changeset, metric, fields \\ @value_fields) do
    changeset
    |> validate_required([:mode])
    |> validate_shape(fields)
    |> validate_metric(metric, fields)
  end

  @spec validate_single_value(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate_single_value(changeset) do
    changeset = validate_required(changeset, [:mode])

    case get_field(changeset, :mode) do
      :exact -> validate_required(changeset, [:value])
      :client_chooses -> require_empty(changeset, [:value])
      _ -> changeset
    end
  end

  defp validate_shape(changeset, [value_field, min_field, max_field] = fields) do
    case get_field(changeset, :mode) do
      :exact ->
        changeset
        |> validate_required([value_field])
        |> require_empty([min_field, max_field])

      :range ->
        changeset
        |> validate_required([min_field, max_field])
        |> require_empty([value_field])
        |> validate_order(min_field, max_field)

      mode when mode in [:client_chooses, :max, :none] ->
        require_empty(changeset, fields)

      _ ->
        changeset
    end
  end

  defp require_empty(changeset, fields) do
    Enum.reduce(fields, changeset, fn field, acc ->
      if is_nil(get_field(acc, field)),
        do: acc,
        else: add_error(acc, field, "must be empty for this target mode")
    end)
  end

  defp validate_order(changeset, min_field, max_field) do
    case {get_field(changeset, min_field), get_field(changeset, max_field)} do
      {nil, _} ->
        changeset

      {_, nil} ->
        changeset

      {lower, upper} ->
        if Decimal.compare(lower, upper) == :gt,
          do: add_error(changeset, max_field, "must be greater than or equal to #{min_field}"),
          else: changeset
    end
  end

  defp validate_metric(changeset, metric, fields) do
    limits = metric_limits(metric)

    Enum.reduce(fields, changeset, &validate_value(&2, &1, get_field(&2, &1), limits))
  end

  defp metric_limits(:effort), do: {1, 10}
  defp metric_limits(:reserve), do: {0, 10}
  defp metric_limits(:level), do: {1, nil}
  defp metric_limits(metric) when metric in [:weight, :incline, :score], do: {nil, nil}
  defp metric_limits(_metric), do: {0, nil}

  defp validate_value(changeset, _field, nil, _limits), do: changeset

  defp validate_value(changeset, field, value, {minimum, maximum}) do
    cond do
      minimum != nil and Decimal.compare(value, minimum) == :lt ->
        add_error(changeset, field, "must be greater than or equal to #{minimum}")

      maximum != nil and Decimal.compare(value, maximum) == :gt ->
        add_error(changeset, field, "must be less than or equal to #{maximum}")

      true ->
        changeset
    end
  end
end
