defmodule Easy.Training.WorkoutSession do
  use Ecto.Schema

  alias Easy.Clients
  alias Easy.Orgs
  alias Easy.Repo
  alias Easy.Training.{PlannedWorkout, PerformedSet}

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

    belongs_to :client, Clients.Client
    belongs_to :business, Orgs.Business
    belongs_to :planned_workout, PlannedWorkout

    has_many :performed_sets, PerformedSet, on_delete: :delete_all

    timestamps(type: :utc_datetime_usec)
  end

  @cast_fields [:started_at, :ended_at, :state, :soreness_rating, :notes, :planned_workout_id]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> validate_required([:state, :started_at, :client_id, :business_id])
    |> validate_length(:notes, max: 5000)
    |> validate_number(:soreness_rating, greater_than_or_equal_to: 1, less_than_or_equal_to: 5)
    |> validate_end_after_start()
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:planned_workout_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(session, attrs) do
    session
    |> cast(attrs, @cast_fields)
    |> validate_length(:notes, max: 5000)
    |> validate_number(:soreness_rating, greater_than_or_equal_to: 1, less_than_or_equal_to: 5)
    |> validate_end_after_start()
    |> foreign_key_constraint(:planned_workout_id)
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
    from(s in query, order_by: [desc: s.started_at])
  end

  @spec with_sets(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_sets(query \\ __MODULE__) do
    set_query = PerformedSet |> PerformedSet.ordered() |> PerformedSet.with_exercise()
    from(s in query, preload: [performed_sets: ^set_query])
  end

  @spec create(String.t(), String.t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(business_id, client_id, attrs) do
    attrs =
      attrs
      |> Enum.into(%{}, fn {key, value} -> {to_string(key), value} end)
      |> Map.put("started_at", DateTime.utc_now())

    insert_changeset(business_id, client_id, attrs)
    |> Repo.insert()
    |> preload_result()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(session, attrs) do
    update_changeset(session, attrs)
    |> Repo.update()
    |> preload_result()
  end

  @spec complete(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def complete(session, attrs \\ %{}) do
    attrs =
      attrs
      |> Enum.into(%{}, fn {key, value} -> {to_string(key), value} end)
      |> Map.merge(%{"ended_at" => DateTime.utc_now(), "state" => :completed})

    update_changeset(session, attrs)
    |> Repo.update()
    |> preload_result()
  end

  @spec discard(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def discard(session) do
    update_changeset(session, %{"state" => :discarded})
    |> Repo.update()
    |> preload_result()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(session), do: Repo.delete(session)

  defp preload_result({:ok, record}), do: {:ok, Repo.preload(record, performed_sets: [:exercise])}
  defp preload_result(error), do: error
end
