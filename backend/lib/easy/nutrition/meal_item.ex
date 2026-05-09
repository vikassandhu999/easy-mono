defmodule Easy.Nutrition.MealItem do
  use Ecto.Schema

  alias Easy.Nutrition
  alias Easy.Orgs
  alias Easy.Repo

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

  defp next_position(business_id, meal_id) do
    query =
      __MODULE__
      |> for_business(business_id)
      |> for_meal(meal_id)
      |> select([m], max(m.position))

    case Repo.one(query) do
      nil -> 0
      max -> max + 1
    end
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(m in query, order_by: [asc: m.position, asc: m.inserted_at])
  end

  @spec with_food_and_recipe(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_food_and_recipe(query \\ __MODULE__) do
    from(m in query, preload: [:food, :recipe])
  end

  # Actions

  @spec create(String.t(), String.t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(meal_id, business_id, attrs) do
    insert_changeset(meal_id, business_id, attrs)
    |> maybe_put_next_position(business_id, meal_id, attrs)
    |> Repo.insert()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(meal_item, attrs) do
    update_changeset(meal_item, attrs)
    |> Repo.update()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(meal_item) do
    Repo.delete(meal_item)
  end

  defp maybe_put_next_position(changeset, business_id, meal_id, attrs) do
    if changeset.valid? and not position_present?(attrs) do
      put_change(changeset, :position, next_position(business_id, meal_id))
    else
      changeset
    end
  end

  defp position_present?(attrs) do
    Map.has_key?(attrs, "position") or Map.has_key?(attrs, :position)
  end
end
