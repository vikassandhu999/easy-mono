defmodule Easy.Nutrition.Meal do
  use Ecto.Schema

  alias Easy.Nutrition.Food
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @meal_slots [:breakfast, :morning_snack, :lunch, :afternoon_snack, :dinner, :evening_snack]

  schema "nutrition_meals" do
    field :name, :string
    field :notes, :string
    field :default_meal_slot, Ecto.Enum, values: @meal_slots

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business
    belongs_to :plan, Easy.Nutrition.Plan, foreign_key: :nutrition_plan_id
    has_many :meal_items, Easy.Nutrition.MealItem, foreign_key: :nutrition_meal_id

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:name, :notes, :default_meal_slot]

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, creator_id, plan_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, creator_id)
    |> put_change(:nutrition_plan_id, plan_id)
    |> validate_required([:name, :nutrition_plan_id, :business_id, :creator_id])
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(meal, attrs) do
    meal
    |> cast(attrs, @cast_fields)
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id) do
    from(m in query, where: m.nutrition_plan_id == ^plan_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(m in query, where: m.business_id == ^business_id)
  end

  @spec oldest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def oldest(query \\ __MODULE__) do
    from(m in query, order_by: [asc: m.inserted_at, asc: m.id])
  end

  @spec include_items(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_items(query \\ __MODULE__, business_id) do
    food_query = Food.for_business_or_system(Food, business_id)

    recipe_query =
      from(r in Recipe.for_business(Recipe, business_id),
        preload: [recipe_ingredients: ^from(ri in RecipeIngredient, preload: [food: ^food_query])]
      )

    from(m in query,
      where: m.business_id == ^business_id,
      order_by: [asc: m.inserted_at],
      preload: [meal_items: ^MealItem.include_food_and_recipe(MealItem, business_id, food_query, recipe_query)]
    )
  end
end
