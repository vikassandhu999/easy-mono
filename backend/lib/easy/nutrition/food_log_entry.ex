defmodule Easy.Nutrition.FoodLogEntry do
  use Ecto.Schema

  alias Easy.Nutrition.Food
  alias Easy.Nutrition.MealLog
  alias Easy.Nutrition.Recipe

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @sources [:planned, :replacement, :unplanned]

  schema "nutrition_food_log_entries" do
    field :food_name, :string
    field :amount, :float
    field :unit, :string
    field :weight_g, :float
    field :calories, :float
    field :protein_g, :float
    field :carbs_g, :float
    field :fat_g, :float
    field :fiber_g, :float
    field :notes, :string
    field :source, Ecto.Enum, values: @sources, default: :planned
    field :planned_item_index, :integer

    belongs_to :meal_log, MealLog, foreign_key: :nutrition_meal_log_id
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

  @spec insert_changeset(String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(meal_log_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:nutrition_meal_log_id, meal_log_id)
    |> validate_required([:source, :nutrition_meal_log_id, :weight_g])
    |> validate_inclusion(:source, @sources)
    |> validate_number(:weight_g, greater_than: 0)
    |> validate_food_or_recipe()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(entry, attrs) do
    entry
    |> cast(attrs, [:amount, :unit, :weight_g, :notes])
    |> validate_number(:weight_g, greater_than: 0)
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

  @spec for_meal_log(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_meal_log(query \\ __MODULE__, meal_log_id) do
    from(e in query, where: e.nutrition_meal_log_id == ^meal_log_id)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(e in query, order_by: [asc: e.planned_item_index, asc: e.inserted_at])
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id) do
    from(e in query,
      join: ml in MealLog,
      on: e.nutrition_meal_log_id == ml.id,
      where: ml.business_id == ^business_id,
      where: ml.client_id == ^client_id
    )
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(e in query,
      join: ml in MealLog,
      on: e.nutrition_meal_log_id == ml.id,
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
end
