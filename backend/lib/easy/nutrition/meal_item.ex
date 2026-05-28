defmodule Easy.Nutrition.MealItem do
  use Ecto.Schema

  alias Easy.Nutrition
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "meal_items" do
    field :weight_g, :float
    field :amount, :float
    field :unit, :string
    field :position, :integer, default: 0

    belongs_to :business, Orgs.Business
    belongs_to :recipe, Nutrition.Recipe
    belongs_to :food, Nutrition.Food
    belongs_to :meal, Nutrition.Meal

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:weight_g, :amount, :unit, :position, :recipe_id, :food_id]

  # Changesets

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(meal_id, business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:meal_id, meal_id)
    |> put_change(:business_id, business_id)
    |> validate_required([:meal_id, :business_id])
    |> validate_food_or_recipe()
    |> unique_constraint(:position, name: :meal_items_meal_id_position_index)
  end

  @update_fields [:weight_g, :amount, :unit, :position]

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(meal_item, attrs) do
    meal_item
    |> cast(attrs, @update_fields)
    |> unique_constraint(:position, name: :meal_items_meal_id_position_index)
  end

  defp validate_food_or_recipe(changeset) do
    food_id = get_field(changeset, :food_id)
    recipe_id = get_field(changeset, :recipe_id)

    if is_nil(food_id) and is_nil(recipe_id) do
      add_error(changeset, :food_id, "Either food_id or recipe_id must be present")
    else
      changeset
    end
  end

  # Queries

  @spec for_meal(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_meal(query \\ __MODULE__, meal_id) do
    from(m in query, where: m.meal_id == ^meal_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(m in query, where: m.business_id == ^business_id)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(m in query, order_by: [asc: m.position, asc: m.inserted_at])
  end

  @spec with_food_and_recipe(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_food_and_recipe(query \\ __MODULE__) do
    from(m in query, preload: [:food, :recipe])
  end
end
