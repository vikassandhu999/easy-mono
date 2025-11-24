defmodule Easy.Nutrition.Ingredient do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "ingredients" do
    field :name, :string
    field :description, :string
    field :image_url, :string
    field :source, :string
    field :calories_per_100g, :decimal
    field :protein_per_100g, :decimal
    field :carbohydrates_per_100g, :decimal
    field :fats_per_100g, :decimal
    field :fiber_per_100g, :decimal
    field :meta_info, :map, default: %{}

    belongs_to :business, Easy.Organizations.Business, type: :binary_id
    belongs_to :creator, Easy.Organizations.Coach, type: :binary_id
    has_many :serving_sizes, Easy.Nutrition.ServingSize

    timestamps()
  end

  @required_fields [:name, :business_id, :creator_id]
  @optional_fields [
    :description,
    :image_url,
    :source,
    :calories_per_100g,
    :protein_per_100g,
    :carbohydrates_per_100g,
    :fats_per_100g,
    :fiber_per_100g,
    :meta_info
  ]

  def changeset(ingredient, attrs) do
    ingredient
    |> cast(attrs, @required_fields ++ @optional_fields)
    |> validate_required(@required_fields)
    |> validate_number(:calories_per_100g, greater_than_or_equal_to: 0)
    |> validate_number(:protein_per_100g, greater_than_or_equal_to: 0)
    |> validate_number(:carbohydrates_per_100g, greater_than_or_equal_to: 0)
    |> validate_number(:fats_per_100g, greater_than_or_equal_to: 0)
    |> validate_number(:fiber_per_100g, greater_than_or_equal_to: 0)
    |> assoc_constraint(:business)
    |> assoc_constraint(:creator)
    |> cast_assoc(:serving_sizes)
  end

  def changeset_system(ingredient, attrs) do
    ingredient
    |> cast(attrs, [:name, :description, :image_url, :source, :meta_info])
    |> validate_required([:name])
  end
end
