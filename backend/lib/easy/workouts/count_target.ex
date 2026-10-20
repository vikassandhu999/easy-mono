defmodule Easy.Workouts.CountTarget do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Workouts.TargetRules

  @primary_key false
  @type t :: %__MODULE__{}
  @metrics [:reps, :level, :cadence, :heart_rate, :successes, :attempts]

  embedded_schema do
    field(:mode, Ecto.Enum,
      values: [:client_chooses, :exact, :range, :max],
      default: :client_chooses
    )

    field(:value, :integer)
    field(:min, :integer)
    field(:max, :integer)
  end

  @spec changeset(t(), map(), atom()) :: Ecto.Changeset.t()
  def changeset(target, attrs, metric) when metric in @metrics do
    target
    |> cast(attrs, [:mode, :value, :min, :max], empty_values: [])
    |> TargetRules.validate(metric)
  end
end
