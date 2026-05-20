defmodule Easy.Training.WorkoutSession do
  use Ecto.Schema

  alias Easy.Clients
  alias Easy.Orgs
  alias Easy.Repo
  alias Easy.Training.{Workout, WorkoutElement, PerformedSet}

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
  @update_fields [:ended_at, :state, :soreness_rating, :notes]
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

  @spec with_sets(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_sets(query \\ __MODULE__) do
    set_query = PerformedSet |> PerformedSet.ordered() |> PerformedSet.with_exercise()
    from(s in query, preload: [performed_sets: ^set_query])
  end

  @spec ensure_no_active(String.t(), String.t()) :: :ok | {:error, Easy.Error.t()}
  def ensure_no_active(business_id, client_id) do
    exists =
      __MODULE__
      |> for_business(business_id)
      |> for_client(client_id)
      |> with_state(:active)
      |> Repo.exists?()

    if exists do
      {:error,
       Easy.Error.unprocessable(%{
         session: ["you already have an active workout session — finish or discard it first"]
       })}
    else
      :ok
    end
  end

  @spec create(String.t(), String.t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(business_id, client_id, attrs) do
    insert_changeset(business_id, client_id, attrs)
    |> maybe_put_snapshot(business_id)
    |> Repo.insert()
    |> preload_result()
  end

  defp maybe_put_snapshot(changeset, business_id) do
    case get_field(changeset, :workout_id) do
      nil ->
        changeset

      workout_id ->
        case build_snapshot(business_id, workout_id) do
          nil -> add_error(changeset, :workout_id, "does not exist")
          snapshot -> put_change(changeset, :planned_snapshot, snapshot)
        end
    end
  end

  @spec build_snapshot(String.t(), String.t()) :: map() | nil
  defp build_snapshot(business_id, workout_id) do
    element_query = WorkoutElement |> WorkoutElement.ordered() |> WorkoutElement.with_exercise()

    Workout
    |> Workout.for_business(business_id)
    |> Repo.get(workout_id)
    |> case do
      nil ->
        nil

      workout ->
        workout = Repo.preload(workout, workout_elements: element_query)

        %{
          "workout_name" => workout.name,
          "elements" => Enum.map(workout.workout_elements, &WorkoutElement.to_snapshot/1)
        }
    end
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(session, attrs) do
    update_changeset(session, attrs)
    |> Repo.update()
    |> preload_result()
  end

  @spec client_update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def client_update(session, attrs) do
    client_update_changeset(session, attrs)
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
