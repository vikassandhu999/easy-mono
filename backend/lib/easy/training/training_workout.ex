defmodule Easy.Training.TrainingWorkout do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.Training.{PrescribedExercise, WorkoutSchedule}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "training_workouts" do
    field :name, :string
    field :position, :integer
    field :weekdays, {:array, :string}, virtual: true, default: []

    belongs_to :business, Orgs.Business
    belongs_to :plan, Easy.Training.TrainingPlan, foreign_key: :training_plan_id

    has_many :prescribed_exercises, PrescribedExercise, foreign_key: :training_workout_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, plan_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :position])
    |> put_change(:business_id, business_id)
    |> put_change(:training_plan_id, plan_id)
    |> validate_fields()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(workout, attrs) do
    workout
    |> cast(attrs, [:name, :position])
    |> validate_fields()
  end

  defp validate_fields(changeset) do
    changeset
    |> update_change(:name, &Easy.Utils.trim/1)
    |> validate_required([:name, :position, :training_plan_id, :business_id])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> check_constraint(:position, name: :training_workouts_position_check)
    |> unique_constraint(:position, name: :training_workouts_training_plan_id_position_index)
    |> foreign_key_constraint(:training_plan_id,
      name: :training_workouts_plan_business_id_fkey
    )
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id),
    do: from(workout in query, where: workout.training_plan_id == ^plan_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(workout in query, where: workout.business_id == ^business_id)

  @spec for_weekday(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def for_weekday(query \\ __MODULE__, weekday)
  def for_weekday(query, nil), do: query
  def for_weekday(query, ""), do: query

  def for_weekday(query, weekday) do
    from(workout in query,
      join: schedule in WorkoutSchedule,
      on: schedule.training_workout_id == workout.id,
      where: schedule.weekday == ^weekday
    )
  end

  @spec by_position(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_position(query \\ __MODULE__),
    do: from(workout in query, order_by: [asc: workout.position, asc: workout.id])

  @spec include_prescribed_exercises(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_prescribed_exercises(query, business_id) do
    prescribed_query =
      PrescribedExercise
      |> PrescribedExercise.for_business(business_id)
      |> PrescribedExercise.by_position()
      |> PrescribedExercise.include_exercise(business_id)

    from(workout in query, preload: [prescribed_exercises: ^prescribed_query])
  end
end
