defmodule Easy.Nutrition.WeekdayAssignment do
  use Ecto.Schema

  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @days [:monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday]

  @spec days() :: [atom()]
  def days, do: @days

  schema "nutrition_weekday_assignments" do
    field :day_of_week, Ecto.Enum, values: @days

    belongs_to :business, Orgs.Business
    belongs_to :plan, Easy.Nutrition.Plan, foreign_key: :nutrition_plan_id
    belongs_to :plan_day, Easy.Nutrition.PlanDay, foreign_key: :nutrition_plan_day_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, plan_id, plan_day_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:day_of_week])
    |> put_change(:business_id, business_id)
    |> put_change(:nutrition_plan_id, plan_id)
    |> put_change(:nutrition_plan_day_id, plan_day_id)
    |> validate_required([:day_of_week, :nutrition_plan_id, :nutrition_plan_day_id, :business_id])
    |> unique_constraint([:nutrition_plan_id, :day_of_week],
      name: :nutrition_weekday_assignments_plan_day_of_week_index
    )
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(wa in query, where: wa.business_id == ^business_id)
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id) do
    from(wa in query, where: wa.nutrition_plan_id == ^plan_id)
  end

  @spec for_day(Ecto.Queryable.t(), atom() | String.t()) :: Ecto.Query.t()
  def for_day(query \\ __MODULE__, day) do
    from(wa in query, where: wa.day_of_week == ^day)
  end
end
