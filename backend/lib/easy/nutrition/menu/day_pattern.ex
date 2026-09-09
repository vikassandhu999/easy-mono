defmodule Easy.Nutrition.Menu.DayPattern do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.Menu.Slot

  @type t() :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: false}
  embedded_schema do
    field :name, :string
    embeds_many :slots, Slot
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(pattern, attrs) do
    pattern
    |> cast(attrs, [:id, :name])
    |> update_change(:name, &String.trim/1)
    |> validate_required([:id, :name])
    |> validate_length(:name, max: 255)
    |> cast_embed(:slots)
  end
end
