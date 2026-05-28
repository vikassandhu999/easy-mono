defmodule Easy.Training.WorkoutSession do
  use Ecto.Schema

  alias Easy.Clients
  alias Easy.Orgs
  alias Easy.Training.{Workout, PerformedSet}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @states [:active, :completed, :discarded]

  @spec states() :: [atom()]
  def states, do: @states

  schema "workout_sessions" do
    field :started_at, :utc_datetime_usec
    field :ended_at, :utc_datetime_usec
    field :state, Ecto.Enum, values: @states, default: :active
    field :soreness_rating, :integer
    field :notes, :string
    field :planned_snapshot, :map

    belongs_to :client, Clients.Client
    belongs_to :business, Orgs.Business
    belongs_to :workout, Workout

    has_many :performed_sets, PerformedSet, on_delete: :delete_all

    timestamps(type: :utc_datetime_usec)
  end

  @cast_fields [:ended_at, :state, :soreness_rating, :notes, :workout_id]
  @update_fields [:ended_at, :state, :soreness_rating, :notes, :workout_id]
  @client_update_fields [:soreness_rating, :notes]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> put_change(:started_at, DateTime.utc_now())
    |> validate_required([:state, :started_at])
    |> validate_length(:notes, max: 5000)
    |> validate_number(:soreness_rating, greater_than_or_equal_to: 1, less_than_or_equal_to: 5)
    |> validate_end_after_start()
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:workout_id)
    |> unique_constraint([:business_id, :client_id],
      name: :workout_sessions_one_active_per_client_index,
      message: "you already have an active workout session — finish or discard it first"
    )
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(session, attrs) do
    session
    |> cast(attrs, @update_fields)
    |> validate_length(:notes, max: 5000)
    |> validate_number(:soreness_rating, greater_than_or_equal_to: 1, less_than_or_equal_to: 5)
    |> validate_end_after_start()
    |> unique_constraint([:business_id, :client_id],
      name: :workout_sessions_one_active_per_client_index,
      message: "you already have an active workout session — finish or discard it first"
    )
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

  @spec with_sets(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def with_sets(query, business_id) do
    set_query =
      PerformedSet
      |> PerformedSet.for_business(business_id)
      |> PerformedSet.ordered()
      |> PerformedSet.with_exercise(business_id)

    from(s in query, preload: [performed_sets: ^set_query])
  end
end
