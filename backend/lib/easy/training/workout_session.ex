defmodule Easy.Training.WorkoutSession do
  use Ecto.Schema

  alias Easy.Clients
  alias Easy.Orgs
  alias Easy.Training.{TrainingWorkout, PerformedSet, ScheduleEntry}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @states [:active, :completed, :discarded]

  @spec states() :: [atom()]
  def states, do: @states

  schema "training_sessions" do
    field :date, :date
    field :started_at, :utc_datetime
    field :ended_at, :utc_datetime
    field :state, Ecto.Enum, values: @states, default: :active
    field :soreness_rating, :integer
    field :notes, :string
    field :planned_snapshot, :map

    belongs_to :client, Clients.Client
    belongs_to :business, Orgs.Business
    belongs_to :workout, TrainingWorkout, foreign_key: :training_workout_id
    belongs_to :schedule_entry, ScheduleEntry, foreign_key: :training_schedule_entry_id
    has_many :performed_sets, PerformedSet, foreign_key: :training_session_id

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:date, :ended_at, :state, :soreness_rating, :notes]
  @update_fields [:ended_at, :state, :soreness_rating, :notes]
  @client_update_fields [:soreness_rating, :notes]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> put_change(:training_workout_id, Map.get(attrs, :training_workout_id) || Map.get(attrs, "training_workout_id"))
    |> put_change(:training_schedule_entry_id, Map.get(attrs, :training_schedule_entry_id) || Map.get(attrs, "training_schedule_entry_id"))
    |> put_change(:planned_snapshot, Map.get(attrs, :planned_snapshot) || Map.get(attrs, "planned_snapshot"))
    |> put_change(:started_at, DateTime.utc_now() |> DateTime.truncate(:second))
    |> validate_required([:state, :started_at])
    |> validate_length(:notes, max: 5000)
    |> validate_number(:soreness_rating, greater_than_or_equal_to: 1, less_than_or_equal_to: 5)
    |> validate_end_after_start()
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:training_workout_id)
    |> foreign_key_constraint(:training_schedule_entry_id)
    |> unique_constraint(:client_id,
      name: :training_sessions_active_client_index,
      message: "you already have an active workout session — finish or discard it first")
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(session, attrs) do
    session
    |> cast(attrs, @update_fields)
    |> validate_length(:notes, max: 5000)
    |> validate_number(:soreness_rating, greater_than_or_equal_to: 1, less_than_or_equal_to: 5)
    |> validate_end_after_start()
  end

  @spec client_update_changeset(t(), map()) :: Ecto.Changeset.t()
  def client_update_changeset(session, attrs) do
    session
    |> cast(attrs, @client_update_fields)
    |> validate_length(:notes, max: 5000)
    |> validate_number(:soreness_rating, greater_than_or_equal_to: 1, less_than_or_equal_to: 5)
  end

  defp validate_end_after_start(changeset) do
    started_at = get_field(changeset, :started_at)
    ended_at = get_field(changeset, :ended_at)

    if started_at && ended_at && DateTime.compare(ended_at, started_at) == :lt do
      add_error(changeset, :ended_at, "must be after started_at")
    else
      changeset
    end
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(s in query, where: s.business_id == ^business_id)
  end

  @spec for_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, client_id) do
    from(s in query, where: s.client_id == ^client_id)
  end

  @spec with_state(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def with_state(query \\ __MODULE__, state)
  def with_state(query, nil), do: query
  def with_state(query, state), do: from(s in query, where: s.state == ^state)

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(s in query, order_by: [desc: s.started_at, desc: s.id])
  end

  @spec active(Ecto.Queryable.t()) :: Ecto.Query.t()
  def active(query \\ __MODULE__) do
    from(s in query, where: s.state == :active)
  end

  @spec with_sets(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_sets(query \\ __MODULE__) do
    from(s in query, preload: [performed_sets: ^PerformedSet.ordered()])
  end

  @spec for_date_range(Ecto.Queryable.t(), Date.t(), Date.t()) :: Ecto.Query.t()
  def for_date_range(query \\ __MODULE__, start_date, end_date) do
    from(s in query,
      where: s.date >= ^start_date,
      where: s.date <= ^end_date
    )
  end
end
