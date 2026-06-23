defmodule Easy.Training.TrainingPlan do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Orgs
  alias Easy.Training.{ScheduleEntry, TrainingWorkout}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @plan_statuses [:active, :archived]

  @spec statuses() :: [atom()]
  def statuses, do: @plan_statuses

  @cast_fields [:name, :description, :status, :start_date, :end_date]

  schema "training_plans" do
    field :name, :string
    field :description, :string
    field :status, Ecto.Enum, values: @plan_statuses, default: :active
    field :start_date, :date
    field :end_date, :date

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    belongs_to :source_template, __MODULE__, foreign_key: :source_template_id
    has_many :workouts, TrainingWorkout, foreign_key: :training_plan_id
    has_many :plan_items, ScheduleEntry, foreign_key: :training_plan_id

    timestamps(type: :utc_datetime)
  end

  @spec create_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def create_changeset(business_id, creator_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, creator_id)
    |> validate_fields()
    |> constrain_relationships()
    |> exclusion_constraint(:start_date,
      name: :training_plans_no_overlapping_active,
      message: "overlaps an existing active plan for this client")
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(plan, attrs) do
    plan
    |> cast(attrs, @cast_fields)
    |> validate_fields()
    |> constrain_relationships()
    |> exclusion_constraint(:start_date,
      name: :training_plans_no_overlapping_active,
      message: "overlaps an existing active plan for this client")
  end

  defp validate_fields(changeset) do
    changeset
    |> validate_required([:name])
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 5000)
    |> validate_date_range()
    |> check_constraint(:start_date,
      name: :valid_date_range,
      message: "end date must be after start date"
    )
    |> check_constraint(:start_date,
      name: :assigned_plans_have_dates,
      message: "assigned plans must have start and end dates"
    )
  end

  defp constrain_relationships(changeset) do
    changeset
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:creator_id)
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:source_template_id)
  end

  def validate_date_range(changeset) do
    start_date = get_field(changeset, :start_date)
    end_date = get_field(changeset, :end_date)
    client_id = get_field(changeset, :client_id)

    cond do
      is_nil(client_id) ->
        changeset

      is_nil(start_date) || is_nil(end_date) ->
        changeset
        |> add_error(:start_date, "assigned plan must have a start date")
        |> add_error(:end_date, "assigned plan must have an end date")

      Date.compare(end_date, start_date) == :lt ->
        add_error(changeset, :end_date, "must be after or equal to start date")

      true ->
        changeset
    end
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(t in query, where: t.business_id == ^business_id)
  end

  @spec for_client(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, client_id)
  def for_client(query, nil), do: query
  def for_client(query, client_id), do: from(t in query, where: t.client_id == ^client_id)

  @spec templates(Ecto.Queryable.t()) :: Ecto.Query.t()
  def templates(query \\ __MODULE__) do
    from(t in query, where: is_nil(t.client_id))
  end

  @spec with_status(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def with_status(query \\ __MODULE__, status)
  def with_status(query, nil), do: query
  def with_status(query, status), do: from(t in query, where: t.status == ^status)

  @spec for_search(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def for_search(query \\ __MODULE__, term)
  def for_search(query, nil), do: query
  def for_search(query, ""), do: query
  def for_search(query, term), do: from(t in query, where: ilike(t.name, ^"%#{term}%"))

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(t in query, order_by: [desc: t.inserted_at, desc: t.id])
  end

  @spec active_for_client(Ecto.Queryable.t(), String.t(), Date.t()) :: Ecto.Query.t()
  def active_for_client(query \\ __MODULE__, client_id, date) do
    from(t in query,
      where: t.client_id == ^client_id,
      where: t.status == :active,
      where: t.start_date <= ^date,
      where: t.end_date >= ^date
    )
  end

  @spec with_workouts(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def with_workouts(query, business_id) do
    workout_query =
      TrainingWorkout
      |> TrainingWorkout.for_business(business_id)
      |> TrainingWorkout.ordered()
      |> TrainingWorkout.with_elements(business_id)

    from(t in query, preload: [workouts: ^workout_query])
  end

  @spec with_plan_items(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def with_plan_items(query, business_id) do
    item_query = ScheduleEntry |> ScheduleEntry.for_business(business_id)
    from(t in query, preload: [plan_items: ^item_query])
  end
end
