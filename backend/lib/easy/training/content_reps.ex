defmodule Easy.Training.Content.Reps do
  use Ecto.Schema
  import Ecto.Changeset
  @primary_key false

  embedded_schema do
    field :type, Ecto.Enum, values: [:exact, :range, :amrap]
    field :value, :integer
    field :min, :integer
    field :max, :integer
  end

  @spec changeset(struct(), map()) :: Ecto.Changeset.t()
  def changeset(value, attrs) do
    value
    |> cast(attrs, [:type, :value, :min, :max])
    |> validate_required([:type])
    |> validate_targets()
  end

  defp validate_targets(cs) do
    case get_field(cs, :type) do
      :exact ->
        cs |> validate_required([:value]) |> validate_number(:value, greater_than_or_equal_to: 0)

      :range ->
        cs
        |> validate_required([:min, :max])
        |> validate_number(:min, greater_than_or_equal_to: 0)
        |> validate_number(:max, greater_than_or_equal_to: get_field(cs, :min) || 0)

      _ ->
        cs
    end
  end
end
