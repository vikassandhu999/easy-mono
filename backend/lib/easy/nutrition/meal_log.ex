defmodule Easy.Nutrition.MealLog do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Nutrition.FoodLogEntry
  alias Easy.Nutrition.PlanItem
  alias Easy.Orgs
  alias Easy.Repo

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

  # Actions

  @spec find_or_create(String.t(), String.t(), Date.t(), String.t(), map() | nil) ::
          {:ok, t()} | {:error, Ecto.Changeset.t()}
  def find_or_create(business_id, client_id, date, meal_slot, snapshot \\ nil) do
    case get_existing(business_id, client_id, date, meal_slot) do
      %__MODULE__{} = existing ->
        {:ok, existing}

      nil ->
        attrs = %{date: date, meal_slot: meal_slot}
        planned_cal = snapshot && snapshot[:total_calories]

        changeset =
          insert_changeset(business_id, client_id, attrs)
          |> put_change(:planned_snapshot, snapshot)
          |> put_change(:planned_calories, planned_cal && planned_cal * 1.0)

        case Repo.insert(changeset) do
          {:ok, meal_log} ->
            {:ok, meal_log}

          {:error, %{errors: errors} = changeset} ->
            if has_unique_violation?(errors) do
              case get_existing(business_id, client_id, date, meal_slot) do
                %__MODULE__{} = existing -> {:ok, existing}
                nil -> {:error, changeset}
              end
            else
              {:error, changeset}
            end
        end
    end
  end

  @spec recalculate_logged_calories!(t()) :: t()
  def recalculate_logged_calories!(%__MODULE__{} = meal_log) do
    {1, [%{logged_calories: total}]} =
      from(ml in __MODULE__,
        where: ml.id == ^meal_log.id,
        select: %{
          logged_calories:
            fragment(
              "(SELECT coalesce(sum(calories), 0.0) FROM food_log_entries WHERE meal_log_id = ?)",
              ml.id
            )
        },
        update: [
          set: [
            logged_calories:
              fragment(
                "(SELECT coalesce(sum(calories), 0.0) FROM food_log_entries WHERE meal_log_id = ?)",
                ml.id
              )
          ]
        ]
      )
      |> Repo.update_all([], returning: [:logged_calories])

    %{meal_log | logged_calories: total}
  end

  defp get_existing(business_id, client_id, date, meal_slot) do
    __MODULE__
    |> for_business(business_id)
    |> for_client(client_id)
    |> for_date(date)
    |> for_meal_slot(meal_slot)
    |> Repo.one()
  end

  defp has_unique_violation?(errors) do
    Enum.any?(errors, fn {_field, {_msg, meta}} ->
      Keyword.get(meta, :constraint) == :unique
    end)
  end
end
