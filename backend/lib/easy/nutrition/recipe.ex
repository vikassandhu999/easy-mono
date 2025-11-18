defmodule Easy.Nutrition.Recipe do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "recipes" do
    field :name, :string
    field :description, :string

    field :instructions, {:array, :string}, default: []
    field :instructions_as_text, :string

    field :prep_time_minutes, :integer
    field :cook_time_minutes, :integer
    field :servings, :integer, default: 1

    field :total_calories, :decimal
    field :total_protein, :decimal
    field :total_carbohydrates, :decimal
    field :total_fats, :decimal
    field :total_fiber, :decimal

    field :status, Ecto.Enum, values: [:active, :draft, :archived], default: :active

    belongs_to :business, Easy.Organizations.Business, type: :binary_id
    belongs_to :creator, Easy.Organizations.Coach, type: :binary_id

    has_many :recipe_ingredients, Easy.Nutrition.RecipeIngredient,
      on_delete: :delete_all,
      on_replace: :delete

    timestamps()
  end

  # Changed to atom list for Ecto.Enum validation
  @valid_statuses [:active, :draft, :archived]

  @doc false
  def changeset(recipe, attrs) do
    recipe
    |> cast(attrs, [
      :name,
      :description,
      :instructions,
      :instructions_as_text,
      :prep_time_minutes,
      :cook_time_minutes,
      :servings,
      :status,
      :total_calories,
      :total_protein,
      :total_carbohydrates,
      :total_fats,
      :total_fiber,
      :business_id,
      :creator_id
    ])
    |> validate_required([:name, :status, :business_id, :creator_id])
    |> validate_inclusion(:status, @valid_statuses)
    |> validate_number(:prep_time_minutes, greater_than_or_equal_to: 0)
    |> validate_number(:cook_time_minutes, greater_than_or_equal_to: 0)
    |> validate_number(:servings, greater_than: 0)
    |> cast_assoc(:recipe_ingredients, with: &Easy.Nutrition.RecipeIngredient.changeset/2)
  end
end
