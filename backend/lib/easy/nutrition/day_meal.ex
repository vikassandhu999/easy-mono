defmodule Easy.Nutrition.DayMeal do
  use Ecto.Schema

  alias Easy.Nutrition.Meal
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @meal_slots [:breakfast, :morning_snack, :lunch, :afternoon_snack, :dinner, :evening_snack]

  @spec meal_slots() :: [atom()]
  def meal_slots, do: @meal_slots

  schema "nutrition_day_meals" do
    field :meal_slot, Ecto.Enum, values: @meal_slots
    field :position, :integer

    belongs_to :business, Orgs.Business
    belongs_to :plan_day, Easy.Nutrition.PlanDay, foreign_key: :nutrition_plan_day_id
    belongs_to :meal, Meal, foreign_key: :nutrition_meal_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, plan_day_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:meal_slot, :position, :nutrition_meal_id])
    |> put_change(:business_id, business_id)
    |> put_change(:nutrition_plan_day_id, plan_day_id)
    |> validate_required([:meal_slot, :position, :nutrition_meal_id, :nutrition_plan_day_id, :business_id])
    |> unique_constraint([:nutrition_plan_day_id, :meal_slot, :position],
      name: :nutrition_day_meals_day_slot_position_index
    )
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(dm in query, where: dm.business_id == ^business_id)
  end

  @spec for_plan_day(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan_day(query \\ __MODULE__, plan_day_id) do
    from(dm in query, where: dm.nutrition_plan_day_id == ^plan_day_id)
  end

  @spec for_meal_slot(Ecto.Queryable.t(), atom() | String.t() | nil) :: Ecto.Query.t()
  def for_meal_slot(query \\ __MODULE__, meal_slot)
  def for_meal_slot(query, nil), do: query
  def for_meal_slot(query, meal_slot), do: from(dm in query, where: dm.meal_slot == ^meal_slot)

  @spec by_slot_position(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_slot_position(query \\ __MODULE__) do
    from(dm in query, order_by: [asc: dm.meal_slot, asc: dm.position])
  end

  @spec include_meal(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_meal(query \\ __MODULE__, business_id) do
    from(dm in query,
      where: dm.business_id == ^business_id,
      preload: [meal: ^Meal.include_items(Meal, business_id)]
    )
  end
end
