defmodule Easy.Nutrition.Ingredient do
  use Ecto.Schema
  alias Easy.Organizations.Business
  alias Easy.Organizations.Coach

  schema "ingredients" do
    field :name, :string
    field :image_url, :string
    field :thumbnail_url, :string

    belongs_to :business, Business
    belongs_to :creator, Coach

    timestamps()
  end

  @doc false
  def changeset(ingredient, attrs) do
    ingredient
    |> Ecto.Changeset.cast(attrs, [
      :name,
      :image_url,
      :thumbnail_url,
      :business_id,
      :creator_id,
      :default_serving_unit_id
    ])
    |> Ecto.Changeset.validate_required([:name, :business_id, :creator_id])
    |> Ecto.Changeset.cast_assoc(:allowed_serving_units)
  end

  def changeset_system(ingredient, attrs) do
    ingredient
    |> Ecto.Changeset.cast(attrs, [
      :name,
      :image_url,
      :thumbnail_url,
      :default_serving_unit_id
    ])
    |> Ecto.Changeset.validate_required([:name])
    |> Ecto.Changeset.cast_assoc(:allowed_serving_units)
  end
end
