defmodule Easy.Nutrition.DiarySlot.Option do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.DiarySlot.Item

  @primary_key {:id, Ecto.UUID, autogenerate: false}
  @type t :: %__MODULE__{}
  embedded_schema do
    field :name, :string
    embeds_many :items, Item, on_replace: :delete
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(option, attrs) do
    option |> cast(attrs, [:id, :name]) |> validate_required([:id, :name]) |> cast_embed(:items)
  end
end
