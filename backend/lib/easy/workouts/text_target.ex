defmodule Easy.Workouts.TextTarget do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Workouts.TargetRules

  @primary_key false
  @type t :: %__MODULE__{}

  embedded_schema do
    field(:mode, Ecto.Enum, values: [:client_chooses, :exact], default: :client_chooses)
    field(:value, :string)
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(target, attrs) do
    target
    |> cast(attrs, [:mode, :value], empty_values: [])
    |> update_change(:value, &normalize_text/1)
    |> TargetRules.validate_single_value()
  end

  defp normalize_text(nil), do: nil

  defp normalize_text(value) do
    case String.trim(value) do
      "" -> nil
      text -> text
    end
  end
end
