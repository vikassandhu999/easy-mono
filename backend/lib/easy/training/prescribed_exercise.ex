defmodule Easy.Training.PrescribedExercise do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.Training.{PlannedSet, TrainingExercise, TrainingWorkout}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "training_prescribed_exercises" do
    field :position, :integer

    embeds_many :prescribed_sets, PlannedSet, on_replace: :delete

    belongs_to :business, Orgs.Business
    belongs_to :workout, TrainingWorkout, foreign_key: :training_workout_id
    belongs_to :exercise, TrainingExercise

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, workout_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:position, :exercise_id])
    |> put_change(:business_id, business_id)
    |> put_change(:training_workout_id, workout_id)
    |> validate_fields()
    |> cast_embed(:prescribed_sets, with: &PlannedSet.changeset/2)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(prescribed_exercise, attrs) do
    prescribed_exercise
    |> cast(attrs, [:position, :exercise_id])
    |> validate_fields()
    |> cast_embed(:prescribed_sets, with: &PlannedSet.changeset/2)
  end

  defp validate_fields(changeset) do
    changeset
    |> validate_required([:position, :exercise_id, :training_workout_id, :business_id])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> check_constraint(:position, name: :training_prescribed_exercises_position_check)
    |> unique_constraint(:position,
      name: :training_prescribed_exercises_position_index
    )
    |> foreign_key_constraint(:training_workout_id,
      name: :training_prescribed_exercises_workout_business_id_fkey
    )
    |> foreign_key_constraint(:exercise_id)
  end

  @spec for_workout(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_workout(query \\ __MODULE__, workout_id),
    do: from(item in query, where: item.training_workout_id == ^workout_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(item in query, where: item.business_id == ^business_id)

  @spec by_position(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_position(query \\ __MODULE__),
    do: from(item in query, order_by: [asc: item.position, asc: item.id])

  @spec include_exercise(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_exercise(query, business_id) do
    exercise_query = TrainingExercise.for_business_or_system(TrainingExercise, business_id)
    from(item in query, preload: [exercise: ^exercise_query])
  end
end
