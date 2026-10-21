defmodule Easy.Workouts.ExerciseMetric do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  @type t :: %__MODULE__{}

  @metrics [
    :reps,
    :weight,
    :duration,
    :distance,
    :elevation_gain,
    :height,
    :calories,
    :speed,
    :incline,
    :level,
    :power,
    :cadence,
    :heart_rate,
    :effort,
    :reserve,
    :successes,
    :attempts,
    :score,
    :result,
    :tempo
  ]

  embedded_schema do
    field(:key, Ecto.Enum, values: @metrics)
    # Null uses the catalogue label. A label never changes the key's units or type.
    field(:label, :string)
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(metric, attrs) do
    metric
    |> cast(attrs, [:key, :label], empty_values: [])
    |> update_change(:label, &optional_label/1)
    |> validate_required([:key])
  end

  defp optional_label(nil), do: nil

  defp optional_label(value) do
    case String.trim(value) do
      "" -> nil
      label -> label
    end
  end
end
