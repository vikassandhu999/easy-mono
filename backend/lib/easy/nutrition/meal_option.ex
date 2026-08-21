defmodule Easy.Nutrition.MealOption do
  use Ecto.Schema

  alias Easy.Nutrition.{DayPattern, Meal, MealSlot, Plan}
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @slot_order MealSlot.names()

  schema "nutrition_meal_options" do
    field :meal_slot, Ecto.Enum, values: MealSlot.values()
    field :position, :integer

    belongs_to :business, Orgs.Business
    belongs_to :plan, Plan, foreign_key: :nutrition_plan_id
    belongs_to :day_pattern, DayPattern, foreign_key: :nutrition_day_pattern_id
    belongs_to :meal, Meal, foreign_key: :nutrition_meal_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, plan_id, day_pattern_id, meal_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:meal_slot, :position])
    |> put_change(:business_id, business_id)
    |> put_change(:nutrition_plan_id, plan_id)
    |> put_change(:nutrition_day_pattern_id, day_pattern_id)
    |> put_change(:nutrition_meal_id, meal_id)
    |> validate_fields()
  end

  defp validate_fields(changeset) do
    changeset
    |> validate_required([
      :meal_slot,
      :position,
      :nutrition_meal_id,
      :nutrition_day_pattern_id,
      :nutrition_plan_id,
      :business_id
    ])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> check_constraint(:meal_slot, name: :nutrition_meal_options_meal_slot_check)
    |> check_constraint(:position, name: :nutrition_meal_options_position_check)
    |> unique_constraint(:position, name: :nutrition_meal_options_pattern_slot_position_index)
    |> unique_constraint(:nutrition_meal_id, name: :nutrition_meal_options_pattern_slot_meal_index)
    |> foreign_key_constraint(:nutrition_day_pattern_id,
      name: :nutrition_meal_options_pattern_plan_business_id_fkey
    )
    |> foreign_key_constraint(:nutrition_meal_id, name: :nutrition_meal_options_meal_plan_business_id_fkey)
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id),
    do: from(option in query, where: option.nutrition_plan_id == ^plan_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(option in query, where: option.business_id == ^business_id)

  @spec by_slot_position(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_slot_position(query \\ __MODULE__) do
    from(option in query,
      order_by: [
        asc: fragment("array_position(?::text[], ?)", ^@slot_order, option.meal_slot),
        asc: option.position,
        asc: option.id
      ]
    )
  end
end
