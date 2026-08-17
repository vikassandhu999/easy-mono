defmodule Easy.Nutrition.DayPattern do
  use Ecto.Schema

  alias Easy.Nutrition.{MealOption, Plan, WeekSchedule}
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_day_patterns" do
    field :name, :string
    field :position, :integer
    field :weekdays, {:array, :string}, virtual: true, default: []

    belongs_to :business, Orgs.Business
    belongs_to :plan, Plan, foreign_key: :nutrition_plan_id
    has_many :meal_options, MealOption, foreign_key: :nutrition_day_pattern_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, plan_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :position])
    |> put_change(:business_id, business_id)
    |> put_change(:nutrition_plan_id, plan_id)
    |> validate_fields()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(pattern, attrs) do
    pattern
    |> cast(attrs, [:name, :position])
    |> validate_fields()
  end

  defp validate_fields(changeset) do
    changeset
    |> update_change(:name, &Easy.Utils.trim/1)
    |> validate_required([:name, :position, :nutrition_plan_id, :business_id])
    |> validate_length(:name, max: 255)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> check_constraint(:position, name: :nutrition_day_patterns_position_check)
    |> unique_constraint(:position, name: :nutrition_day_patterns_nutrition_plan_id_position_index)
    |> foreign_key_constraint(:nutrition_plan_id, name: :nutrition_day_patterns_plan_business_id_fkey)
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id),
    do: from(pattern in query, where: pattern.nutrition_plan_id == ^plan_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(pattern in query, where: pattern.business_id == ^business_id)

  @spec by_position(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_position(query \\ __MODULE__),
    do: from(pattern in query, order_by: [asc: pattern.position, asc: pattern.id])

  @spec include_options(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_options(query \\ __MODULE__, business_id) do
    option_query =
      MealOption
      |> MealOption.for_business(business_id)
      |> MealOption.by_slot_position()

    from(pattern in query,
      where: pattern.business_id == ^business_id,
      preload: [meal_options: ^option_query]
    )
  end

  @spec weekdays_for(t(), [WeekSchedule.t()]) :: [String.t()]
  def weekdays_for(%__MODULE__{id: id}, schedule) when is_list(schedule) do
    for %WeekSchedule{nutrition_day_pattern_id: ^id, weekday: weekday} <- schedule,
        do: Atom.to_string(weekday)
  end
end
