defmodule Easy.Nutrition.Recipe do
  use Easy.Nutrition.Schema

  alias Easy.Organizations.{Business, Coach}
  alias Easy.Nutrition.RecipeIngredient

  schema "recipes" do
    field :name, :string
    field :description, :string
    field :image_url, :string

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

    belongs_to :business, Business
    belongs_to :author, Coach

    has_many :recipe_ingredients, RecipeIngredient,
      on_delete: :delete_all,
      on_replace: :delete,
      preload_order: [asc: :position]

    timestamps()
  end

  @doc false
  def changeset(recipe, attrs) do
    recipe
    |> cast(attrs, [
      :name,
      :description,
      :image_url,
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
      :total_fiber
    ])
    |> validate_required([:name, :status, :business_id, :author_id])
    |> validate_number(:prep_time_minutes, greater_than_or_equal_to: 0)
    |> validate_number(:cook_time_minutes, greater_than_or_equal_to: 0)
    |> validate_number(:servings, greater_than: 0)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:author_id)
    |> cast_assoc(:recipe_ingredients, with: &RecipeIngredient.changeset/2)
  end
end
