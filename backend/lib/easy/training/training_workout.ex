defmodule Easy.Training.TrainingWorkout do
  use Ecto.Schema
  alias Easy.Orgs
  alias Easy.Training.TrainingWorkoutExercise
  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "training_workouts" do
    field :name, :string
    field :notes, :string

    belongs_to :business, Orgs.Business
    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :plan, Easy.Training.TrainingPlan, foreign_key: :training_plan_id
    has_many :workout_elements, Easy.Training.TrainingWorkoutExercise, foreign_key: :training_workout_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t() | nil, map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, creator_id, plan_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :notes])
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, creator_id)
    |> put_change(:training_plan_id, plan_id)
    |> validate_required([:name, :training_plan_id, :business_id])
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(workout, attrs), do: cast(workout, attrs, [:name, :notes])

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id),
    do: from(w in query, where: w.training_plan_id == ^plan_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(w in query, where: w.business_id == ^business_id)

  @spec oldest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def oldest(query \\ __MODULE__), do: from(w in query, order_by: [asc: w.inserted_at, asc: w.id])

  @spec include_exercises(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_exercises(query, business_id) do
    element_query =
      TrainingWorkoutExercise
      |> TrainingWorkoutExercise.for_business(business_id)
      |> TrainingWorkoutExercise.by_position()
      |> TrainingWorkoutExercise.include_exercise(business_id)

    from(w in query, preload: [workout_elements: ^element_query])
  end
end
