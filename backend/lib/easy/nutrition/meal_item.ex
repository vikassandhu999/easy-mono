defmodule Easy.Nutrition.MealItem do
  use Ecto.Schema

  alias Easy.Nutrition.{Food, Meal, Plan, Recipe, RecipeIngredient}
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @max_position 2_147_483_647
  @portion_kinds [:gram, :serving]

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_meal_items" do
    field :portion_kind, Ecto.Enum, values: @portion_kinds
    field :weight_g, :float
    field :amount, :float
    field :unit, :string
    field :serving_label, :string
    field :position, :integer
    field :calories, :float
    field :protein, :float
    field :carbohydrates, :float
    field :fat, :float
    field :fiber, :float
    field :complete, :boolean, default: false

    belongs_to :business, Orgs.Business
    belongs_to :plan, Plan, foreign_key: :nutrition_plan_id
    belongs_to :recipe, Recipe
    belongs_to :food, Food
    belongs_to :meal, Meal, foreign_key: :nutrition_meal_id

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :portion_kind,
    :weight_g,
    :amount,
    :unit,
    :serving_label,
    :position,
    :recipe_id,
    :food_id,
    :calories,
    :protein,
    :carbohydrates,
    :fat,
    :fiber,
    :complete
  ]

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, plan_id, meal_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:nutrition_plan_id, plan_id)
    |> put_change(:nutrition_meal_id, meal_id)
    |> validate_fields()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(meal_item, attrs) do
    meal_item
    |> cast(attrs, @cast_fields)
    |> validate_fields()
  end

  defp validate_fields(changeset) do
    changeset
    |> validate_required([:portion_kind, :position, :nutrition_meal_id, :nutrition_plan_id, :business_id])
    |> validate_number(:position, greater_than_or_equal_to: 0, less_than_or_equal_to: @max_position)
    |> validate_number(:weight_g, greater_than: 0)
    |> validate_number(:amount, greater_than: 0)
    |> validate_food_or_recipe()
    |> check_constraint(:food_id,
      name: :nutrition_meal_items_food_xor_recipe,
      message: "exactly one of food_id or recipe_id must be set"
    )
    |> check_constraint(:portion_kind, name: :nutrition_meal_items_portion_check)
    |> check_constraint(:position, name: :nutrition_meal_items_position_check)
    |> unique_constraint(:position, name: :nutrition_meal_items_nutrition_meal_id_position_index)
    |> foreign_key_constraint(:nutrition_meal_id, name: :nutrition_meal_items_meal_plan_business_id_fkey)
    |> foreign_key_constraint(:food_id, name: :nutrition_meal_items_food_id_fkey)
    |> foreign_key_constraint(:recipe_id, name: :nutrition_meal_items_recipe_id_fkey)
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
  def for_meal(query \\ __MODULE__, meal_id),
    do: from(item in query, where: item.nutrition_meal_id == ^meal_id)

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id),
    do: from(item in query, where: item.nutrition_plan_id == ^plan_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(item in query, where: item.business_id == ^business_id)

  @spec include_food_and_recipe(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_food_and_recipe(query \\ __MODULE__, business_id) do
    food_query = Food.for_business_or_system(Food, business_id)

    recipe_query =
      from(recipe in Recipe.for_business(Recipe, business_id),
        preload: [recipe_ingredients: ^from(ingredient in RecipeIngredient, preload: [food: ^food_query])]
      )

    from(item in query,
      where: item.business_id == ^business_id,
      order_by: [asc: item.position, asc: item.id],
      preload: [food: ^food_query, recipe: ^recipe_query]
    )
  end
end
