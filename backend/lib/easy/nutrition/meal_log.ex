defmodule Easy.Nutrition.MealLog do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Nutrition.FoodLogEntry
  alias Easy.Nutrition.PlanItem
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "meal_logs" do
    field :date, :date
    field :meal_slot, :string
    field :planned_snapshot, :map
    field :planned_calories, :float
    field :logged_calories, :float, default: 0.0

    belongs_to :client, Client
    belongs_to :business, Orgs.Business

    has_many :food_log_entries, FoodLogEntry

    timestamps(type: :utc_datetime)
  end

  # Changesets

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:date, :meal_slot])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> validate_required([:date, :meal_slot, :business_id, :client_id])
    |> validate_inclusion(:meal_slot, PlanItem.meal_types())
    |> unique_constraint([:client_id, :date, :meal_slot],
      name: :meal_logs_client_id_date_meal_slot_index
    )
  end

  # Queries

  @spec for_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, client_id) do
    from(ml in query, where: ml.client_id == ^client_id)
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

  @spec for_meal_slot(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_meal_slot(query \\ __MODULE__, meal_slot) do
    from(ml in query, where: ml.meal_slot == ^meal_slot)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(ml in query, order_by: [asc: ml.date, asc: ml.meal_slot])
  end

  @spec with_entries(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_entries(query \\ __MODULE__) do
    entry_query =
      from(e in FoodLogEntry, order_by: [asc: e.planned_item_index, asc: e.inserted_at])

    from(ml in query, preload: [food_log_entries: ^entry_query])
  end
end
