defmodule Easy.Nutrition.Recipe do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "recipes" do
    field :name, :string
    field :description, :string
    field :instructions, :string
    field :prep_time_minutes, :integer
    field :cook_time_minutes, :integer
    field :servings, :integer, default: 1

    field :total_calories, :decimal
    field :total_protein, :decimal
    field :total_carbs, :decimal
    field :total_fats, :decimal
    field :total_fiber, :decimal

    field :status, :string, default: "active"

    belongs_to :business, Easy.Organizations.Business
    belongs_to :creator, Easy.Organizations.Coach

    has_many :recipe_ingredients, Easy.Nutrition.RecipeIngredient, on_delete: :delete_all

    many_to_many :ingredients, Easy.Nutrition.Ingredient,
      join_through: Easy.Nutrition.RecipeIngredient,
      on_delete: :delete_all

    timestamps()
  end

  @valid_statuses ~w(active archived)

  @doc false
  def changeset(recipe, attrs) do
    recipe
    |> cast(attrs, [
      :name,
      :description,
      :instructions,
      :prep_time_minutes,
      :cook_time_minutes,
      :servings,
      :status,
      :business_id,
      :creator_id
    ])
    |> validate_required([:name, :status, :business_id, :creator_id])
    |> validate_inclusion(:status, @valid_statuses)
    |> validate_number(:prep_time_minutes, greater_than_or_equal_to: 0)
    |> validate_number(:cook_time_minutes, greater_than_or_equal_to: 0)
    |> validate_number(:servings, greater_than: 0)
  end
end
