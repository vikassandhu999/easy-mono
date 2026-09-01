defmodule Easy.Nutrition.WeekSchedule do
  use Ecto.Schema

  alias Easy.Nutrition.{DayPattern, Plan}
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @weekdays [:monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday]
  @weekday_order Enum.map(@weekdays, &Atom.to_string/1)

  schema "nutrition_week_schedule" do
    field :weekday, Ecto.Enum, values: @weekdays

    belongs_to :business, Orgs.Business
    belongs_to :plan, Plan, foreign_key: :nutrition_plan_id
    belongs_to :day_pattern, DayPattern, foreign_key: :nutrition_day_pattern_id

    timestamps(type: :utc_datetime)
  end

  @spec weekdays() :: [atom()]
  def weekdays, do: @weekdays

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, plan_id, day_pattern_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:weekday])
    |> put_change(:business_id, business_id)
    |> put_change(:nutrition_plan_id, plan_id)
    |> put_change(:nutrition_day_pattern_id, day_pattern_id)
    |> validate_required([:weekday, :business_id, :nutrition_plan_id, :nutrition_day_pattern_id])
    |> check_constraint(:weekday, name: :nutrition_week_schedule_weekday_check)
    |> unique_constraint(:weekday, name: :nutrition_week_schedule_nutrition_plan_id_weekday_index)
    |> foreign_key_constraint(:nutrition_plan_id, name: :nutrition_week_schedule_plan_business_id_fkey)
    |> foreign_key_constraint(:nutrition_day_pattern_id,
      name: :nutrition_week_schedule_pattern_plan_business_id_fkey
    )
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id),
    do: from(row in query, where: row.nutrition_plan_id == ^plan_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(row in query, where: row.business_id == ^business_id)

  @spec by_weekday(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_weekday(query \\ __MODULE__) do
    from(row in query,
      order_by: [
        asc: fragment("array_position(?::text[], ?)", ^@weekday_order, row.weekday),
        asc: row.id
      ]
    )
  end
end
