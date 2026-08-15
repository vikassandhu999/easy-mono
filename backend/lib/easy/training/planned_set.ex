defmodule Easy.Training.PlannedSet do
  use Ecto.Schema

  alias Easy.SetVocab

  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @primary_key false
  embedded_schema do
    field :set_type, Ecto.Enum, values: SetVocab.set_types(), default: :working
    field :reps, :string
    field :load_value, :decimal
    field :load_unit, Ecto.Enum, values: SetVocab.load_units()
    field :duration_seconds, :integer
    field :distance_value, :decimal
    field :distance_unit, Ecto.Enum, values: SetVocab.distance_units()
    field :rpe, :decimal
    field :rest_seconds, :integer
    field :notes, :string
  end

  @fields [
    :set_type,
    :reps,
    :load_value,
    :load_unit,
    :duration_seconds,
    :distance_value,
    :distance_unit,
    :rpe,
    :rest_seconds,
    :notes
  ]

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(planned_set, attrs) do
    planned_set
    |> cast(attrs, @fields)
    |> validate_number(:duration_seconds, greater_than_or_equal_to: 0)
    |> validate_number(:rpe, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
    |> validate_number(:rest_seconds, greater_than_or_equal_to: 0)
  end

  @spec to_attrs(t()) :: map()
  def to_attrs(%__MODULE__{} = s) do
    %{
      "set_type" => s.set_type,
      "reps" => s.reps,
      "load_value" => s.load_value,
      "load_unit" => s.load_unit,
      "duration_seconds" => s.duration_seconds,
      "distance_value" => s.distance_value,
      "distance_unit" => s.distance_unit,
      "rpe" => s.rpe,
      "rest_seconds" => s.rest_seconds,
      "notes" => s.notes
    }
  end

  @spec to_snapshot(t()) :: map()
  def to_snapshot(%__MODULE__{} = planned_set) do
    Map.update!(to_attrs(planned_set), "rpe", &decimal_to_number/1)
  end

  defp decimal_to_number(nil), do: nil
  defp decimal_to_number(%Decimal{} = value), do: Decimal.to_float(value)
end
