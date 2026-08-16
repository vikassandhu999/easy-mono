defmodule Easy.Nutrition.Recipe do
  use Ecto.Schema

  alias Easy.Nutrition.RecipeIngredient
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @allergens ~w(dairy egg fish shellfish tree_nuts peanuts wheat soy sesame)
  @dietary_tags ~w(vegan vegetarian halal kosher gluten_free dairy_free low_fodmap keto high_protein)

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
    has_many :foods, through: [:recipe_ingredients, :food]

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

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
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
    |> validate_recipe()
  end

  defp validate_recipe(changeset) do
    changeset
    |> update_change(:name, &Easy.Utils.trim/1)
    |> validate_required([:name, :servings_count])
    |> validate_length(:name, max: 255)
    |> validate_number(:servings_count, greater_than: 0)
    |> validate_number(:cooked_weight_g, greater_than: 0)
    |> validate_subset(:allergens, @allergens)
    |> validate_subset(:dietary_tags, @dietary_tags)
    |> check_constraint(:revision, name: :nutrition_recipes_revision_positive)
    |> check_constraint(:cooked_weight_g, name: :nutrition_recipes_cooked_weight_positive)
    |> check_constraint(:servings_count, name: :nutrition_recipes_servings_count_positive)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(r in query, where: r.business_id == ^business_id)
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
    from(r in query, preload: [recipe_ingredients: ^ingredient_food_query(business_id)])
  end

  @spec include_ingredient_foods(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_ingredient_foods(query \\ __MODULE__, business_id) do
    from(r in query, preload: [recipe_ingredients: ^ingredient_food_query(business_id)])
  end

  defp ingredient_food_query(business_id) do
    food_query = Easy.Nutrition.Food.for_business_or_system(Easy.Nutrition.Food, business_id)

    from(ri in RecipeIngredient,
      order_by: [asc: ri.position, asc: ri.id],
      preload: [food: ^food_query]
    )
  end
end
