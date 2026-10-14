defmodule Easy.Nutrition.NutritionLog do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  alias Easy.Nutrition.{FoodLog, MealOption, NutritionPreset, NutritionSchedule}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  schema "nutrition_logs" do
    field :type, Ecto.Enum, values: [:meal, :food, :supplement]
    field :logged_on, :date
    field :logged_at, :time
    field :recorded_by, :binary_id
    field :scheduled_date, :date
    belongs_to :business, Easy.Orgs.Business
    belongs_to :client, Easy.Clients.Client
    belongs_to :nutrition_schedule, NutritionSchedule
    belongs_to :nutrition_preset, NutritionPreset
    belongs_to :meal_option, MealOption
    has_many :food_logs, FoodLog, preload_order: [asc: :position, asc: :id]
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, recorded_by, client_id, attrs) do
    %__MODULE__{}
    |> change(business_id: business_id, client_id: client_id, recorded_by: recorded_by)
    |> put_change(:id, Ecto.UUID.generate())
    |> update_changeset(attrs)
  end

  @spec update_changeset(t() | Ecto.Changeset.t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs) do
    row
    |> cast(attrs, [:logged_on, :logged_at])
    |> validate_required([:business_id, :client_id, :recorded_by, :logged_on])
    |> unique_constraint(:nutrition_schedule_id, name: :nutrition_logs_current_occurrence)
    |> foreign_key_constraint(:nutrition_schedule_id,
      name: :nutrition_logs_nutrition_schedule_id_client_id_business_id_fkey
    )
    |> foreign_key_constraint(:nutrition_preset_id,
      name: :nutrition_logs_nutrition_preset_id_client_id_business_id_fkey
    )
    |> foreign_key_constraint(:meal_option_id,
      name: :nutrition_logs_meal_option_id_nutrition_preset_id_business_id_fkey
    )
    |> check_constraint(:type, name: :nutrition_logs_occurrence)
    |> check_constraint(:food_logs, name: :nutrition_logs_items_valid)
    |> foreign_key_constraint(:nutrition_schedule_id, name: :nutrition_logs_schedule_preset)
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id),
    do: from(l in query, where: l.business_id == ^business_id and l.client_id == ^client_id)

  @spec for_date(Ecto.Queryable.t(), Date.t() | nil) :: Ecto.Queryable.t()
  def for_date(query \\ __MODULE__, date)
  def for_date(query, nil), do: query
  def for_date(query, date), do: from(l in query, where: l.logged_on == ^date)

  @spec by_time(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_time(query \\ __MODULE__),
    do: from(l in query, order_by: [asc: l.logged_on, asc_nulls_last: l.logged_at, asc: l.id])

  @spec include_food_logs(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_food_logs(query \\ __MODULE__, business_id),
    do: from(l in query, preload: [food_logs: ^FoodLog.for_business(business_id)])
end
