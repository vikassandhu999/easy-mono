defmodule Easy.Training.Programming.PlannedSet do
  @moduledoc """
  Embedded schema for planned sets within a workout element.
  Stored as JSONB array in the workout_elements table.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  embedded_schema do
    # === PRIMARY TARGET (What you're measuring) ===
    # Supports: "10", "8-12", "AMRAP", "10,8,6", "30s", "5km", "Max", "Failure"
    field :target_reps, :string

    # === INTENSITY MODIFIERS ===
    field :load_value, :decimal

    field :load_unit, Ecto.Enum,
      values: [:kg, :lbs, :bodyweight, :percent_1rm, :rpe, :none],
      default: :none

    # "RPE 8", "Zone 2", "65% HR"
    field :intensity_target, :string
    # === EXECUTION PARAMETERS ===
    field :tempo, :string
    field :rest_seconds, :integer

    # === TIME/DISTANCE (for cardio, endurance) ===
    field :duration_seconds, :integer
    field :distance_value, :decimal

    field :distance_unit, Ecto.Enum,
      values: [:meters, :km, :miles, :yards, :none],
      default: :none

    # === SET CLASSIFICATION === 
    field :set_type, Ecto.Enum,
      values: [:warmup, :working, :dropset, :backoff, :amrap, :emom, :cluster, :rest_pause],
      default: :working

    # === NOTES ===
    field :notes, :string
  end

  @spec changeset(
          {map(),
           %{
             optional(atom()) =>
               atom()
               | {:array | :assoc | :embed | :in | :map | :parameterized | :supertype | :try,
                  any()}
           }}
          | %{
              :__struct__ => atom() | %{:__changeset__ => any(), optional(any()) => any()},
              optional(atom()) => any()
            },
          :invalid | %{optional(:__struct__) => none(), optional(atom() | binary()) => any()}
        ) :: Ecto.Changeset.t()
  @doc false
  def changeset(planned_set, attrs) do
    planned_set
    |> cast(attrs, [
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
    ])
    |> validate_length(:notes, max: 5000)
    |> validate_load_requires_unit()
    |> validate_number(:rest_seconds, greater_than_or_equal_to: 0)
    |> validate_number(:duration_seconds, greater_than_or_equal_to: 0)
    |> validate_at_least_one_target()
    |> validate_target_reps_format()
    |> validate_distance_requires_unit()
  end

  defp validate_at_least_one_target(changeset) do
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

  defp validate_load_requires_unit(changeset) do
    load = get_field(changeset, :load_value)
    unit = get_field(changeset, :load_unit)

    if load && (!unit || unit == :none) do
      add_error(changeset, :load_unit, "required when load_value is set")
    else
      changeset
    end
  end

  defp validate_target_reps_format(changeset) do
    case get_field(changeset, :target_reps) do
      nil ->
        changeset

      "" ->
        changeset

      text ->
        if valid_target_reps_format?(text) and valid_target_reps_semantics?(text) do
          changeset
        else
          add_error(
            changeset,
            :target_reps,
            "invalid format. Use: '10', '8-12', '10,8,6', '30s', '5km', 'AMRAP', 'Max', 'Failure'"
          )
        end
    end
  end

  defp valid_target_reps_format?(text) do
    # Matches: numbers, ranges, comma-separated, time/distance suffixes, or text keywords
    Regex.match?(
      ~r/^(\d+(-\d+)?|\d+(,\d+)+|\d+(\.\d+)?(s|sec|m|min|h|hr|km|mi|yd)?|AMRAP|Max|Failure)$/i,
      text
    )
  end

  defp valid_target_reps_semantics?(text) do
    cond do
      Regex.match?(~r/^\d+$/, text) ->
        String.to_integer(text) > 0

      Regex.match?(~r/^\d+-\d+$/, text) ->
        [low, high] = text |> String.split("-") |> Enum.map(&String.to_integer/1)
        low > 0 and high > 0 and low < high

      Regex.match?(~r/^\d+(,\d+)+$/, text) ->
        text
        |> String.split(",")
        |> Enum.all?(fn part -> String.to_integer(part) > 0 end)

      true ->
        true
    end
  end

  defp validate_distance_requires_unit(changeset) do
    distance = get_field(changeset, :distance_value)
    unit = get_field(changeset, :distance_unit)

    if distance && (!unit || unit == :none) do
      add_error(changeset, :distance_unit, "required when distance_value is set")
    else
      changeset
    end
  end
end
