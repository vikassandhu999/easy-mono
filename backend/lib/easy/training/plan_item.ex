defmodule Easy.Training.PlanItem do
  use Ecto.Schema
  alias Easy.Orgs
  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @days ~w(monday tuesday wednesday thursday friday saturday sunday)

  @spec days() :: [String.t()]
  def days, do: @days

  schema "training_schedule_entries" do
    field :day_of_week, :string

    belongs_to :business, Orgs.Business
    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :plan, Easy.Training.TrainingPlan, foreign_key: :training_plan_id
    belongs_to :workout, Easy.Training.Workout, foreign_key: :training_workout_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(plan_id, business_id, creator_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:day_of_week, :training_workout_id])
    |> put_change(:training_plan_id, plan_id)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, creator_id)
    |> validate_required([:day_of_week, :training_workout_id, :training_plan_id, :business_id])
    |> validate_inclusion(:day_of_week, @days)
    |> unique_constraint([:training_plan_id, :day_of_week],
      name: :training_schedule_entries_training_plan_id_day_of_week_index)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(entry, attrs) do
    entry
    |> cast(attrs, [:day_of_week, :training_workout_id])
    |> validate_inclusion(:day_of_week, @days)
    |> unique_constraint([:training_plan_id, :day_of_week],
      name: :training_schedule_entries_training_plan_id_day_of_week_index)
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id),
    do: from(p in query, where: p.training_plan_id == ^plan_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(p in query, where: p.business_id == ^business_id)

  @spec for_day(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_day(query \\ __MODULE__, day),
    do: from(p in query, where: p.day_of_week == ^day)

  @spec with_workout(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def with_workout(query, business_id) do
    workout_query =
      Easy.Training.Workout
      |> Easy.Training.Workout.for_business(business_id)
      |> Easy.Training.Workout.with_elements(business_id)

    from(p in query, preload: [workout: ^workout_query])
  end
end
