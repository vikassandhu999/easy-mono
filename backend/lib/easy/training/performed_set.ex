defmodule Easy.Training.PerformedSet do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.Training.Exercise
  alias Easy.Training.WorkoutSession

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @set_types ~w(working warmup dropset)
  @load_units ~w(kg lbs bodyweight none)
  @distance_units ~w(meters km miles none)

  schema "training_performed_sets" do
    field :exercise_name, :string
    field :set_type, :string, default: "working"
    field :position, :integer, default: 0
    field :reps, :string
    field :load_value, :decimal
    field :load_unit, :string
    field :duration_seconds, :integer
    field :distance_value, :decimal
    field :distance_unit, :string
    field :rpe, :decimal
    field :completed, :boolean, default: false
    field :notes, :string

    belongs_to :session, WorkoutSession, foreign_key: :training_session_id
    belongs_to :exercise, Exercise
    belongs_to :business, Orgs.Business

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:exercise_name, :set_type, :position, :reps, :load_value, :load_unit,
                :duration_seconds, :distance_value, :distance_unit, :rpe, :completed, :notes,
                :exercise_id]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(session_id, business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:training_session_id, session_id)
    |> put_change(:business_id, business_id)
    |> validate_required([:training_session_id, :business_id, :set_type, :position])
    |> validate_inclusion(:set_type, @set_types)
    |> validate_inclusion(:load_unit, @load_units)
    |> validate_inclusion(:distance_unit, @distance_units)
    |> validate_number(:rpe, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
    |> unique_constraint([:training_session_id, :position],
      name: :training_performed_sets_training_session_id_position_index)
  end

  @update_fields [:exercise_name, :set_type, :position, :reps, :load_value, :load_unit,
                  :duration_seconds, :distance_value, :distance_unit, :rpe, :completed, :notes]

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(performed_set, attrs) do
    performed_set
    |> cast(attrs, @update_fields)
    |> validate_inclusion(:set_type, @set_types)
    |> validate_inclusion(:load_unit, @load_units)
    |> validate_inclusion(:distance_unit, @distance_units)
    |> validate_number(:rpe, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
    |> unique_constraint([:training_session_id, :position],
      name: :training_performed_sets_training_session_id_position_index)
  end

  @spec for_session(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_session(query \\ __MODULE__, session_id),
    do: from(s in query, where: s.training_session_id == ^session_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(s in query, where: s.business_id == ^business_id)

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__), do: from(s in query, order_by: [asc: s.position])
end
