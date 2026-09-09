defmodule Easy.Nutrition.Recipe do
  use Ecto.Schema

  alias Easy.Nutrition.Portion
  alias Easy.Nutrition.RecipeIngredient
  alias Easy.Nutrition.Tags
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @type copy_attrs() :: %{
          name: String.t(),
          description: String.t() | nil,
          instructions: String.t() | nil,
          servings_count: integer() | nil,
          cooked_weight_g: float() | nil,
          allergens: [String.t()] | nil,
          dietary_tags: [String.t()] | nil,
          recipe_ingredients: [%{food_id: String.t() | nil, portion: Portion.t()}]
        }

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_recipes" do
    field :name, :string
    field :description, :string
    field :instructions, :string
    field :servings_count, :integer
    field :cooked_weight_g, :float
    field :revision, :integer, default: 1

    field :allergens, {:array, :string}, default: []
    field :dietary_tags, {:array, :string}, default: []

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business
    has_many :recipe_ingredients, RecipeIngredient, on_delete: :delete_all, on_replace: :delete

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :name,
    :description,
    :instructions,
    :servings_count,
    :cooked_weight_g,
    :allergens,
    :dietary_tags
  ]

  @spec copy_attrs(t(), String.t()) :: copy_attrs()
  def copy_attrs(%__MODULE__{} = recipe, name) do
    ingredients =
      Enum.map(recipe.recipe_ingredients, &%{food_id: &1.food_id, portion: Portion.format(&1.portion)})

    recipe
    |> Map.take(@cast_fields)
    |> Map.put(:name, name)
    |> Map.put(:recipe_ingredients, ingredients)
  end

  @spec insert_changeset(String.t(), String.t() | nil, map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, coach_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, coach_id)
    |> put_change(:revision, 1)
    |> validate_recipe()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(recipe, attrs) do
    recipe
    |> cast(attrs, @cast_fields)
    |> put_change(:revision, recipe.revision + 1)
    |> validate_recipe()
  end

  @spec ingredient_errors(t(), [Ecto.Changeset.t()]) :: Ecto.Changeset.t()
  def ingredient_errors(recipe, changesets) do
    %{recipe | recipe_ingredients: []}
    |> change()
    |> put_assoc(:recipe_ingredients, changesets)
  end

  defp validate_recipe(changeset) do
    changeset
    |> update_change(:name, &Easy.Utils.trim/1)
    |> validate_required([:business_id, :name, :servings_count])
    |> validate_length(:name, max: 255, count: :codepoints)
    |> validate_number(:servings_count, greater_than: 0)
    |> validate_number(:cooked_weight_g, greater_than: 0)
    |> validate_subset(:allergens, Tags.allergens())
    |> validate_subset(:dietary_tags, Tags.dietary())
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:creator_id)
    |> check_constraint(:revision, name: :nutrition_recipes_revision_positive)
    |> check_constraint(:cooked_weight_g, name: :nutrition_recipes_cooked_weight_positive)
    |> check_constraint(:servings_count, name: :nutrition_recipes_servings_count_positive)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(r in query, where: r.business_id == ^business_id)
  end

  @spec using_food(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def using_food(query \\ __MODULE__, business_id, food_id) do
    ingredients = RecipeIngredient.for_food(business_id, food_id)

    from(recipe in for_business(query, business_id),
      join: ingredient in ^ingredients,
      on: ingredient.recipe_id == recipe.id and ingredient.business_id == recipe.business_id,
      distinct: true
    )
  end

  @spec search(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def search(query \\ __MODULE__, term)
  def search(query, nil), do: query
  def search(query, ""), do: query
  def search(query, term), do: from(r in query, where: ilike(r.name, ^Easy.Search.like_pattern(term)))

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(r in query, order_by: [desc: r.inserted_at, desc: r.id])
  end

  @spec include_ingredients(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_ingredients(query \\ __MODULE__, business_id) do
    ingredients =
      RecipeIngredient.for_business(business_id)
      |> RecipeIngredient.ordered()
      |> RecipeIngredient.include_food(business_id)

    from(recipe in query, preload: [recipe_ingredients: ^ingredients])
  end
end
