defmodule Easy.Nutrition.Ingredient do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "ingredients" do
    field :name, :string
    field :image_url, :string
    field :meta_info, :map, default: %{}

    belongs_to :business, Easy.Organizations.Business, type: :binary_id
    belongs_to :creator, Easy.Organizations.Coach, type: :binary_id

    timestamps()
  end

  @doc false
  def changeset(ingredient, attrs) do
    ingredient
    |> Ecto.Changeset.cast(attrs, [
      :name,
      :image_url
    ])
    |> Ecto.Changeset.validate_required([:name, :business_id, :creator_id])
  end

  def changeset_system(ingredient, attrs) do
    ingredient
    |> Ecto.Changeset.cast(attrs, [
      :name,
      :image_url
    ])
    |> Ecto.Changeset.validate_required([:name])
  end
end
