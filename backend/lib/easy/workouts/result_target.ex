defmodule Easy.Workouts.ResultTarget do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Workouts.TargetRules

  @primary_key false
  @type t :: %__MODULE__{}

  embedded_schema do
    field(:mode, Ecto.Enum, values: [:client_chooses, :exact], default: :client_chooses)
    field(:value, Ecto.Enum, values: [:win, :draw, :loss])
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(target, attrs) do
    target
    |> cast(attrs, [:mode, :value], empty_values: [])
    |> TargetRules.validate_single_value()
  end
end
