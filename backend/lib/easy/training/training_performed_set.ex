defmodule Easy.Training.TrainingPerformedSet do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.SetVocab
  alias Easy.Training.TrainingExercise
  alias Easy.Training.TrainingSession

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "training_performed_sets" do
    field :exercise_name, :string
    field :set_type, Ecto.Enum, values: SetVocab.set_types(), default: :working
    field :position, :integer, default: 0
    field :planned_exercise_index, :integer
    field :reps, :string
    field :load_value, :decimal
    field :load_unit, Ecto.Enum, values: SetVocab.load_units()
    field :duration_seconds, :integer
    field :distance_value, :decimal
    field :distance_unit, Ecto.Enum, values: SetVocab.distance_units()
    field :rpe, :decimal
    field :completed, :boolean, default: false
    field :notes, :string

    belongs_to :session, TrainingSession, foreign_key: :training_session_id
    belongs_to :exercise, TrainingExercise
    belongs_to :swapped_from_exercise, TrainingExercise, foreign_key: :swapped_from_exercise_id
    belongs_to :business, Orgs.Business

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :exercise_name,
    :set_type,
    :position,
    :planned_exercise_index,
    :reps,
    :load_value,
    :load_unit,
    :duration_seconds,
    :distance_value,
    :distance_unit,
    :rpe,
    :completed,
    :notes,
    :exercise_id,
    :swapped_from_exercise_id
  ]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, session_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:training_session_id, session_id)
    |> put_change(:business_id, business_id)
    |> validate_required([:training_session_id, :business_id, :set_type, :position])
    |> validate_set()
    |> foreign_key_constraint(:swapped_from_exercise_id)
  end

  @update_fields [
    :exercise_name,
    :set_type,
    :position,
    :planned_exercise_index,
    :reps,
    :load_value,
    :load_unit,
    :duration_seconds,
    :distance_value,
    :distance_unit,
    :rpe,
    :completed,
    :notes
  ]

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(performed_set, attrs) do
    performed_set
    |> cast(attrs, @update_fields)
    |> validate_set()
  end

  defp validate_set(changeset) do
    changeset
    |> validate_number(:rpe, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
    |> validate_number(:planned_exercise_index, greater_than_or_equal_to: 0)
  end

  @spec for_session(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_session(query \\ __MODULE__, session_id),
    do: from(s in query, where: s.training_session_id == ^session_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(s in query, where: s.business_id == ^business_id)

  @spec by_position(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_position(query \\ __MODULE__), do: from(s in query, order_by: [asc: s.position, asc: s.id])

  @spec include_exercise(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_exercise(query, business_id) do
    exercise_query = TrainingExercise |> TrainingExercise.for_business_or_system(business_id)
    from(s in query, preload: [exercise: ^exercise_query])
  end
end
