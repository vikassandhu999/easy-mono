defmodule Easy.Training.TrainingSession do
  use Ecto.Schema

  alias Easy.Clients
  alias Easy.Orgs
  alias Easy.Training.TrainingPerformedSet

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @kinds [:planned, :freestyle]
  @states [:active, :completed, :discarded]

  schema "training_sessions" do
    field :kind, Ecto.Enum, values: @kinds
    field :state, Ecto.Enum, values: @states, default: :active
    field :date, :date
    field :started_at, :utc_datetime
    field :closed_at, :utc_datetime
    field :ended_at, :utc_datetime, virtual: true
    field :planned_snapshot, :map, virtual: true
    field :notes, :string
    field :soreness_rating, :integer
    field :snapshot_version, :integer
    field :prescription_snapshot, :map
    field :source_plan_id, :binary_id
    field :source_workout_id, :binary_id
    field :training_workout_id, :binary_id, virtual: true

    belongs_to :client, Clients.Client
    belongs_to :business, Orgs.Business
    has_many :performed_sets, TrainingPerformedSet, foreign_key: :training_session_id

    timestamps(type: :utc_datetime)
  end

  @spec kinds() :: [atom()]
  def kinds, do: @kinds

  @spec states() :: [atom()]
  def states, do: @states

  @spec active_metadata_changeset(t(), map()) :: Ecto.Changeset.t()
  def active_metadata_changeset(session, attrs) do
    session
    |> cast(attrs, [:notes, :soreness_rating])
    |> validate_length(:notes, max: 5000)
    |> validate_number(:soreness_rating, greater_than_or_equal_to: 1, less_than_or_equal_to: 5)
    |> check_constraint(:soreness_rating, name: :training_sessions_soreness_rating_check)
  end

  @spec insert_changeset(String.t(), String.t(), map(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, start, attrs) when is_map(start) do
    %__MODULE__{}
    |> cast(attrs, [:notes, :soreness_rating])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> put_change(:kind, Map.fetch!(start, :kind))
    |> put_change(:state, :active)
    |> put_change(:date, Map.fetch!(start, :date))
    |> put_change(:started_at, Map.fetch!(start, :started_at))
    |> put_change(:snapshot_version, Map.get(start, :snapshot_version))
    |> put_change(:prescription_snapshot, Map.get(start, :prescription_snapshot))
    |> put_change(:source_plan_id, Map.get(start, :source_plan_id))
    |> put_change(:source_workout_id, Map.get(start, :source_workout_id))
    |> validate_required([:kind, :state, :date, :started_at, :business_id, :client_id])
    |> active_metadata_validations()
    |> unique_constraint(:client_id, name: :training_sessions_one_active_client_index)
    |> check_constraint(:kind, name: :training_sessions_kind_check)
    |> check_constraint(:state, name: :training_sessions_state_check)
    |> check_constraint(:state, name: :training_sessions_closing_check)
    |> check_constraint(:prescription_snapshot, name: :training_sessions_snapshot_check)
    |> check_constraint(:started_at, name: :training_sessions_chronology_check)
    |> foreign_key_constraint(:client_id, name: :training_sessions_client_business_id_fkey)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(session, attrs) do
    session
    |> cast(attrs, [:state, :ended_at, :notes, :soreness_rating])
    |> put_closed_at_from_legacy()
    |> active_metadata_validations()
  end

  @spec update_changeset(t(), map(), :client) :: Ecto.Changeset.t()
  def update_changeset(session, attrs, :client), do: active_metadata_changeset(session, attrs)

  defp put_closed_at_from_legacy(changeset) do
    case get_change(changeset, :ended_at) do
      nil -> changeset
      ended_at -> put_change(changeset, :closed_at, ended_at)
    end
  end

  defp active_metadata_validations(changeset) do
    changeset
    |> validate_length(:notes, max: 5000)
    |> validate_number(:soreness_rating, greater_than_or_equal_to: 1, less_than_or_equal_to: 5)
    |> check_constraint(:soreness_rating, name: :training_sessions_soreness_rating_check)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(session in query, where: session.business_id == ^business_id)

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id),
    do: from(session in query, where: session.business_id == ^business_id and session.client_id == ^client_id)

  @spec for_state(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def for_state(query \\ __MODULE__, state)
  def for_state(query, nil), do: query
  def for_state(query, ""), do: query
  def for_state(query, state), do: from(session in query, where: session.state == ^state)

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__),
    do: from(session in query, order_by: [desc: session.started_at, desc: session.id])

  @spec include_sets(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_sets(query \\ __MODULE__, business_id) do
    set_query =
      TrainingPerformedSet
      |> TrainingPerformedSet.for_business(business_id)
      |> TrainingPerformedSet.by_position()
      |> TrainingPerformedSet.include_exercise(business_id)

    from(session in query, preload: [performed_sets: ^set_query])
  end

  @spec for_date_range(Ecto.Queryable.t(), Date.t(), Date.t()) :: Ecto.Query.t()
  def for_date_range(query \\ __MODULE__, start_date, end_date),
    do: from(session in query, where: session.date >= ^start_date and session.date <= ^end_date)

  @spec for_date_from(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def for_date_from(query \\ __MODULE__, start_date),
    do: from(session in query, where: session.date >= ^start_date)

  @spec for_date_to(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def for_date_to(query \\ __MODULE__, end_date),
    do: from(session in query, where: session.date <= ^end_date)
end
