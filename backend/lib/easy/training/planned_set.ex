defmodule Easy.Training.PlannedSet do
  use Ecto.Schema

  alias Easy.SetVocab

  import Ecto.Changeset

  @type t() :: %__MODULE__{
          set_type: SetVocab.set_type() | nil,
          reps: String.t() | nil,
          load_value: Decimal.t() | nil,
          load_unit: SetVocab.load_unit() | nil,
          duration_seconds: integer() | nil,
          distance_value: Decimal.t() | nil,
          distance_unit: SetVocab.distance_unit() | nil,
          rpe: Decimal.t() | nil,
          rest_seconds: integer() | nil,
          notes: String.t() | nil
        }
  @type value ::
          String.t()
          | integer()
          | Decimal.t()
          | SetVocab.set_type()
          | SetVocab.load_unit()
          | SetVocab.distance_unit()
          | nil
  @type attrs :: %{String.t() => value()}
  @type snapshot :: %{String.t() => value() | float()}

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

  @spec to_attrs(t()) :: attrs()
  def to_attrs(%__MODULE__{} = planned_set) do
    Map.new(@fields, &{Atom.to_string(&1), Map.fetch!(planned_set, &1)})
  end

  @spec to_snapshot(t()) :: snapshot()
  def to_snapshot(%__MODULE__{} = planned_set) do
    Map.update!(to_attrs(planned_set), "rpe", &decimal_to_number/1)
  end

  defp decimal_to_number(nil), do: nil
  defp decimal_to_number(%Decimal{} = value), do: Decimal.to_float(value)
end
