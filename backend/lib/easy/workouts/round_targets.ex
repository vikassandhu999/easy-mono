defmodule Easy.Workouts.RoundTargets do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Workouts.{CountTarget, Exercise, NumericTarget}

  @primary_key false
  @type t :: %__MODULE__{}

  embedded_schema do
    embeds_one(:reps, Easy.Workouts.CountTarget, on_replace: :update)
    embeds_one(:weight, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:duration, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:distance, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:elevation_gain, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:height, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:calories, Easy.Workouts.NumericTarget, on_replace: :update)

    embeds_one(:speed, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:incline, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:level, Easy.Workouts.CountTarget, on_replace: :update)
    embeds_one(:power, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:cadence, Easy.Workouts.CountTarget, on_replace: :update)
    embeds_one(:heart_rate, Easy.Workouts.CountTarget, on_replace: :update)
    embeds_one(:effort, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:reserve, Easy.Workouts.NumericTarget, on_replace: :update)

    embeds_one(:successes, Easy.Workouts.CountTarget, on_replace: :update)
    embeds_one(:attempts, Easy.Workouts.CountTarget, on_replace: :update)
    embeds_one(:score, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:result, Easy.Workouts.ResultTarget, on_replace: :update)
    embeds_one(:grade, Easy.Workouts.TextTarget, on_replace: :update)
    embeds_one(:tempo, Easy.Workouts.TextTarget, on_replace: :update)

    embeds_one(:rest, Easy.Workouts.RestTarget,
      on_replace: :update,
      defaults_to_struct: true
    )
  end

  @spec changeset(t(), map(), Exercise.t()) :: Ecto.Changeset.t()
  def changeset(round, attrs, %Exercise{} = exercise) do
    fields = __schema__(:embeds)
    params = Map.new(attrs, fn {key, value} -> {to_string(key), value} end)

    params =
      Enum.reduce(fields, params, fn field, acc ->
        if is_nil(Map.fetch!(round, field)),
          do: acc,
          else: Map.put_new(acc, Atom.to_string(field), %{})
      end)

    params =
      if is_nil(params["rest"]) do
        Map.put(params, "rest", %{
          "mode" => "client_chooses",
          "value_s" => nil,
          "min_s" => nil,
          "max_s" => nil
        })
      else
        params
      end

    changeset =
      Enum.reduce(fields, cast(round, params, [], empty_values: []), fn field, acc ->
        cast_target(acc, field)
      end)

    changeset
    |> validate_known_fields(fields)
    |> validate_selected_metrics(fields, exercise.metrics)
  end

  @spec cast_many(Ecto.Changeset.t(), Exercise.t(), pos_integer()) :: Ecto.Changeset.t()
  def cast_many(changeset, exercise, rounds) do
    changeset
    |> cast_target_list(exercise)
    |> validate_target_count(rounds)
  end

  defp cast_target_list(changeset, exercise) do
    case Map.fetch(changeset.params, "targets") do
      :error ->
        targets = Enum.map(get_field(changeset, :targets), &changeset(&1, %{}, exercise))
        put_embed(changeset, :targets, targets)

      {:ok, values} when is_list(values) ->
        if Enum.all?(values, &(is_map(&1) and not is_struct(&1))) do
          targets = Enum.map(values, &changeset(%__MODULE__{}, &1, exercise))
          put_embed(changeset, :targets, targets)
        else
          add_error(changeset, :targets, "must be an array of round target objects")
        end

      {:ok, _} ->
        add_error(changeset, :targets, "must be an array of round target objects")
    end
  end

  defp validate_target_count(changeset, rounds) when is_integer(rounds) and rounds > 0 do
    expected =
      case get_field(changeset, :targets_mode) do
        :same_for_all -> 1
        :per_round -> rounds
        _ -> nil
      end

    if expected != nil and length(get_field(changeset, :targets)) != expected,
      do: add_error(changeset, :targets, "must contain exactly #{expected} round target entries"),
      else: changeset
  end

  defp validate_target_count(changeset, _rounds),
    do: add_error(changeset, :targets, "requires a positive integer round count")

  defp cast_target(changeset, field) do
    value = changeset.params[Atom.to_string(field)]

    if is_nil(value) or (is_map(value) and not is_struct(value)) do
      schema = __schema__(:embed, field).related

      cast_embed(changeset, field, with: &target_changeset(&1, &2, field, schema))
    else
      add_error(changeset, field, "must be an object or null")
    end
  end

  defp target_changeset(target, attrs, field, schema) when schema in [CountTarget, NumericTarget],
    do: schema.changeset(target, attrs, field)

  defp target_changeset(target, attrs, _field, schema), do: schema.changeset(target, attrs)

  defp validate_known_fields(changeset, fields) do
    unknown = Map.keys(changeset.params) -- Enum.map(fields, &Atom.to_string/1)

    Enum.reduce(unknown, changeset, fn key, acc ->
      add_error(acc, :base, "unsupported target #{key}")
    end)
  end

  defp validate_selected_metrics(changeset, fields, metrics) do
    selected = Enum.map(metrics, & &1.key)

    Enum.reduce(fields -- [:rest], changeset, fn field, acc ->
      if field not in selected and not is_nil(get_field(acc, field)),
        do: add_error(acc, field, "is not selected for this exercise"),
        else: acc
    end)
  end
end
