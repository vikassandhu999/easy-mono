defmodule Easy.Training.PlannedSet do
  use Ecto.Schema

  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @primary_key false
  embedded_schema do
    field :target_reps, :string
    field :load_value, :decimal

    field :load_unit, Ecto.Enum,
      values: [:kg, :lbs, :bodyweight, :percent_1rm, :rpe, :none],
      default: :none

    field :intensity_target, :string
    field :tempo, :string
    field :rest_seconds, :integer
    field :duration_seconds, :integer
    field :distance_value, :decimal
    field :distance_unit, Ecto.Enum, values: [:meters, :km, :miles, :yards, :none], default: :none

    field :set_type, Ecto.Enum,
      values: [:warmup, :working, :dropset, :backoff, :amrap, :emom, :cluster, :rest_pause],
      default: :working

    field :notes, :string
  end

  @cast_fields [
    :target_reps,
    :load_value,
    :load_unit,
    :intensity_target,
    :tempo,
    :rest_seconds,
    :duration_seconds,
    :distance_value,
    :distance_unit,
    :set_type,
    :notes
  ]

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(planned_set, attrs) do
    planned_set
    |> cast(attrs, @cast_fields)
    |> validate_length(:notes, max: 5000)
    |> validate_number(:rest_seconds, greater_than_or_equal_to: 0)
    |> validate_number(:duration_seconds, greater_than_or_equal_to: 0)
    |> validate_has_target()
    |> validate_target_reps_format()
    |> validate_load_unit()
    |> validate_distance_unit()
  end

  defp validate_has_target(changeset) do
    has_reps = get_field(changeset, :target_reps)
    has_duration = get_field(changeset, :duration_seconds)
    has_distance = get_field(changeset, :distance_value)

    if !has_reps && !has_duration && !has_distance do
      add_error(
        changeset,
        :target_reps,
        "must have at least one target: reps, duration, or distance"
      )
    else
      changeset
    end
  end

  defp validate_load_unit(changeset) do
    load = get_field(changeset, :load_value)
    unit = get_field(changeset, :load_unit)

    if load && (!unit || unit == :none) do
      add_error(changeset, :load_unit, "required when load_value is set")
    else
      changeset
    end
  end

  defp validate_distance_unit(changeset) do
    distance = get_field(changeset, :distance_value)
    unit = get_field(changeset, :distance_unit)

    if distance && (!unit || unit == :none) do
      add_error(changeset, :distance_unit, "required when distance_value is set")
    else
      changeset
    end
  end

  defp validate_target_reps_format(changeset) do
    case get_field(changeset, :target_reps) do
      nil -> changeset
      "" -> changeset
      text -> validate_reps_text(changeset, text)
    end
  end

  defp validate_reps_text(changeset, text) do
    if valid_format?(text) && valid_semantics?(text) do
      changeset
    else
      add_error(
        changeset,
        :target_reps,
        "invalid format. Use: '10', '8-12', '10,8,6', '30s', '5km', 'AMRAP', 'Max', 'Failure'"
      )
    end
  end

  defp valid_format?(text) do
    Regex.match?(
      ~r/^(\d+(-\d+)?|\d+(,\d+)+|\d+(\.\d+)?(s|sec|m|min|h|hr|km|mi|yd)?|AMRAP|Max|Failure)$/i,
      text
    )
  end

  defp valid_semantics?(text) do
    cond do
      Regex.match?(~r/^\d+$/, text) ->
        String.to_integer(text) > 0

      Regex.match?(~r/^\d+-\d+$/, text) ->
        [low, high] = text |> String.split("-") |> Enum.map(&String.to_integer/1)
        low > 0 and high > 0 and low < high

      Regex.match?(~r/^\d+(,\d+)+$/, text) ->
        text |> String.split(",") |> Enum.all?(fn part -> String.to_integer(part) > 0 end)

      true ->
        true
    end
  end
end
