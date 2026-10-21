defmodule Easy.Workouts.RestTarget do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Workouts.TargetRules

  @primary_key false
  @type t :: %__MODULE__{}

  embedded_schema do
    field(:mode, Ecto.Enum,
      values: [:client_chooses, :none, :exact, :range],
      default: :client_chooses
    )

    field(:value_s, :decimal)
    field(:min_s, :decimal)
    field(:max_s, :decimal)
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(target, attrs) do
    target
    |> cast(attrs, [:mode, :value_s, :min_s, :max_s], empty_values: [])
    |> TargetRules.validate(:duration, [:value_s, :min_s, :max_s])
  end
end
