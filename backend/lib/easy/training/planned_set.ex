defmodule Easy.Training.PlannedSet do
  use Ecto.Schema
  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @set_types ~w(working warmup dropset)
  @load_units ~w(kg lbs bodyweight none)
  @distance_units ~w(meters km miles none)

  @primary_key false
  embedded_schema do
    field :set_type, :string, default: "working"
    field :reps, :string
    field :load_value, :decimal
    field :load_unit, :string
    field :duration_seconds, :integer
    field :distance_value, :decimal
    field :distance_unit, :string
    field :rpe, :decimal
    field :rest_seconds, :integer
    field :notes, :string
  end

  @fields [:set_type, :reps, :load_value, :load_unit, :duration_seconds, :distance_value,
           :distance_unit, :rpe, :rest_seconds, :notes]

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(planned_set, attrs) do
    planned_set
    |> cast(attrs, @fields)
    |> validate_inclusion(:set_type, @set_types)
    |> validate_inclusion(:load_unit, @load_units)
    |> validate_inclusion(:distance_unit, @distance_units)
    |> validate_number(:rpe, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
  end

  @spec to_snapshot(t()) :: map()
  def to_snapshot(%__MODULE__{} = s) do
    %{
      "set_type" => s.set_type,
      "reps" => s.reps,
      "load_value" => s.load_value,
      "load_unit" => s.load_unit,
      "duration_seconds" => s.duration_seconds,
      "distance_value" => s.distance_value,
      "distance_unit" => s.distance_unit,
      "rpe" => s.rpe
    }
  end
end
