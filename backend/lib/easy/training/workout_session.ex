defmodule Easy.Training.WorkoutSession do
  use Ecto.Schema

  alias Easy.Clients
  alias Easy.Orgs
  alias Easy.Repo
  alias Easy.Training.{PlannedWorkout, WorkoutElement, PerformedSet}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @states [:active, :completed, :discarded]
  @moods [:tough, :solid, :strong]

  @spec states() :: [atom()]
  def states, do: @states

  @spec moods() :: [atom()]
  def moods, do: @moods

  schema "workout_sessions" do
    field :started_at, :utc_datetime_usec
    field :ended_at, :utc_datetime_usec
    field :state, Ecto.Enum, values: @states, default: :active
    field :soreness_rating, :integer
    field :mood, Ecto.Enum, values: @moods
    field :notes, :string
    field :planned_snapshot, :map

    belongs_to :client, Clients.Client
    belongs_to :business, Orgs.Business
    belongs_to :planned_workout, PlannedWorkout

    has_many :performed_sets, PerformedSet, on_delete: :delete_all

    timestamps(type: :utc_datetime_usec)
  end

  @cast_fields [
    :started_at,
    :ended_at,
    :state,
    :soreness_rating,
    :mood,
    :notes,
    :planned_workout_id
  ]

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

  @spec for_planned_workout(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_planned_workout(query \\ __MODULE__, planned_workout_id) do
    from(s in query, where: s.planned_workout_id == ^planned_workout_id)
  end

  @spec exclude(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def exclude(query \\ __MODULE__, session_id) do
    from(s in query, where: s.id != ^session_id)
  end

  @spec started_between(Ecto.Queryable.t(), DateTime.t(), DateTime.t()) :: Ecto.Query.t()
  def started_between(query \\ __MODULE__, from_dt, to_dt) do
    from(s in query, where: s.started_at >= ^from_dt and s.started_at < ^to_dt)
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(s in query, order_by: [desc: s.started_at])
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

  @spec accessible?(String.t(), String.t()) :: boolean()
  def accessible?(business_id, session_id) do
    __MODULE__
    |> for_business(business_id)
    |> Repo.get(session_id)
    |> is_struct(__MODULE__)
  end

  @spec accessible_workout?(String.t(), String.t() | nil) :: boolean()
  def accessible_workout?(_business_id, nil), do: true
  def accessible_workout?(_business_id, ""), do: true

  def accessible_workout?(business_id, planned_workout_id) do
    PlannedWorkout
    |> PlannedWorkout.for_business(business_id)
    |> Repo.get(planned_workout_id)
    |> is_struct(PlannedWorkout)
  end

  @spec create(String.t(), String.t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(business_id, client_id, attrs) do
    attrs =
      attrs
      |> Enum.into(%{}, fn {key, value} -> {to_string(key), value} end)
      |> Map.put("started_at", DateTime.utc_now())

    changeset = insert_changeset(business_id, client_id, attrs)

    changeset
    |> maybe_put_snapshot()
    |> Repo.insert()
    |> preload_result()
  end

  defp maybe_put_snapshot(changeset) do
    case get_field(changeset, :planned_workout_id) do
      nil -> changeset
      workout_id -> put_change(changeset, :planned_snapshot, build_snapshot(workout_id))
    end
  end

  @spec build_snapshot(String.t()) :: map()
  defp build_snapshot(workout_id) do
    element_query = WorkoutElement |> WorkoutElement.ordered() |> WorkoutElement.with_exercise()

    workout =
      PlannedWorkout
      |> Repo.get(workout_id)
      |> Repo.preload(workout_elements: element_query)

    case workout do
      nil ->
        nil

      workout ->
        %{
          "workout_name" => workout.name,
          "day_number" => workout.day_number,
          "elements" =>
            Enum.map(workout.workout_elements, fn element ->
              %{
                "element_id" => element.id,
                "position" => element.position,
                "superset_group_id" => element.superset_group_id,
                "notes" => element.notes,
                "exercise_id" => element.exercise_id,
                "exercise_name" => element.exercise.name,
                "planned_sets" =>
                  Enum.map(element.planned_sets, fn set ->
                    %{
                      "set_type" => set.set_type && Atom.to_string(set.set_type),
                      "target_reps" => set.target_reps,
                      "load_value" => set.load_value && Decimal.to_string(set.load_value),
                      "load_unit" => set.load_unit && Atom.to_string(set.load_unit),
                      "rest_seconds" => set.rest_seconds,
                      "duration_seconds" => set.duration_seconds,
                      "distance_value" =>
                        set.distance_value && Decimal.to_string(set.distance_value),
                      "distance_unit" => set.distance_unit && Atom.to_string(set.distance_unit),
                      "intensity_target" => set.intensity_target,
                      "tempo" => set.tempo,
                      "notes" => set.notes
                    }
                  end)
              }
            end)
        }
    end
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
