defmodule Easy.Training.TrainingWorkout do
  use Ecto.Schema
  alias Easy.Orgs
  alias Easy.Training.TrainingWorkoutExercise
  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @days [:monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday]
  @day_names Enum.map(@days, &Atom.to_string/1)

  @spec days() :: [atom()]
  def days, do: @days

  @spec day_names() :: [String.t()]
  def day_names, do: @day_names

  schema "training_workouts" do
    field :name, :string
    field :weekdays, {:array, :string}, default: []

    belongs_to :business, Orgs.Business
    belongs_to :plan, Easy.Training.TrainingPlan, foreign_key: :training_plan_id
    has_many :workout_elements, Easy.Training.TrainingWorkoutExercise, foreign_key: :training_workout_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t() | nil, map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, plan_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :weekdays])
    |> put_change(:business_id, business_id)
    |> put_change(:training_plan_id, plan_id)
    |> validate_required([:name, :training_plan_id, :business_id])
    |> validate_subset(:weekdays, @day_names)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(workout, attrs), do: cast(workout, attrs, [:name])

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id),
    do: from(w in query, where: w.training_plan_id == ^plan_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(w in query, where: w.business_id == ^business_id)

  @spec for_weekday(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def for_weekday(query \\ __MODULE__, weekday)
  def for_weekday(query, nil), do: query
  def for_weekday(query, ""), do: query
  def for_weekday(query, weekday), do: from(w in query, where: ^weekday in w.weekdays)

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
