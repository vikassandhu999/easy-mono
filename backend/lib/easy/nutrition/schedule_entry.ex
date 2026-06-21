defmodule Easy.Nutrition.ScheduleEntry do
  use Ecto.Schema

  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @days ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  @meal_slots [
    "breakfast",
    "morning_snack",
    "lunch",
    "afternoon_snack",
    "dinner",
    "evening_snack"
  ]

  @spec meal_slots() :: [String.t()]
  def meal_slots, do: @meal_slots

  @spec days() :: [String.t()]
  def days, do: @days

  schema "nutrition_schedule_entries" do
    field :day_of_week, :string
    field :meal_slot, :string

    belongs_to :business, Orgs.Business
    belongs_to :meal, Easy.Nutrition.Meal, foreign_key: :nutrition_meal_id
    belongs_to :plan, Easy.Nutrition.Plan, foreign_key: :nutrition_plan_id

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:day_of_week, :meal_slot, :nutrition_meal_id]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(plan_id, business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:nutrition_plan_id, plan_id)
    |> put_change(:business_id, business_id)
    |> validate_required([:day_of_week, :meal_slot, :nutrition_meal_id, :nutrition_plan_id, :business_id])
    |> validate_inclusion(:day_of_week, @days)
    |> validate_inclusion(:meal_slot, @meal_slots)
    |> unique_constraint([:nutrition_plan_id, :day_of_week, :meal_slot],
      name: :nutrition_schedule_entries_nutrition_plan_id_day_of_week_meal_s
    )
  end

  @update_fields [:day_of_week, :meal_slot]

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(entry, attrs) do
    entry
    |> cast(attrs, @update_fields)
    |> validate_inclusion(:day_of_week, @days)
    |> validate_inclusion(:meal_slot, @meal_slots)
    |> unique_constraint([:nutrition_plan_id, :day_of_week, :meal_slot],
      name: :nutrition_schedule_entries_nutrition_plan_id_day_of_week_meal_s
    )
  end

  @spec for_meal_slot(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_meal_slot(query \\ __MODULE__, meal_slot) do
    from(p in query, where: p.meal_slot == ^meal_slot)
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id) do
    from(p in query, where: p.nutrition_plan_id == ^plan_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(p in query, where: p.business_id == ^business_id)
  end

  @spec for_day(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_day(query \\ __MODULE__, day) do
    from(p in query, where: p.day_of_week == ^day)
  end
end
