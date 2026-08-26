defmodule Easy.Training.TrainingPerformedSet do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.SetVocab
  alias Easy.Training.{TrainingExercise, TrainingSession}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "training_performed_sets" do
    field :position, :integer
    field :exercise_name, :string
    field :snapshot_exercise_ref, :string
    field :set_type, Ecto.Enum, values: SetVocab.set_types(), default: :working
    field :reps, :string
    field :load_value, :decimal
    field :load_unit, Ecto.Enum, values: SetVocab.load_units()
    field :duration_seconds, :integer
    field :distance_value, :decimal
    field :distance_unit, Ecto.Enum, values: SetVocab.distance_units()
    field :rpe, :decimal
    field :notes, :string

    belongs_to :session, TrainingSession, foreign_key: :training_session_id
    belongs_to :exercise, TrainingExercise
    belongs_to :business, Orgs.Business

    timestamps(type: :utc_datetime)
  end

  @create_fields [
    :exercise_name,
    :snapshot_exercise_ref,
    :set_type,
    :reps,
    :load_value,
    :load_unit,
    :duration_seconds,
    :distance_value,
    :distance_unit,
    :rpe,
    :notes,
    :exercise_id
  ]

  @measurement_fields [
    :set_type,
    :reps,
    :load_value,
    :load_unit,
    :duration_seconds,
    :distance_value,
    :distance_unit,
    :rpe,
    :notes
  ]

  @spec insert_changeset(String.t(), String.t(), non_neg_integer(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, session_id, position, attrs) do
    %__MODULE__{}
    |> cast(attrs, @create_fields)
    |> put_change(:training_session_id, session_id)
    |> put_change(:business_id, business_id)
    |> put_change(:position, position)
    |> validate_fields()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(performed_set, attrs) do
    performed_set
    |> cast(attrs, @measurement_fields)
    |> validate_fields()
  end

  defp validate_fields(changeset) do
    changeset
    |> update_change(:exercise_name, &Easy.Utils.trim/1)
    |> validate_required([:position, :exercise_name, :set_type, :training_session_id, :business_id])
    |> validate_length(:notes, max: 5000)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> validate_number(:rpe, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
    |> check_constraint(:position, name: :training_performed_sets_position_check)
    |> check_constraint(:exercise_name, name: :training_performed_sets_exercise_name_check)
    |> unique_constraint(:position, name: :training_performed_sets_training_session_id_position_index)
    |> foreign_key_constraint(:training_session_id,
      name: :training_performed_sets_session_business_id_fkey
    )
    |> foreign_key_constraint(:exercise_id)
  end

  @spec for_session(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_session(query \\ __MODULE__, session_id),
    do: from(set in query, where: set.training_session_id == ^session_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(set in query, where: set.business_id == ^business_id)

  @spec by_position(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_position(query \\ __MODULE__),
    do: from(set in query, order_by: [asc: set.position, asc: set.id])

  @spec include_exercise(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_exercise(query, business_id) do
    exercise_query = TrainingExercise.for_business_or_system(TrainingExercise, business_id)
    from(set in query, preload: [exercise: ^exercise_query])
  end
end
