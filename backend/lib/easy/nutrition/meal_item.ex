defmodule Easy.Nutrition.MealItem do
  use Ecto.Schema

  alias Easy.Nutrition
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_meal_items" do
    field :weight_g, :float
    field :amount, :float
    field :unit, :string
    field :position, :integer, default: 0

    belongs_to :business, Orgs.Business
    belongs_to :recipe, Nutrition.Recipe
    belongs_to :food, Nutrition.Food
    belongs_to :meal, Nutrition.Meal, foreign_key: :nutrition_meal_id

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:weight_g, :amount, :unit, :position, :recipe_id, :food_id]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(meal_id, business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:nutrition_meal_id, meal_id)
    |> put_change(:business_id, business_id)
    |> validate_required([:nutrition_meal_id, :business_id, :weight_g])
    |> validate_number(:weight_g, greater_than: 0)
    |> validate_food_or_recipe()
    |> check_constraint(:weight_g,
      name: :nutrition_meal_items_weight_positive,
      message: "must be greater than 0"
    )
    |> check_constraint(:food_id,
      name: :nutrition_meal_items_food_xor_recipe,
      message: "exactly one of food_id or recipe_id must be set"
    )
    |> unique_constraint(:position, name: :nutrition_meal_items_nutrition_meal_id_position_index)
  end

  @update_fields [:weight_g, :amount, :unit, :position]

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(meal_item, attrs) do
    meal_item
    |> cast(attrs, @update_fields)
    |> validate_number(:weight_g, greater_than: 0)
    |> unique_constraint(:position, name: :nutrition_meal_items_nutrition_meal_id_position_index)
  end

  defp validate_food_or_recipe(changeset) do
    food_id = get_field(changeset, :food_id)
    recipe_id = get_field(changeset, :recipe_id)

    cond do
      is_nil(food_id) and is_nil(recipe_id) ->
        add_error(changeset, :food_id, "either food_id or recipe_id must be present")

      not is_nil(food_id) and not is_nil(recipe_id) ->
        add_error(changeset, :recipe_id, "cannot set both food_id and recipe_id")

      true ->
        changeset
    end
  end

  @spec for_meal(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_meal(query \\ __MODULE__, meal_id) do
    from(m in query, where: m.nutrition_meal_id == ^meal_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(m in query, where: m.business_id == ^business_id)
  end

  @spec by_position(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_position(query \\ __MODULE__) do
    from(m in query, order_by: [asc: m.position, asc: m.inserted_at])
  end

  @spec include_food_and_recipe(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_food_and_recipe(query \\ __MODULE__, business_id) do
    food_query = Food.for_business_or_system(Food, business_id)

    recipe_query =
      from(r in Recipe.for_business(Recipe, business_id),
        preload: [recipe_ingredients: ^from(ri in RecipeIngredient, preload: [food: ^food_query])]
      )

    include_food_and_recipe(query, business_id, food_query, recipe_query)
  end

  @spec include_food_and_recipe(Ecto.Queryable.t(), String.t(), Ecto.Query.t(), Ecto.Query.t()) ::
          Ecto.Query.t()
  def include_food_and_recipe(query, business_id, food_query, recipe_query) do
    from(m in query,
      where: m.business_id == ^business_id,
      order_by: [asc: m.position, asc: m.inserted_at],
      preload: [food: ^food_query, recipe: ^recipe_query]
    )
  end
end
