defmodule Easy.Nutrition.PlanDay do
  use Ecto.Schema

  alias Easy.Nutrition.DayMeal
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @days [:monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday]
  @day_names Enum.map(@days, &Atom.to_string/1)

  @spec days() :: [atom()]
  def days, do: @days

  @spec day_names() :: [String.t()]
  def day_names, do: @day_names

  schema "nutrition_plan_days" do
    field :name, :string
    field :position, :integer
    field :weekdays, {:array, :string}, default: []

    belongs_to :business, Orgs.Business
    belongs_to :plan, Easy.Nutrition.Plan, foreign_key: :nutrition_plan_id
    has_many :day_meals, DayMeal, foreign_key: :nutrition_plan_day_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, plan_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :position, :weekdays])
    |> put_change(:business_id, business_id)
    |> put_change(:nutrition_plan_id, plan_id)
    |> validate_required([:name, :position, :nutrition_plan_id, :business_id])
    |> validate_subset(:weekdays, @day_names)
    |> unique_constraint([:nutrition_plan_id, :position],
      name: :nutrition_plan_days_nutrition_plan_id_position_index
    )
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(day, attrs) do
    day
    |> cast(attrs, [:name])
    |> validate_required([:name])
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(d in query, where: d.business_id == ^business_id)
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id) do
    from(d in query, where: d.nutrition_plan_id == ^plan_id)
  end

  @spec for_weekday(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def for_weekday(query \\ __MODULE__, weekday)
  def for_weekday(query, nil), do: query
  def for_weekday(query, ""), do: query
  def for_weekday(query, weekday), do: from(d in query, where: ^weekday in d.weekdays)

  @spec by_position(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_position(query \\ __MODULE__) do
    from(d in query, order_by: [asc: d.position, asc: d.id])
  end

  @spec include_day_meals(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_day_meals(query \\ __MODULE__, business_id) do
    from(d in query,
      where: d.business_id == ^business_id,
      preload: [day_meals: ^DayMeal.include_meal(DayMeal.by_slot_position(), business_id)]
    )
  end
end
