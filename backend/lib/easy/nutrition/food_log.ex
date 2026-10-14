defmodule Easy.Nutrition.FoodLog do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  alias Easy.Nutrition.{Food, FoodServing, Values}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  schema "food_logs" do
    field :amount, :float
    field :unit, :string
    field :position, :integer
    field :name, :string
    field :kind, Ecto.Enum, values: [:food, :supplement]
    field :basis, Ecto.Enum, values: [:"100g", :"100ml", :"1unit"]
    field :unit_label, :string
    field :nutrients, :map
    embeds_many :servings, FoodServing, on_replace: :delete
    belongs_to :business, Easy.Orgs.Business
    belongs_to :nutrition_log, Easy.Nutrition.NutritionLog
    belongs_to :meal_item, Easy.Nutrition.MealItem
    belongs_to :food, Food
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), Food.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, parent_id, food, attrs) do
    %__MODULE__{}
    |> change(business_id: business_id, nutrition_log_id: parent_id, food_id: food.id)
    |> change(Map.take(food, [:name, :kind, :basis, :unit_label, :nutrients]))
    |> put_embed(:servings, food.servings)
    |> update_changeset(attrs)
  end

  @spec update_changeset(t() | Ecto.Changeset.t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs) do
    row
    |> cast(attrs, [:amount, :unit, :position, :meal_item_id])
    |> validate_required([:business_id, :nutrition_log_id, :food_id, :name, :kind, :basis, :amount, :unit, :position])
    |> validate_number(:amount, greater_than: 0)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> foreign_key_constraint(:food_id, name: :food_logs_food_id_business_id_fkey)
    |> foreign_key_constraint(:nutrition_log_id, name: :food_logs_nutrition_log_id_business_id_fkey)
    |> foreign_key_constraint(:meal_item_id, name: :food_logs_meal_item_id_business_id_fkey)
    |> unique_constraint(:meal_item_id, name: :food_logs_prescribed_item)
    |> check_constraint(:amount, name: :food_logs_values)
    |> check_constraint(:meal_item_id, name: :food_logs_prescribed_option)
    |> check_constraint(:nutrition_log_id, name: :nutrition_logs_items_valid)
  end

  @spec nutrient_values(t()) :: map()
  def nutrient_values(row) do
    {:ok, factor} = Food.factor(row, row.amount, row.unit)
    Values.scale(row.nutrients, factor)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id), do: from(f in query, where: f.business_id == ^business_id)

  @spec for_log(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_log(query \\ __MODULE__, business_id, id),
    do: from(f in query, where: f.business_id == ^business_id and f.nutrition_log_id == ^id)
end
