defmodule Easy.Nutrition.RecipeIngredient do
  use Ecto.Schema
  alias Easy.Nutrition
  alias Easy.Orgs.Business

  import Ecto.Changeset
  import Ecto.Query, only: [from: 2]

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_recipe_ingredients" do
    field :amount, :float
    field :unit, :string
    field :weight_g, :float
    field :position, :integer, default: 0

    belongs_to :recipe, Nutrition.Recipe
    belongs_to :food, Nutrition.Food
    belongs_to :business, Business
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(ri in query, where: ri.business_id == ^business_id)
  end

  @spec for_recipes(Ecto.Queryable.t(), [String.t()]) :: Ecto.Query.t()
  def for_recipes(query \\ __MODULE__, recipe_ids) do
    from(ri in query, where: ri.recipe_id in ^recipe_ids)
  end

  @spec include_food(Ecto.Queryable.t()) :: Ecto.Query.t()
  def include_food(query \\ __MODULE__) do
    from(ri in query,
      join: food in assoc(ri, :food),
      on: is_nil(food.business_id) or food.business_id == ri.business_id,
      order_by: [asc: ri.recipe_id, asc: ri.position, asc: ri.id],
      preload: [food: food]
    )
  end

  @spec update_changeset(t(), String.t(), map()) :: Ecto.Changeset.t()
  def update_changeset(recipe_ingredient, business_id, attrs) do
    recipe_ingredient
    |> cast(attrs, [:food_id, :amount, :unit, :weight_g, :position])
    |> put_change(:business_id, business_id)
    |> validate_required([:business_id, :food_id, :weight_g])
    |> validate_number(:weight_g, greater_than: 0)
    |> check_constraint(:weight_g,
      name: :nutrition_recipe_ingredients_weight_positive,
      message: "must be greater than 0"
    )
  end
end
