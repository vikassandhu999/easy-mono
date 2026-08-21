defmodule Easy.Nutrition.Meal do
  use Ecto.Schema

  alias Easy.Nutrition.{MealItem, Plan}
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @max_position 2_147_483_647

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_meals" do
    field :name, :string
    field :notes, :string
    field :position, :integer

    belongs_to :business, Orgs.Business
    belongs_to :plan, Plan, foreign_key: :nutrition_plan_id
    has_many :meal_items, MealItem, foreign_key: :nutrition_meal_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, plan_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :notes, :position])
    |> put_change(:business_id, business_id)
    |> put_change(:nutrition_plan_id, plan_id)
    |> validate_fields()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(meal, attrs) do
    meal
    |> cast(attrs, [:name, :notes, :position])
    |> validate_fields()
  end

  defp validate_fields(changeset) do
    changeset
    |> update_change(:name, &Easy.Utils.trim/1)
    |> validate_required([:name, :position, :nutrition_plan_id, :business_id])
    |> validate_length(:name, max: 255)
    |> validate_number(:position, greater_than_or_equal_to: 0, less_than_or_equal_to: @max_position)
    |> check_constraint(:position, name: :nutrition_meals_position_check)
    |> unique_constraint(:position, name: :nutrition_meals_nutrition_plan_id_position_index)
    |> foreign_key_constraint(:nutrition_plan_id, name: :nutrition_meals_plan_business_id_fkey)
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id),
    do: from(meal in query, where: meal.nutrition_plan_id == ^plan_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(meal in query, where: meal.business_id == ^business_id)

  @spec by_position(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_position(query \\ __MODULE__),
    do: from(meal in query, order_by: [asc: meal.position, asc: meal.id])

  @spec include_items(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_items(query \\ __MODULE__, business_id) do
    item_query =
      MealItem
      |> MealItem.for_business(business_id)
      |> MealItem.include_food_and_recipe(business_id)

    from(meal in query,
      where: meal.business_id == ^business_id,
      order_by: [asc: meal.position, asc: meal.id],
      preload: [meal_items: ^item_query]
    )
  end

  @spec include_logging_items(Ecto.Queryable.t()) :: Ecto.Query.t()
  def include_logging_items(query \\ __MODULE__) do
    from(meal in query,
      left_join: item in assoc(meal, :meal_items),
      on: item.business_id == meal.business_id,
      left_join: food in assoc(item, :food),
      on: is_nil(food.business_id) or food.business_id == meal.business_id,
      left_join: recipe in assoc(item, :recipe),
      on: recipe.business_id == meal.business_id,
      order_by: [asc: meal.position, asc: meal.id, asc: item.position, asc: item.id],
      preload: [meal_items: {item, food: food, recipe: recipe}]
    )
  end
end
