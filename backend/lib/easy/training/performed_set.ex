defmodule Easy.Training.PerformedSet do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.Repo
  alias Easy.Training.{WorkoutSession, WorkoutElement, Exercise}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "performed_sets" do
    field :position, :integer
    field :actual_reps, :string
    field :load_value, :decimal

    field :load_unit, Ecto.Enum,
      values: [:kg, :lbs, :bodyweight, :percent_1rm, :rpe, :none],
      default: :none

    field :intensity_felt, :string
    field :rpe, :decimal
    field :rir, :integer
    field :duration_seconds, :integer
    field :distance_value, :decimal
    field :distance_unit, Ecto.Enum, values: [:meters, :km, :miles, :yards, :none], default: :none
    field :tempo_actual, :string
    field :completed, :boolean, default: true
    field :notes, :string

    belongs_to :workout_session, WorkoutSession
    belongs_to :workout_element, WorkoutElement
    belongs_to :exercise, Exercise
    belongs_to :business, Orgs.Business

    timestamps(type: :utc_datetime_usec)
  end

  @cast_fields [
    :position,
    :actual_reps,
    :load_value,
    :load_unit,
    :intensity_felt,
    :rpe,
    :rir,
    :duration_seconds,
    :distance_value,
    :distance_unit,
    :tempo_actual,
    :completed,
    :notes,
    :exercise_id,
    :workout_element_id
  ]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(workout_session_id, business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:workout_session_id, workout_session_id)
    |> put_change(:business_id, business_id)
    |> validate_required([:position, :workout_session_id, :exercise_id, :business_id])
    |> validate_length(:notes, max: 5000)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> validate_number(:rpe, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
    |> validate_number(:rir, greater_than_or_equal_to: 0)
    |> validate_number(:duration_seconds, greater_than_or_equal_to: 0)
    |> validate_at_least_one_performance_metric()
    |> validate_load_requires_unit()
    |> validate_distance_requires_unit()
    |> unique_constraint([:workout_session_id, :position],
      name: :performed_sets_workout_session_id_position_index,
      message: "position already exists in this workout session"
    )
    |> foreign_key_constraint(:workout_session_id)
    |> foreign_key_constraint(:workout_element_id)
    |> foreign_key_constraint(:exercise_id)
    |> foreign_key_constraint(:business_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(set, attrs) do
    set
    |> cast(attrs, @cast_fields)
    |> validate_length(:notes, max: 5000)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> validate_number(:rpe, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
    |> validate_number(:rir, greater_than_or_equal_to: 0)
    |> validate_number(:duration_seconds, greater_than_or_equal_to: 0)
    |> validate_at_least_one_performance_metric()
    |> validate_load_requires_unit()
    |> validate_distance_requires_unit()
    |> unique_constraint([:workout_session_id, :position],
      name: :performed_sets_workout_session_id_position_index,
      message: "position already exists in this workout session"
    )
    |> foreign_key_constraint(:workout_session_id)
    |> foreign_key_constraint(:workout_element_id)
    |> foreign_key_constraint(:exercise_id)
    |> foreign_key_constraint(:business_id)
  end

  defp validate_at_least_one_performance_metric(changeset) do
    has_reps = get_field(changeset, :actual_reps)
    has_duration = get_field(changeset, :duration_seconds)
    has_distance = get_field(changeset, :distance_value)

    if !has_reps && !has_duration && !has_distance do
      add_error(
        changeset,
        :actual_reps,
        "must have at least one metric: reps, duration, or distance"
      )
    else
      changeset
    end
  end

  defp validate_load_requires_unit(changeset) do
    load = get_field(changeset, :load_value)
    unit = get_field(changeset, :load_unit)

    if load && (!unit || unit == :none) do
      add_error(changeset, :load_unit, "required when load_value is set")
    else
      changeset
    end
  end

  defp validate_distance_requires_unit(changeset) do
    distance = get_field(changeset, :distance_value)
    unit = get_field(changeset, :distance_unit)

    if distance && (!unit || unit == :none) do
      add_error(changeset, :distance_unit, "required when distance_value is set")
    else
      changeset
    end
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(s in query, where: s.business_id == ^business_id)
  end

  @spec for_session(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_session(query \\ __MODULE__, session_id) do
    from(s in query, where: s.workout_session_id == ^session_id)
  end

  @spec for_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, client_id) do
    from(s in query,
      join: ws in assoc(s, :workout_session),
      as: :session,
      where: ws.client_id == ^client_id
    )
  end

  @spec for_element(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_element(query \\ __MODULE__, element_id) do
    from(s in query, where: s.workout_element_id == ^element_id)
  end

  @spec for_exercise(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_exercise(query \\ __MODULE__, exercise_id) do
    from(s in query, where: s.exercise_id == ^exercise_id)
  end

  @spec in_completed_sessions(Ecto.Queryable.t()) :: Ecto.Query.t()
  def in_completed_sessions(query \\ __MODULE__) do
    if has_named_binding?(query, :session) do
      from([session: ws] in query, where: ws.state == ^:completed)
    else
      from(s in query,
        join: ws in assoc(s, :workout_session),
        as: :session,
        where: ws.state == ^:completed
      )
    end
  end

  @spec with_kg_load(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_kg_load(query \\ __MODULE__) do
    from(s in query, where: not is_nil(s.load_value) and s.load_unit == ^:kg)
  end

  @spec heaviest_first(Ecto.Queryable.t()) :: Ecto.Query.t()
  def heaviest_first(query \\ __MODULE__) do
    from(s in query, order_by: [desc: s.load_value])
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(s in query, order_by: [asc: s.position])
  end

  @spec with_exercise(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_exercise(query \\ __MODULE__) do
    from(s in query, preload: [:exercise])
  end

  @spec create(String.t(), String.t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(workout_session_id, business_id, attrs) do
    insert_changeset(workout_session_id, business_id, attrs)
    |> Repo.insert()
    |> preload_result()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(set, attrs) do
    update_changeset(set, attrs)
    |> Repo.update()
    |> preload_result()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(set), do: Repo.delete(set)

  defp preload_result({:ok, record}), do: {:ok, Repo.preload(record, [:exercise])}
  defp preload_result(error), do: error
end
