defmodule Easy.Nutrition.FoodLogEntry do
  use Ecto.Schema

  alias Easy.Nutrition.Food
  alias Easy.Nutrition.MacroCalc
  alias Easy.Nutrition.MealLog
  alias Easy.Nutrition.Recipe
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @sources [:planned, :replacement, :unplanned]

  @spec sources() :: [atom()]
  def sources, do: @sources

  schema "food_log_entries" do
    field :food_name, :string
    field :amount, :float
    field :unit, :string
    field :weight_g, :float
    field :calories, :float
    field :protein_g, :float
    field :carbs_g, :float
    field :fat_g, :float
    field :notes, :string
    field :source, Ecto.Enum, values: @sources, default: :planned
    field :planned_item_index, :integer

    belongs_to :meal_log, MealLog
    belongs_to :food, Food
    belongs_to :recipe, Recipe

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :food_name,
    :amount,
    :unit,
    :weight_g,
    :notes,
    :source,
    :planned_item_index,
    :food_id,
    :recipe_id
  ]

  # Changesets

  @spec insert_changeset(String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(meal_log_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:meal_log_id, meal_log_id)
    |> validate_required([:source, :meal_log_id])
    |> validate_inclusion(:source, @sources)
    |> validate_food_or_recipe()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(entry, attrs) do
    entry
    |> cast(attrs, [:amount, :unit, :weight_g, :notes])
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

  # Queries

  @spec for_meal_log(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_meal_log(query \\ __MODULE__, meal_log_id) do
    from(e in query, where: e.meal_log_id == ^meal_log_id)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(e in query, order_by: [asc: e.planned_item_index, asc: e.inserted_at])
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id) do
    from(e in query,
      join: ml in MealLog,
      on: e.meal_log_id == ml.id,
      where: ml.business_id == ^business_id,
      where: ml.client_id == ^client_id
    )
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(e in query,
      join: ml in MealLog,
      on: e.meal_log_id == ml.id,
      where: ml.business_id == ^business_id
    )
  end

  @spec planned_indices(Ecto.Queryable.t()) :: Ecto.Query.t()
  def planned_indices(query \\ __MODULE__) do
    from(e in query,
      where: not is_nil(e.planned_item_index),
      select: e.planned_item_index
    )
  end

  # Actions

  @spec create(String.t(), String.t(), map()) ::
          {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(meal_log_id, business_id, attrs) do
    changeset = insert_changeset(meal_log_id, attrs)

    if changeset.valid? do
      changeset
      |> resolve_and_compute(business_id)
      |> validate_required([:food_name])
      |> Repo.insert()
    else
      {:error, %{changeset | action: :insert}}
    end
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(entry, attrs) do
    changeset = update_changeset(entry, attrs)
    weight_g = get_field(changeset, :weight_g)

    changeset
    |> maybe_recompute_macros(entry, weight_g)
    |> Repo.update()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(entry) do
    Repo.delete(entry)
  end

  # Macro computation

  defp resolve_and_compute(changeset, business_id) do
    food_id = get_field(changeset, :food_id)
    recipe_id = get_field(changeset, :recipe_id)
    weight_g = get_field(changeset, :weight_g) || 0.0

    cond do
      not is_nil(food_id) ->
        resolve_food(changeset, food_id, business_id, weight_g)

      not is_nil(recipe_id) ->
        resolve_recipe(changeset, recipe_id, business_id, weight_g)

      true ->
        changeset
    end
  end

  defp resolve_food(changeset, food_id, business_id, weight_g) do
    case Food |> Food.for_business_or_system(business_id) |> Repo.get(food_id) do
      nil ->
        add_error(changeset, :food_id, "food not found")

      food ->
        changeset
        |> put_change(:food_name, get_field(changeset, :food_name) || food.name)
        |> put_computed_macros(food.macros || %{}, weight_g, nil)
    end
  end

  defp resolve_recipe(changeset, recipe_id, business_id, weight_g) do
    case Recipe |> Recipe.for_business(business_id) |> Repo.get(recipe_id) do
      nil ->
        add_error(changeset, :recipe_id, "recipe not found")

      recipe ->
        changeset
        |> put_change(:food_name, get_field(changeset, :food_name) || recipe.name)
        |> put_computed_macros(recipe.macros || %{}, weight_g, recipe.cooked_weight_g)
    end
  end

  defp put_computed_macros(changeset, macros, weight_g, cooked_weight_g) do
    computed = MacroCalc.compute_all(macros, weight_g, cooked_weight_g)

    changeset
    |> put_change(:calories, computed.calories)
    |> put_change(:protein_g, computed.protein_g)
    |> put_change(:carbs_g, computed.carbs_g)
    |> put_change(:fat_g, computed.fat_g)
  end

  defp maybe_recompute_macros(changeset, entry, weight_g) do
    if get_change(changeset, :weight_g) do
      entry = Repo.preload(entry, [:food, :recipe])

      case {entry.food, entry.recipe} do
        {%Food{} = food, _} ->
          put_computed_macros(changeset, food.macros || %{}, weight_g, nil)

        {_, %Recipe{} = recipe} ->
          put_computed_macros(changeset, recipe.macros || %{}, weight_g, recipe.cooked_weight_g)

        _ ->
          # Food/recipe was deleted (FK set NULL) -- keep existing macros
          changeset
      end
    else
      changeset
    end
  end
end
