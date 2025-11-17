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
    field :calories, :decimal
    field :protein, :decimal
    field :carbohydrates, :decimal
    field :fats, :decimal
    field :fiber, :decimal
    field :meta_info, :map, default: %{}

    belongs_to :business, Easy.Organizations.Business, type: :binary_id
    belongs_to :creator, Easy.Organizations.Coach, type: :binary_id

    timestamps()
  end

  @required_fields [:name, :business_id, :creator_id]
  @optional_fields [
    :description,
    :image_url,
    :source,
    :calories,
    :protein,
    :carbohydrates,
    :fats,
    :fiber,
    :meta_info
  ]

  def changeset(ingredient, attrs) do
    ingredient
    |> cast(attrs, @required_fields ++ @optional_fields)
    |> validate_required(@required_fields)
    |> validate_number(:calories, greater_than_or_equal_to: 0)
    |> validate_number(:protein, greater_than_or_equal_to: 0)
    |> validate_number(:carbohydrates, greater_than_or_equal_to: 0)
    |> validate_number(:fats, greater_than_or_equal_to: 0)
    |> validate_number(:fiber, greater_than_or_equal_to: 0)
    |> assoc_constraint(:business)
    |> assoc_constraint(:creator)
  end

  def changeset_system(ingredient, attrs) do
    ingredient
    |> cast(attrs, [:name, :description, :image_url, :source, :meta_info])
    |> validate_required([:name])
  end
end
