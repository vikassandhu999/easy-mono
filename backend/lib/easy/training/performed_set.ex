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
    |> validate_required([:position, :exercise_id])
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
    reps = get_field(changeset, :actual_reps)
    duration = get_field(changeset, :duration_seconds)
    distance = get_field(changeset, :distance_value)

    if blank?(reps) and is_nil(duration) and is_nil(distance) do
      add_error(
        changeset,
        :actual_reps,
        "must have at least one metric: reps, duration, or distance"
      )
    else
      changeset
    end
  end

  defp blank?(nil), do: true
  defp blank?(""), do: true
  defp blank?(value) when is_binary(value), do: String.trim(value) == ""
  defp blank?(_), do: false

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

  defp check_workout_element_matches_session(changeset) do
    element_id = get_field(changeset, :workout_element_id)
    exercise_id = get_field(changeset, :exercise_id)
    session_id = get_field(changeset, :workout_session_id)
    business_id = get_field(changeset, :business_id)

    cond do
      is_nil(element_id) ->
        changeset

      is_nil(exercise_id) || is_nil(session_id) || is_nil(business_id) ->
        changeset

      workout_element_matches_session?(business_id, session_id, element_id, exercise_id) ->
        changeset

      true ->
        add_error(changeset, :workout_element_id, "must belong to the session workout")
    end
  end

  defp workout_element_matches_session?(business_id, session_id, element_id, exercise_id) do
    case WorkoutSession |> WorkoutSession.for_business(business_id) |> Repo.get(session_id) do
      nil ->
        false

      session ->
        if usable_snapshot?(session.planned_snapshot) do
          element_in_snapshot?(session.planned_snapshot, element_id, exercise_id)
        else
          element_in_session_workout?(business_id, session.workout_id, element_id, exercise_id)
        end
    end
  end

  defp usable_snapshot?(%{"elements" => elements}) when is_list(elements), do: true
  defp usable_snapshot?(_), do: false

  defp element_in_session_workout?(_business_id, nil, _element_id, _exercise_id), do: false

  defp element_in_session_workout?(business_id, workout_id, element_id, exercise_id) do
    WorkoutElement
    |> WorkoutElement.for_business(business_id)
    |> WorkoutElement.for_workout(workout_id)
    |> where([e], e.exercise_id == ^exercise_id)
    |> Repo.get(element_id)
    |> is_struct(WorkoutElement)
  end

  defp element_in_snapshot?(%{"elements" => elements}, element_id, exercise_id)
       when is_list(elements) do
    Enum.any?(elements, fn element ->
      element["element_id"] == element_id && element["exercise_id"] == exercise_id
    end)
  end

  defp element_in_snapshot?(_, _element_id, _exercise_id), do: false

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(s in query, where: s.business_id == ^business_id)
  end

  @spec for_session(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_session(query \\ __MODULE__, session_id) do
    from(s in query, where: s.workout_session_id == ^session_id)
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
    |> check_context()
    |> Repo.insert()
    |> preload_result()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(set, attrs) do
    update_changeset(set, attrs)
    |> check_context()
    |> Repo.update()
    |> preload_result()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(set), do: Repo.delete(set)

  defp check_context(%Ecto.Changeset{valid?: false} = changeset), do: changeset
  defp check_context(changeset), do: check_workout_element_matches_session(changeset)

  defp preload_result({:ok, record}), do: {:ok, Repo.preload(record, [:exercise])}
  defp preload_result(error), do: error
end
