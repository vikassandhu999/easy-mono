defmodule Easy.Nutrition.MealLog do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Nutrition.FoodLogEntry
  alias Easy.Nutrition.Meal
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_meal_logs" do
    field(:date, :date)

    field(:meal_slot, Ecto.Enum,
      values: [
        :breakfast,
        :morning_snack,
        :lunch,
        :afternoon_snack,
        :dinner,
        :evening_snack
      ]
    )

    field(:planned_snapshot, :map)
    field(:planned_calories, :float)
    field(:logged_calories, :float, default: 0.0)

    belongs_to(:client, Client)
    belongs_to(:business, Orgs.Business)
    belongs_to(:meal, Meal, foreign_key: :nutrition_meal_id)

    has_many(:food_log_entries, FoodLogEntry, foreign_key: :nutrition_meal_log_id)

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:date, :meal_slot])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> validate_required([:date, :meal_slot, :business_id, :client_id])
    |> unique_constraint([:client_id, :date, :meal_slot],
      name: :nutrition_meal_logs_client_id_date_meal_slot_index
    )
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id) do
    from(ml in query, where: ml.business_id == ^business_id and ml.client_id == ^client_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(ml in query, where: ml.business_id == ^business_id)
  end

  @spec for_date(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def for_date(query \\ __MODULE__, date) do
    from(ml in query, where: ml.date == ^date)
  end

  @spec for_date_range(Ecto.Queryable.t(), Date.t(), Date.t()) :: Ecto.Query.t()
  def for_date_range(query \\ __MODULE__, from_date, to_date) do
    from(ml in query, where: ml.date >= ^from_date and ml.date <= ^to_date)
  end

  @valid_meal_slots ~w(breakfast morning_snack lunch afternoon_snack dinner evening_snack)

  @spec for_meal_slot(Ecto.Queryable.t(), atom() | String.t() | nil) :: Ecto.Query.t()
  def for_meal_slot(query \\ __MODULE__, meal_slot)
  def for_meal_slot(query, nil), do: query
  def for_meal_slot(query, ""), do: query

  def for_meal_slot(query, meal_slot) when is_binary(meal_slot) do
    if meal_slot in @valid_meal_slots do
      from(ml in query, where: ml.meal_slot == ^meal_slot)
    else
      from(ml in query, where: false)
    end
  end

  def for_meal_slot(query, meal_slot), do: from(ml in query, where: ml.meal_slot == ^meal_slot)

  @spec oldest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def oldest(query \\ __MODULE__) do
    from(ml in query, order_by: [asc: ml.date, asc: ml.meal_slot])
  end

  @spec include_entries(Ecto.Queryable.t()) :: Ecto.Query.t()
  def include_entries(query \\ __MODULE__) do
    from(ml in query, preload: [food_log_entries: ^FoodLogEntry.by_position()])
  end
end
