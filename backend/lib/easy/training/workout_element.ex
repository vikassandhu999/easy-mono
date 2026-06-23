defmodule Easy.Training.WorkoutElement do
  use Ecto.Schema
  alias Easy.Orgs
  alias Easy.Training.{Exercise, PlannedSet, Workout}
  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "training_workout_exercises" do
    field :position, :integer, default: 0
    field :superset_group_id, :string
    field :notes, :string

    embeds_many :planned_sets, PlannedSet, on_replace: :delete

    belongs_to :business, Orgs.Business
    belongs_to :workout, Workout, foreign_key: :training_workout_id
    belongs_to :exercise, Exercise

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:position, :superset_group_id, :notes, :exercise_id]

  @spec copy_attrs(t()) :: map()
  def copy_attrs(%__MODULE__{} = element) do
    %{
      position: element.position,
      superset_group_id: element.superset_group_id,
      notes: element.notes,
      exercise_id: element.exercise_id,
      planned_sets: Enum.map(element.planned_sets, &PlannedSet.to_attrs/1)
    }
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(workout_id, business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:training_workout_id, workout_id)
    |> put_change(:business_id, business_id)
    |> validate_required([:training_workout_id, :business_id, :exercise_id])
    |> cast_embed(:planned_sets, with: &PlannedSet.changeset/2)
    |> unique_constraint([:training_workout_id, :position],
      name: :training_workout_exercises_training_workout_id_position_index)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(element, attrs) do
    element
    |> cast(attrs, [:position, :superset_group_id, :notes, :exercise_id])
    |> cast_embed(:planned_sets, with: &PlannedSet.changeset/2)
    |> unique_constraint([:training_workout_id, :position],
      name: :training_workout_exercises_training_workout_id_position_index)
  end

  @spec for_workout(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_workout(query \\ __MODULE__, workout_id),
    do: from(e in query, where: e.training_workout_id == ^workout_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(e in query, where: e.business_id == ^business_id)

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__), do: from(e in query, order_by: [asc: e.position])

  @spec with_exercise(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def with_exercise(query, business_id) do
    exercise_query = Exercise |> Exercise.owned_or_system(business_id)
    from(e in query, preload: [exercise: ^exercise_query])
  end
end
